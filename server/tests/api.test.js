import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createSetRepository, loadSets } from '../src/services/setRepository.js';

let app;
beforeAll(async () => {
  app = createApp(createSetRepository(await loadSets()));
});

describe('GET /api/config', () => {
  it('expose les listes de référence', async () => {
    const res = await request(app).get('/api/config').expect(200);
    expect(res.body.variantTypes).not.toContain('base');
    expect(res.body.binderPresets.map((p) => p.id)).toEqual(['2x2', '3x3', '4x3']);
  });
});

describe('GET /api/sets', () => {
  it('liste les sets avec leurs compteurs, sans les cartes', async () => {
    const res = await request(app).get('/api/sets').expect(200);
    const sample = res.body.find((s) => s.id === 'sample');
    expect(sample).toMatchObject({ code: 'SMP', counts: { base: 34, variants: 8, total: 42 } });
    expect(sample.cards).toBeUndefined();
  });
});

describe('GET /api/sets/:id', () => {
  it('renvoie le set complet', async () => {
    const res = await request(app).get('/api/sets/sample').expect(200);
    expect(res.body.cards).toHaveLength(42);
  });

  it('404 pour un set inconnu', async () => {
    const res = await request(app).get('/api/sets/nope').expect(404);
    expect(res.body.error.code).toBe('SET_NOT_FOUND');
  });
});

describe('POST /api/layout', () => {
  it('calcule un placement avec les valeurs par défaut', async () => {
    const res = await request(app).post('/api/layout').send({ setId: 'sample' }).expect(200);
    expect(res.body.summary).toMatchObject({ totalCards: 42, slotsPerFace: 9, facesUsed: 5 });
    expect(res.body.index['SMP-001']).toEqual({
      faceIndex: 0,
      sheet: 1,
      side: 'recto',
      row: 1,
      col: 1,
    });
    expect(res.body.faces[0]).toHaveProperty('slots');
  });

  it('400 avec le détail des champs invalides', async () => {
    const res = await request(app)
      .post('/api/layout')
      .send({ setId: 'sample', rows: 0, sortBy: 'nom' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.path)).toEqual(
      expect.arrayContaining(['rows', 'sortBy']),
    );
  });

  it('400 sur JSON malformé', async () => {
    const res = await request(app)
      .post('/api/layout')
      .set('Content-Type', 'application/json')
      .send('{oops')
      .expect(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('404 si le set n’existe pas', async () => {
    await request(app).post('/api/layout').send({ setId: 'nope' }).expect(404);
  });
});

it('404 JSON pour une route API inconnue', async () => {
  const res = await request(app).get('/api/rien').expect(404);
  expect(res.body.error.code).toBe('NOT_FOUND');
});

describe('mode production (client statique)', () => {
  it('sert index.html pour les routes du SPA, sans masquer les 404 API', async () => {
    const { mkdtemp, writeFile } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const path = await import('node:path');
    const dir = await mkdtemp(path.join(tmpdir(), 'bb-static-'));
    await writeFile(path.join(dir, 'index.html'), '<div id="root"></div>');
    const prodApp = createApp(createSetRepository(await loadSets()), { staticDir: dir });

    const page = await request(prodApp).get('/result?set=sample').expect(200);
    expect(page.text).toContain('id="root"');
    await request(prodApp).get('/api/rien').expect(404);
  });
});
