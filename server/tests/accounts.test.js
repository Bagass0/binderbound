import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connect } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { createAccounts } from '../src/services/accounts.js';
import { createSetRepository, loadSets } from '../src/services/setRepository.js';
import { HttpError } from '../src/middleware/errorHandler.js';

/**
 * Tests d'intégration contre un vrai MySQL : `npm run db:up` puis `npm run test:db`.
 * Ignorés sans TEST_DATABASE_URL. La base de test est entièrement vidée.
 */
const url = process.env.TEST_DATABASE_URL;
const FIXTURES = new URL('./fixtures', import.meta.url).pathname;
const TABLES = ['owned_cards', 'binders', 'sessions', 'users', 'schema_migrations'];

// Faux vérificateur Google : le « jeton » est le profil encodé en JSON.
const fakeGoogle = async (credential) => {
  if (!credential.startsWith('{'))
    throw new HttpError(401, 'GOOGLE_INVALID', 'Jeton Google invalide');
  return { emailVerified: true, picture: null, ...JSON.parse(credential) };
};

describe.skipIf(!url)('comptes (MySQL)', () => {
  let db;
  let app;

  beforeAll(async () => {
    db = await connect(url, { retries: 1 });
    for (const table of TABLES) await db.query(`DROP TABLE IF EXISTS ${table}`);
    await migrate(db, { log: () => {} });
    const repo = createSetRepository(await loadSets(FIXTURES));
    app = createApp(repo, {
      accounts: createAccounts(db, { googleClientId: 'test-client', verifyGoogle: fakeGoogle }),
    });
  });

  beforeEach(async () => {
    await db.query('DELETE FROM users'); // cascade : sessions, classeurs, collections
  });

  afterAll(() => db?.end());

  const register = (agent, body = {}) =>
    agent
      .post('/api/auth/register')
      .send({ email: 'Ezreal@Piltover.gg', name: 'Ezreal', password: 'arcane-shift', ...body });

  describe('inscription et connexion', () => {
    it('expose la config des comptes', async () => {
      const res = await request(app).get('/api/config').expect(200);
      expect(res.body.accounts).toEqual({ enabled: true, googleClientId: 'test-client' });
    });

    it('crée un compte, ouvre une session httpOnly et ne renvoie pas le hash', async () => {
      const agent = request.agent(app);
      const res = await register(agent).expect(201);
      expect(res.body.user).toMatchObject({
        email: 'ezreal@piltover.gg',
        name: 'Ezreal',
        hasPassword: true,
        hasGoogle: false,
      });
      expect(JSON.stringify(res.body)).not.toContain('scrypt');
      expect(res.headers['set-cookie'][0]).toMatch(/bb_session=.+HttpOnly; SameSite=Lax/);

      const me = await agent.get('/api/auth/me').expect(200);
      expect(me.body.user.email).toBe('ezreal@piltover.gg');
    });

    it('refuse un e-mail déjà pris et un mot de passe trop court', async () => {
      await register(request(app)).expect(201);
      const taken = await register(request(app), { email: 'ezreal@piltover.gg' }).expect(409);
      expect(taken.body.error.code).toBe('EMAIL_TAKEN');
      const short = await register(request(app), { email: 'jinx@zaun.gg', password: '123' });
      expect(short.status).toBe(400);
      expect(short.body.error.details[0].path).toBe('password');
    });

    it('connecte avec le bon mot de passe uniquement', async () => {
      await register(request(app)).expect(201);
      const bad = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ezreal@piltover.gg', password: 'wrong-pass' })
        .expect(401);
      expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');
      const unknown = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@piltover.gg', password: 'wrong-pass' })
        .expect(401);
      expect(unknown.body.error.code).toBe('INVALID_CREDENTIALS');

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'EZREAL@piltover.gg', password: 'arcane-shift' })
        .expect(200);
      expect((await agent.get('/api/auth/me')).body.user.name).toBe('Ezreal');
    });

    it('déconnecte et invalide la session côté serveur', async () => {
      const agent = request.agent(app);
      const res = await register(agent).expect(201);
      const cookie = res.headers['set-cookie'][0].split(';')[0];
      await agent.post('/api/auth/logout').expect(204);
      // Même en renvoyant l'ancien cookie, la session n'existe plus.
      const me = await request(app).get('/api/auth/me').set('Cookie', cookie).expect(200);
      expect(me.body.user).toBeNull();
    });

    it('refuse une requête venant d’une autre origine', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Origin', 'https://evil.example')
        .send({ email: 'jinx@zaun.gg', name: 'Jinx', password: 'get-excited' })
        .expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ORIGIN');
    });
  });

  describe('Google', () => {
    const google = (agent, profile) =>
      agent.post('/api/auth/google').send({ credential: JSON.stringify(profile) });

    it('crée un compte au premier passage, puis reconnecte le même', async () => {
      const profile = { sub: 'g-1', email: 'Lux@Demacia.gg', name: 'Lux' };
      const first = await google(request(app), profile).expect(201);
      expect(first.body.user).toMatchObject({
        email: 'lux@demacia.gg',
        hasGoogle: true,
        hasPassword: false,
      });
      const again = await google(request(app), profile).expect(200);
      expect(again.body.user.id).toBe(first.body.user.id);
    });

    it('rattache Google à un compte existant au même e-mail vérifié', async () => {
      const created = await register(request(app)).expect(201);
      const res = await google(request(app), {
        sub: 'g-2',
        email: 'ezreal@piltover.gg',
        name: 'Ez',
      }).expect(200);
      expect(res.body.user).toMatchObject({
        id: created.body.user.id,
        hasGoogle: true,
        hasPassword: true,
      });
    });

    it('ne rattache pas un e-mail non vérifié', async () => {
      await register(request(app)).expect(201);
      await google(request(app), {
        sub: 'g-3',
        email: 'ezreal@piltover.gg',
        name: 'Ez',
        emailVerified: false,
      }).expect(409);
    });

    it('un compte Google sans mot de passe ne se connecte pas par mot de passe', async () => {
      await google(request(app), { sub: 'g-4', email: 'garen@demacia.gg', name: 'Garen' }).expect(
        201,
      );
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'garen@demacia.gg', password: 'anything' })
        .expect(401);
    });

    it('rejette un jeton invalide', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: 'forged' })
        .expect(401);
      expect(res.body.error.code).toBe('GOOGLE_INVALID');
    });
  });

  describe('classeurs et collection', () => {
    let agent;
    beforeEach(async () => {
      agent = request.agent(app);
      await register(agent).expect(201);
    });

    it('exige une session', async () => {
      const res = await request(app).get('/api/binders').expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      await request(app).get('/api/collection/sample').expect(401);
    });

    it('crée, liste, modifie et supprime un classeur', async () => {
      const created = await agent
        .post('/api/binders')
        .send({ name: 'Mon set', params: { setId: 'sample', rows: 4, cols: 3 } })
        .expect(201);
      expect(created.body).toMatchObject({
        name: 'Mon set',
        setId: 'sample',
        params: { setId: 'sample', rows: 4, cols: 3, doubleSided: true, includedVariants: null },
        progress: { owned: 0, total: 42 },
      });

      const { id } = created.body;
      const patched = await agent
        .patch(`/api/binders/${id}`)
        .send({ name: 'Renommé', params: { setId: 'sample', includedVariants: [] } })
        .expect(200);
      expect(patched.body).toMatchObject({ name: 'Renommé', progress: { total: 34 } });

      const list = await agent.get('/api/binders').expect(200);
      expect(list.body.map((b) => b.name)).toEqual(['Renommé']);

      await agent.delete(`/api/binders/${id}`).expect(204);
      await agent.get(`/api/binders/${id}`).expect(404);
    });

    it('valide les réglages et le set', async () => {
      const bad = await agent
        .post('/api/binders')
        .send({ name: 'X', params: { setId: 'sample', rows: 12 } })
        .expect(400);
      expect(bad.body.error.details[0].path).toBe('params.rows');
      const unknown = await agent
        .post('/api/binders')
        .send({ name: 'X', params: { setId: 'nope' } })
        .expect(404);
      expect(unknown.body.error.code).toBe('SET_NOT_FOUND');
    });

    it('isole les classeurs de chaque utilisateur', async () => {
      const { body } = await agent
        .post('/api/binders')
        .send({ name: 'Privé', params: { setId: 'sample' } })
        .expect(201);
      const other = request.agent(app);
      await register(other, { email: 'jinx@zaun.gg' }).expect(201);
      await other.get(`/api/binders/${body.id}`).expect(404);
      await other.delete(`/api/binders/${body.id}`).expect(404);
      expect((await other.get('/api/binders')).body).toEqual([]);
    });

    it('coche, décoche et remplace les cartes possédées', async () => {
      await agent.put('/api/collection/sample/cards/SMP-001').expect(204);
      await agent.put('/api/collection/sample/cards/SMP-002').expect(204);
      await agent.put('/api/collection/sample/cards/SMP-002').expect(204); // idempotent
      await agent.delete('/api/collection/sample/cards/SMP-001').expect(204);
      expect((await agent.get('/api/collection/sample')).body.cardIds).toEqual(['SMP-002']);

      await agent
        .put('/api/collection/sample')
        .send({ cardIds: ['SMP-003', 'SMP-004'] })
        .expect(204);
      expect((await agent.get('/api/collection/sample')).body.cardIds).toEqual([
        'SMP-003',
        'SMP-004',
      ]);

      await agent.put('/api/collection/sample/cards/NOPE').expect(404);
      await agent
        .put('/api/collection/sample')
        .send({ cardIds: ['NOPE'] })
        .expect(400);
    });

    it('importe la collection locale et l’intègre à l’avancement des classeurs', async () => {
      await agent.put('/api/collection/sample/cards/SMP-001').expect(204);
      const res = await agent
        .post('/api/collection/import')
        .send({ sets: { sample: ['SMP-001', 'SMP-002', 'NOPE'], unknown: ['X'] } })
        .expect(200);
      expect(res.body.imported).toBe(2);

      const { body } = await agent
        .post('/api/binders')
        .send({ name: 'Avancement', params: { setId: 'sample' } })
        .expect(201);
      expect(body.progress).toEqual({ owned: 2, total: 42 });
    });
  });
});
