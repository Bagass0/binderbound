import { gzipSync } from 'node:zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createSetRepository } from '../src/services/setRepository.js';
import { createPriceService, normalizeNumber } from '../src/services/prices.js';
import { GRID, mosaic } from '../src/import/fingerprint.js';

/** Faux tcgcsv : deux groupes, une carte en Normal + Foil, une autre en Foil seulement. */
const TCG = {
  '/groups': {
    results: [
      { groupId: 1, abbreviation: 'TST' },
      { groupId: 2, abbreviation: 'TST' },
    ],
  },
  '/1/prices': {
    results: [
      { productId: 100, subTypeName: 'Normal', marketPrice: 0.25, midPrice: 0.3 },
      { productId: 100, subTypeName: 'Foil', marketPrice: null, midPrice: 1.5 },
    ],
  },
  '/2/prices': {
    results: [
      { productId: 200, subTypeName: 'Foil', marketPrice: 42 },
      { productId: 300, subTypeName: 'Normal', marketPrice: 1 },
    ],
  },
  // Catalogue : TST-004 n'a pas d'identifiant TCGplayer, il est retrouvé par son numéro.
  '/1/products': { results: [] },
  '/2/products': {
    results: [{ productId: 300, extendedData: [{ name: 'Number', value: '004/010' }] }],
  },
};

/** Faux Card Nexus : flux gzippés (NDJSON), un produit relié par TCGplayer, un par numéro. */
const ndjson = (rows) => gzipSync(rows.map((r) => JSON.stringify(r)).join('\n'));
const NEXUS_FILES = {
  expansions: ndjson([{ id: 7, code: 'TST', slug: 'test', name: 'Test' }]),
  catalog: ndjson([
    {
      id: 1,
      productType: 'card',
      expansionId: 7,
      printNumber: '001',
      variant: null,
      externalIds: { tcgplayer: [{ finish: 'Standard', id: 100 }] },
    },
    {
      id: 2,
      productType: 'card',
      expansionId: 7,
      printNumber: '003/010',
      variant: null,
      externalIds: null,
    },
    {
      id: 3,
      productType: 'card',
      expansionId: 7,
      printNumber: '003',
      variant: 'Alternate Art',
      externalIds: null,
    },
  ]),
  prices: ndjson([
    {
      productId: 1,
      pricesByFinish: { Standard: { cardmarket: { currency: 'EUR', marketValue: 0.2 } } },
    },
    {
      productId: 2,
      pricesByFinish: {
        Foil: {
          cardnexus: { regions: { eu: { currency: 'EUR', low: { amount: 3, currency: 'EUR' } } } },
        },
      },
    },
    { productId: 3, pricesByFinish: { Standard: { cardmarket: { marketValue: 9 } } } },
  ]),
};

function fakeFetch({ fail = false, rate = true } = {}) {
  return vi.fn(async (url, init) => {
    if (fail) return { ok: false, status: 500 };
    if (url.endsWith('last-updated.txt'))
      return { ok: true, text: async () => '2026-11-07T20:05:27+0000' };
    if (url.includes('frankfurter'))
      return rate
        ? { ok: true, json: async () => ({ rates: { EUR: 0.9 } }) }
        : { ok: false, status: 503 };
    if (url.startsWith('https://public-api.cardnexus.com/v1/feeds/riftbound/')) {
      if (init.headers.Authorization !== 'Bearer cnk_test') return { ok: false, status: 401 };
      const feed = url.split('/').pop();
      return {
        ok: true,
        json: async () => ({
          data: { url: `https://files.test/${feed}`, generatedAt: '2026-11-11' },
        }),
      };
    }
    if (url.startsWith('https://files.test/')) {
      const bytes = NEXUS_FILES[url.split('/').pop()];
      return {
        ok: true,
        arrayBuffer: async () =>
          bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
      };
    }
    const path = url.replace('https://tcgcsv.com/tcgplayer/89', '');
    return { ok: true, json: async () => TCG[path] };
  });
}

const cards = [
  { id: 'TST-001-010', variant: 'base', tcgplayerId: '100' },
  { id: 'TST-002-010', variant: 'base', tcgplayerId: '200' },
  { id: 'TST-003-010', variant: 'base', tcgplayerId: null },
  { id: 'TST-003A-010', variant: 'alt-art', tcgplayerId: null },
  { id: 'TST-004-010', variant: 'base', tcgplayerId: null },
];
const nexus = { apiKey: 'cnk_test', game: 'riftbound' };

describe('service de prix', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));

  it('sans Card Nexus : prix TCGplayer convertis en euros', async () => {
    const service = createPriceService({ fetch: fakeFetch() });
    const result = await service.forCards(cards);
    expect(result.currency).toBe('EUR');
    expect(result.updatedAt).toBe('2026-11-07T20:05:27+0000');
    expect(result.prices).toEqual({
      'TST-001-010': { normal: 0.23, foil: 1.35, src: 'tcgplayer' },
      'TST-002-010': { foil: 37.8, src: 'tcgplayer' },
      'TST-004-010': { normal: 0.9, src: 'tcgplayer' },
    });
  });

  it('sans taux de change ni Card Nexus : reste en dollars', async () => {
    const service = createPriceService({ fetch: fakeFetch({ rate: false }) });
    const result = await service.forCards(cards);
    expect(result.currency).toBe('USD');
    expect(result.prices['TST-002-010']).toEqual({ foil: 42, src: 'tcgplayer' });
  });

  it("Card Nexus d'abord (par TCGplayer, puis par numéro et variante), TCGplayer en complément", async () => {
    const service = createPriceService({ fetch: fakeFetch(), cardNexus: nexus });
    const result = await service.forCards(cards);
    expect(result.currency).toBe('EUR');
    expect(result.source.name).toBe('Card Nexus');
    expect(result.sources.map((s) => s.id)).toEqual(['cardnexus', 'tcgplayer']);
    expect(result.prices).toEqual({
      'TST-001-010': { normal: 0.2, src: 'cardnexus' },
      'TST-002-010': { foil: 37.8, src: 'tcgplayer' },
      'TST-003-010': { foil: 3, src: 'cardnexus' },
      'TST-003A-010': { normal: 9, src: 'cardnexus' },
      'TST-004-010': { normal: 0.9, src: 'tcgplayer' },
    });
  });

  it('normalise les numéros imprimés', () => {
    expect(normalizeNumber('007a')).toBe('7a');
    expect(normalizeNumber('R01')).toBe('r1');
    expect(normalizeNumber('019/166')).toBe('19');
    expect(normalizeNumber('299*')).toBe('299*');
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
    expect((await service.forCards(cards)).prices['TST-002-010'].foil).toBe(37.8);
  });
});

describe('GET /api/sets/:id/prices et /fingerprints', () => {
  const set = { id: 'tst', code: 'TST', releaseDate: '2025-01-01', cards };
  const repo = createSetRepository(new Map([['tst', set]]));

  it('renvoie les prix du set', async () => {
    const app = createApp(repo, { prices: createPriceService({ fetch: fakeFetch() }) });
    const res = await request(app).get('/api/sets/tst/prices').expect(200);
    expect(res.body.prices['TST-001-010']).toEqual({ normal: 0.23, foil: 1.35, src: 'tcgplayer' });
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
