import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createSetRepository } from '../src/services/setRepository.js';
import { createPriceService } from '../src/services/prices.js';
import { GRID, mosaic } from '../src/import/fingerprint.js';

/** Faux tcgcsv : deux groupes, une carte en Normal + Foil, une autre en Foil seulement. */
function fakeFetch({ fail = false } = {}) {
  const routes = {
    '/groups': { results: [{ groupId: 1 }, { groupId: 2 }] },
    '/1/prices': {
      results: [
        { productId: 100, subTypeName: 'Normal', marketPrice: 0.25, midPrice: 0.3 },
        { productId: 100, subTypeName: 'Foil', marketPrice: null, midPrice: 1.5 },
      ],
    },
    '/2/prices': { results: [{ productId: 200, subTypeName: 'Foil', marketPrice: 42 }] },
  };
  return vi.fn(async (url) => {
    if (fail) return { ok: false, status: 500 };
    if (url.endsWith('last-updated.txt'))
      return { ok: true, text: async () => '2026-11-07T20:05:27+0000' };
    const path = url.replace('https://tcgcsv.com/tcgplayer/89', '');
    return { ok: true, json: async () => routes[path] };
  });
}

const cards = [
  { id: 'A', tcgplayerId: '100' },
  { id: 'B', tcgplayerId: '200' },
  { id: 'C', tcgplayerId: null },
];

describe('service de prix', () => {
  it('associe chaque carte à son prix normal et foil', async () => {
    const service = createPriceService({ fetch: fakeFetch() });
    const result = await service.forCards(cards);
    expect(result.currency).toBe('USD');
    expect(result.updatedAt).toBe('2026-11-07T20:05:27+0000');
    expect(result.prices).toEqual({ A: { normal: 0.25, foil: 1.5 }, B: { foil: 42 } });
  });

  it('garde les prix en cache, et les derniers connus si la source tombe', async () => {
    let time = 0;
    const fetch = fakeFetch();
    const service = createPriceService({ fetch, ttl: 1000, now: () => time });
    await service.forCards(cards);
    const calls = fetch.mock.calls.length;
    await service.forCards(cards);
    expect(fetch.mock.calls.length).toBe(calls);

    time = 5000;
    fetch.mockImplementation(async () => ({ ok: false, status: 500 }));
    expect((await service.forCards(cards)).prices.B).toEqual({ foil: 42 });
  });
});

describe('GET /api/sets/:id/prices et /fingerprints', () => {
  const set = { id: 'tst', code: 'TST', releaseDate: '2025-01-01', cards };
  const repo = createSetRepository(new Map([['tst', set]]));

  it('renvoie les prix du set', async () => {
    const app = createApp(repo, { prices: createPriceService({ fetch: fakeFetch() }) });
    const res = await request(app).get('/api/sets/tst/prices').expect(200);
    expect(res.body.prices.A).toEqual({ normal: 0.25, foil: 1.5 });
  });

  it('répond 503 si la source est indisponible, 404 sans service', async () => {
    const app = createApp(repo, {
      prices: createPriceService({ fetch: fakeFetch({ fail: true }) }),
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await request(app).get('/api/sets/tst/prices').expect(503);
    await request(createApp(repo)).get('/api/sets/tst/prices').expect(404);
  });

  it('sert les empreintes du scan, 404 pour un set sans empreintes', async () => {
    const fingerprints = { get: async (id) => (id === 'tst' ? { A: 'AAAA' } : null) };
    const app = createApp(repo, { fingerprints });
    const { body } = await request(app).get('/api/sets/tst/fingerprints').expect(200);
    expect(body).toMatchObject({ grid: GRID, cards: { A: 'AAAA' } });
    expect(body.artZone.portrait).toHaveLength(4);
    await request(createApp(repo)).get('/api/sets/tst/fingerprints').expect(404);
  });
});

describe('empreinte', () => {
  it('moyenne chaque bloc de la vignette', () => {
    const size = GRID * 2;
    const pixels = Array.from({ length: size * size }, (_, i) => {
      const x = i % size;
      return x < size / 2 ? [0, 0, 0] : [200, 100, 50];
    });
    const out = mosaic(pixels, size);
    expect(out).toHaveLength(GRID * GRID * 3);
    expect([...out.slice(0, 3)]).toEqual([0, 0, 0]);
    expect([...out.slice((GRID - 1) * 3, GRID * 3)]).toEqual([200, 100, 50]);
  });
});
