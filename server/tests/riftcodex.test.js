import { describe, expect, it } from 'vitest';
import { dedupe, mapSet, variantOf } from '../src/import/riftcodex.js';
import { setSchema } from '../src/schemas/set.schema.js';

/** Carte au format Riftcodex, réduite aux champs utilisés. */
const raw = (riftboundId, name, number, extra = {}) => ({
  riftbound_id: riftboundId,
  name,
  collector_number: number,
  classification: { type: 'Unit', supertype: null, rarity: 'Rare', domain: ['Fury'] },
  media: { image_url: `https://cdn.example.com/${riftboundId}.png`, artist: 'Artiste' },
  orientation: 'portrait',
  metadata: {
    alternate_art: false,
    overnumbered: false,
    signature: false,
    updated_on: '2026-07-01',
  },
  ...extra,
  ...(extra.metadata && {
    metadata: {
      alternate_art: false,
      overnumbered: false,
      signature: false,
      updated_on: '2026-07-01',
      ...extra.metadata,
    },
  }),
});
const meta = { set_id: 'TST', name: 'Test Set', published_on: '2026-02-13T00:00:00' };

describe('mapSet (Riftcodex → Binderbound)', () => {
  const set = mapSet(meta, [
    raw('tst-001-010', 'Jinx - Rebel', 1),
    raw('tst-001a-010', 'Jinx - Rebel (Alternate Art)', 1, { metadata: { alternate_art: true } }),
    raw('tst-002-010', 'Ahri, Fox', 2, {
      classification: {
        type: 'Legend',
        supertype: 'Champion',
        rarity: 'Epic',
        domain: ['Calm', 'Mind'],
      },
    }),
    raw('tst-011-010', 'Ahri - Fox (Overnumbered)', 11, { metadata: { overnumbered: true } }),
    raw('tst-011*-010', 'Ahri - Fox (Signature)', 11, { metadata: { signature: true } }),
    raw('tst-012-010', 'Poro (Overnumbered)', 12, { metadata: { overnumbered: true } }),
    raw('tst-003-010', 'Arena', 3, { orientation: 'landscape' }),
    raw('tst-004-010', 'Jayce - Defender of Tomorrow', 4),
    raw('tst-013-010', 'Defender of Tomorrow', 13),
  ]);
  const byId = Object.fromEntries(set.cards.map((c) => [c.id, c]));

  it('produit un set valide', () => {
    expect(setSchema.safeParse(set).success).toBe(true);
    expect(set).toMatchObject({ id: 'tst', code: 'TST', releaseDate: '2026-02-13', kind: 'main' });
  });

  it('relie les alt-arts par numéro et les overnumbered/signatures par nom', () => {
    expect(byId['TST-001A-010']).toMatchObject({ variant: 'alt-art', baseCardId: 'TST-001-010' });
    expect(byId['TST-011-010']).toMatchObject({
      variant: 'overnumbered',
      baseCardId: 'TST-002-010',
    });
    expect(byId['TST-011*-010']).toMatchObject({ variant: 'signature', baseCardId: 'TST-002-010' });
  });

  it('retrouve la base d’un nom tronqué par la source', () => {
    expect(byId['TST-013-010']).toMatchObject({
      variant: 'overnumbered',
      baseCardId: 'TST-004-010',
    });
  });

  it('laisse autonome une variante sans base dans le set', () => {
    expect(byId['TST-012-010']).toMatchObject({ variant: 'overnumbered', baseCardId: null });
  });

  it('convertit domaines, type, sur-type, orientation et image', () => {
    expect(byId['TST-002-010']).toMatchObject({
      type: 'legend',
      supertype: 'Champion',
      domains: ['calm', 'mind'],
      rarity: 'epic',
      name: { fr: 'Ahri, Fox', en: 'Ahri, Fox' },
    });
    expect(byId['TST-003-010'].orientation).toBe('landscape');
    expect(byId['TST-001-010'].imageUrl).toBe('https://cdn.example.com/tst-001-010.png');
  });

  it('classe les sets de promos à part', () => {
    expect(mapSet({ ...meta, set_id: 'OPP' }, [raw('opp-001-010', 'X', 1)]).kind).toBe('promo');
  });
});

describe('variantOf : variante déduite de l’identifiant officiel', () => {
  // Les drapeaux de la source sont faux ou absents sur ces cartes (cas réels de Vendetta).
  const card = (id) => raw(id, 'Carte', 1);

  it.each([
    ['ven-084-166', 'base'],
    ['ven-084a-166', 'alt-art'],
    ['ven-167-166', 'overnumbered'],
    ['unl-229*-219', 'signature'],
    ['ven-r01', 'special'],
    ['ven-sp2-006', 'special'],
    ['sfd-t03', 'special'],
  ])('%s → %s', (id, expected) => {
    expect(variantOf(card(id), false)).toBe(expected);
  });

  it('garde les drapeaux de la source pour un set de promos', () => {
    expect(variantOf(card('opp-001-219'), true)).toBe('base');
    expect(variantOf(raw('pr-1-298', 'X', 1, { metadata: { alternate_art: true } }), true)).toBe(
      'alt-art',
    );
  });
});

describe('dedupe', () => {
  it('garde l’enregistrement le plus récent pour un même identifiant', () => {
    const cards = dedupe([
      raw('ven-139-166', 'Rogue Assassin', 139),
      raw('ven-139-166', 'Akali - Rogue Assassin', 139, { metadata: { updated_on: '2026-07-14' } }),
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('Akali - Rogue Assassin');
  });

  it('distingue une impression « (Metal) » de la carte normale', () => {
    const ids = dedupe([
      raw('opp-017-024', 'Annie - Dark Child', 17),
      raw('opp-017-024', 'Annie - Dark Child (Metal)', 17),
    ]).map((c) => c.id);
    expect(ids).toEqual(['OPP-017-024', 'OPP-017-024-METAL']);
  });
});
