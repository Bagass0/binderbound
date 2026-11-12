import { fileURLToPath } from 'node:url';
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
const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));
const TABLES = [
  'notifications',
  'trade_items',
  'trades',
  'double_cards',
  'friendships',
  'owned_cards',
  'binders',
  'sessions',
  'users',
  'schema_migrations',
];

// Faux vérificateur Google : le « jeton » est le profil encodé en JSON.
const fakeGoogle = async (credential) => {
  if (!credential.startsWith('{'))
    throw new HttpError(401, 'GOOGLE_INVALID', 'Jeton Google invalide');
  return { emailVerified: true, picture: null, ...JSON.parse(credential) };
};

describe.skipIf(!url)('comptes (MySQL)', () => {
  let db;
  let app;
  let accounts;

  beforeAll(async () => {
    db = await connect(url, { retries: 1 });
    for (const table of TABLES) await db.query(`DROP TABLE IF EXISTS ${table}`);
    await migrate(db, { log: () => {} });
    const repo = createSetRepository(await loadSets(FIXTURES));
    accounts = createAccounts(db, { googleClientId: 'test-client', verifyGoogle: fakeGoogle });
    app = createApp(repo, { accounts });
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

    it('exporte toutes les données du compte (RGPD)', async () => {
      await agent.put('/api/collection/sample/cards/SMP-002').expect(204);
      await agent
        .post('/api/binders')
        .send({ name: 'Export', params: { setId: 'sample' } })
        .expect(201);
      const res = await agent.get('/api/auth/me/export').expect(200);
      expect(res.headers['content-disposition']).toContain('binderbound-mes-donnees.json');
      expect(res.body).toMatchObject({
        account: { email: 'ezreal@piltover.gg', name: 'Ezreal', googleId: null },
        binders: [{ name: 'Export', setId: 'sample' }],
        collection: { sample: ['SMP-002'] },
      });
      expect(JSON.stringify(res.body)).not.toContain('scrypt');
      await request(app).get('/api/auth/me/export').expect(401);
    });

    it('supprime le compte et toutes ses données (RGPD)', async () => {
      await agent.put('/api/collection/sample/cards/SMP-001').expect(204);
      await agent
        .post('/api/binders')
        .send({ name: 'Adieu', params: { setId: 'sample' } })
        .expect(201);
      const res = await agent.delete('/api/auth/me').expect(204);
      expect(res.headers['set-cookie'][0]).toMatch(/bb_session=;/);

      expect((await agent.get('/api/auth/me')).body.user).toBeNull();
      for (const table of ['users', 'sessions', 'binders', 'owned_cards']) {
        const [[row]] = await db.query(`SELECT COUNT(*) AS n FROM ${table}`);
        expect(row.n, table).toBe(0);
      }
      await request(app).delete('/api/auth/me').expect(401);
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
      expect(body.progress).toMatchObject({ owned: 2, total: 42 });
      // Détail par rareté : les totaux s'additionnent, et les cartes possédées y sont réparties.
      const rarities = Object.values(body.progress.byRarity);
      expect(rarities.reduce((n, r) => n + r.total, 0)).toBe(42);
      expect(rarities.reduce((n, r) => n + r.owned, 0)).toBe(2);

      const all = await agent.get('/api/collection').expect(200);
      expect(all.body).toEqual({ sets: { sample: ['SMP-001', 'SMP-002'] }, doubles: {} });
    });
  });

  describe('amis et échanges', () => {
    let ezreal;
    let ezrealId;
    let jinx;
    let jinxId;

    // Comptes créés directement (pas par /register : sa limite par IP vaut pour toute la suite).
    const signUp = async (name) => {
      const user = await accounts.users.create({ email: `${name}@runeterra.gg`, name });
      const cookie = `bb_session=${await accounts.sessions.create(user.id)}`;
      const as = (method) => (url) => request(app)[method](url).set('Cookie', cookie);
      return [{ get: as('get'), post: as('post'), put: as('put'), delete: as('delete') }, user.id];
    };
    const codeOf = async (agent) => (await agent.get('/api/friends').expect(200)).body.code;
    const befriend = async () => {
      const code = await codeOf(jinx);
      await ezreal.post('/api/friends').send({ code }).expect(201);
      await jinx.post(`/api/friends/${ezrealId}/accept`).expect(204);
    };
    const owned = async (agent) => (await agent.get('/api/collection/sample').expect(200)).body;

    beforeEach(async () => {
      [ezreal, ezrealId] = await signUp('ezreal');
      [jinx, jinxId] = await signUp('jinx');
    });

    it('ajoute un ami par son code, sans exposer son e-mail', async () => {
      const code = await codeOf(jinx);
      expect(code).toMatch(/^[A-Z2-9]{8}$/);
      expect(await codeOf(jinx)).toBe(code); // stable

      await ezreal.post('/api/friends').send({ code: 'ZZZZZZZZ' }).expect(404);
      await ezreal
        .post('/api/friends')
        .send({ code: await codeOf(ezreal) })
        .expect(400);
      const res = await ezreal
        .post('/api/friends')
        .send({ code: `${code.slice(0, 4)}-${code.slice(4).toLowerCase()}` })
        .expect(201);
      expect(res.body).toEqual({
        status: 'requested',
        user: { id: jinxId, name: 'jinx', avatarUrl: null },
      });

      const notified = (await jinx.get('/api/notifications')).body;
      expect(notified.unread).toBe(1);
      expect(notified.notifications).toMatchObject([
        { type: 'friend_request', actor: { name: 'ezreal' }, pending: true, read: false },
      ]);
      const lists = (await jinx.get('/api/friends')).body;
      expect(lists.incoming.map((f) => f.name)).toEqual(['ezreal']);
      expect(JSON.stringify(lists)).not.toContain('@');

      // Une demande en sens inverse conclut l'amitié.
      const back = await jinx
        .post('/api/friends')
        .send({ code: await codeOf(ezreal) })
        .expect(200);
      expect(back.body.status).toBe('accepted');
      expect((await ezreal.get('/api/friends')).body.friends.map((f) => f.name)).toEqual(['jinx']);
    });

    it('ne montre la collection qu’aux amis', async () => {
      await jinx.put('/api/collection/sample/doubles/SMP-003').expect(204);
      await ezreal.get(`/api/friends/${jinxId}/collection/sample`).expect(404);
      await befriend();
      const { body } = await ezreal.get(`/api/friends/${jinxId}/collection/sample`).expect(200);
      // Un double est forcément possédé.
      expect(body).toEqual({ cardIds: ['SMP-003'], doubleIds: ['SMP-003'] });
    });

    it('échange des doubles : chacun garde son exemplaire, l’autre gagne la carte', async () => {
      await befriend();
      await ezreal.put('/api/collection/sample/doubles/SMP-001').expect(204);
      await jinx.put('/api/collection/sample/doubles/SMP-002').expect(204);
      await ezreal.put('/api/collection/sample/cards/SMP-002').expect(204); // il l'a déjà

      const propose = (body) =>
        ezreal.post('/api/trades').send({ friendId: jinxId, setId: 'sample', ...body });
      await propose({ give: ['SMP-004'], receive: [] }).expect(409); // pas un double
      await propose({ give: [], receive: [] }).expect(400);
      await propose({ give: ['SMP-001'], receive: ['SMP-001'] }).expect(400);
      const { body } = await propose({
        give: ['SMP-001'],
        receive: ['SMP-002'],
        message: 'Deal ?',
      }).expect(201);

      // La demande d'ami (acceptée, elle reste affichée) et la proposition.
      expect((await jinx.get('/api/notifications/count')).body.unread).toBe(2);
      const [trade] = (await jinx.get('/api/trades')).body.trades;
      expect(trade).toMatchObject({
        id: body.id,
        status: 'pending',
        message: 'Deal ?',
        proposer: { name: 'ezreal' },
        give: [{ cardId: 'SMP-001', available: true }],
        receive: [{ cardId: 'SMP-002', available: true }],
      });

      await ezreal.post(`/api/trades/${body.id}/accept`).expect(404); // seul le destinataire
      await jinx.post(`/api/trades/${body.id}/accept`).expect(204);
      await jinx.post(`/api/trades/${body.id}/accept`).expect(409);

      expect(await owned(ezreal)).toEqual({
        cardIds: ['SMP-001', 'SMP-002'],
        doubleIds: ['SMP-002'],
      });
      expect(await owned(jinx)).toEqual({ cardIds: ['SMP-001', 'SMP-002'], doubleIds: [] });

      // Ezreal est prévenu de l'acceptation (et de l'amitié conclue plus tôt).
      const { notifications } = (await ezreal.get('/api/notifications')).body;
      expect(notifications.map((n) => n.type)).toEqual(['trade_accepted', 'friend_accepted']);
      expect(notifications[0].trade).toEqual({ id: body.id, setId: 'sample' });
      await ezreal.post('/api/notifications/read').expect(204);
      expect((await ezreal.get('/api/notifications/count')).body.unread).toBe(0);
    });

    it('refuse un échange devenu impossible, et gère refus et annulation', async () => {
      await befriend();
      await ezreal.put('/api/collection/sample/doubles/SMP-001').expect(204);
      const propose = () =>
        ezreal
          .post('/api/trades')
          .send({ friendId: jinxId, setId: 'sample', give: ['SMP-001'], receive: [] })
          .expect(201)
          .then((r) => r.body.id);

      const first = await propose();
      const second = await propose();
      await jinx.post(`/api/trades/${second}/decline`).expect(204);
      await ezreal.post(`/api/trades/${second}/cancel`).expect(404); // déjà clos

      // Le double disparaît (carte retirée) : l'échange n'est plus réalisable.
      await ezreal.delete('/api/collection/sample/cards/SMP-001').expect(204);
      expect((await jinx.get('/api/trades')).body.trades[0].give[0].available).toBe(false);
      await jinx.post(`/api/trades/${first}/accept`).expect(409);
      await ezreal.post(`/api/trades/${first}/cancel`).expect(204);

      const statuses = (await ezreal.get('/api/trades')).body.trades.map((t) => t.status);
      expect(statuses.sort()).toEqual(['cancelled', 'declined']);
    });

    it('retirer un ami annule les échanges en attente', async () => {
      await befriend();
      await ezreal.put('/api/collection/sample/doubles/SMP-001').expect(204);
      await ezreal
        .post('/api/trades')
        .send({ friendId: jinxId, setId: 'sample', give: ['SMP-001'], receive: [] })
        .expect(201);
      await ezreal.delete(`/api/friends/${jinxId}`).expect(204);
      expect((await jinx.get('/api/trades')).body.trades[0].status).toBe('cancelled');
      expect((await jinx.get('/api/friends')).body.friends).toEqual([]);
    });
    it('liste les joueurs par ordre alphabétique et permet de les ajouter sans code', async () => {
      const [ahri, ahriId] = await signUp('ahri');
      const { body } = await ezreal.get('/api/friends/directory').expect(200);
      // Sans soi-même, avec le lien de chacun, et jamais l'e-mail.
      expect(body).toEqual({
        users: [
          { id: ahriId, name: 'ahri', avatarUrl: null, relation: null },
          { id: jinxId, name: 'jinx', avatarUrl: null, relation: null },
        ],
        more: false,
      });
      expect(
        (await ezreal.get('/api/friends/directory?q=JI')).body.users.map((u) => u.name),
      ).toEqual(['jinx']);
      expect((await ezreal.get('/api/friends/directory?q=%25')).body.users).toEqual([]);

      const res = await ezreal.post(`/api/friends/users/${jinxId}`).expect(201);
      expect(res.body.status).toBe('requested');
      const after = (await ezreal.get('/api/friends/directory')).body.users;
      expect(after.find((u) => u.id === jinxId).relation).toBe('outgoing');
      expect(
        (await jinx.get('/api/friends/directory')).body.users.find((u) => u.name === 'ezreal')
          .relation,
      ).toBe('incoming');

      // Un joueur qui se retire de la liste n'y apparaît plus et ne peut plus être ajouté ainsi.
      await ahri.put('/api/friends/settings').send({ discoverable: false }).expect(204);
      expect((await ahri.get('/api/friends')).body.discoverable).toBe(false);
      expect((await ezreal.get('/api/friends/directory')).body.users.map((u) => u.name)).toEqual([
        'jinx',
      ]);
      await ezreal.post(`/api/friends/users/${ahriId}`).expect(404);
      await ezreal.post(`/api/friends/users/${ezrealId}`).expect(400);
    });

    it('notifie les refus et annulations, et oublie une demande d’ami retirée', async () => {
      await ezreal.post(`/api/friends/users/${jinxId}`).expect(201);
      await ezreal.delete(`/api/friends/${jinxId}`).expect(204);
      expect((await jinx.get('/api/notifications')).body).toEqual({ notifications: [], unread: 0 });

      await befriend();
      await ezreal.put('/api/collection/sample/doubles/SMP-001').expect(204);
      const propose = () =>
        ezreal
          .post('/api/trades')
          .send({ friendId: jinxId, setId: 'sample', give: ['SMP-001'], receive: [] })
          .then((r) => r.body.id);
      await jinx.post(`/api/trades/${await propose()}/decline`).expect(204);
      await ezreal.post(`/api/trades/${await propose()}/cancel`).expect(204);
      const types = async (agent) =>
        (await agent.get('/api/notifications')).body.notifications.map((n) => n.type);
      expect(await types(ezreal)).toEqual(['trade_declined', 'friend_accepted']);
      expect(await types(jinx)).toEqual([
        'trade_cancelled',
        'trade_received',
        'trade_received',
        'friend_request',
      ]);
    });
  });
});
