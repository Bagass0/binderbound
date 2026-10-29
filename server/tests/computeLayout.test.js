import { describe, expect, it } from 'vitest';
import { computeLayout } from '../src/layout/computeLayout.js';
import sample from '../data/sets/sample.json' with { type: 'json' };

/** Fabrique une carte minimale pour les tests. */
const card = (number, extra = {}) => ({
  id: `T-${number}${extra.suffix ?? ''}`,
  number,
  name: { fr: `Carte ${number}`, en: `Card ${number}` },
  type: 'unit',
  domain: 'fury',
  rarity: 'common',
  variant: 'base',
  baseCardId: null,
  imageUrl: null,
  ...extra,
});
const range = (n, extra) => Array.from({ length: n }, (_, i) => card(i + 1, extra));
const ids = (layout) => layout.faces.flatMap((f) => f.slots.map((s) => s.card?.id ?? null));

describe('formats de grille', () => {
  it('2x2 : 4 cartes par face', () => {
    const { summary, index } = computeLayout(range(10), { rows: 2, cols: 2 });
    expect(summary.slotsPerFace).toBe(4);
    expect(summary.facesUsed).toBe(3);
    expect(summary.emptySlots).toBe(2);
    expect(index['T-5']).toEqual({ faceIndex: 1, sheet: 1, side: 'verso', row: 1, col: 1 });
    expect(index['T-10']).toEqual({ faceIndex: 2, sheet: 2, side: 'recto', row: 1, col: 2 });
  });

  it('3x3 : 9 cartes par face, ligne et colonne en 1-based', () => {
    const { summary, index } = computeLayout(range(9), { rows: 3, cols: 3 });
    expect(summary.facesUsed).toBe(1);
    expect(summary.emptySlots).toBe(0);
    expect(index['T-1']).toMatchObject({ row: 1, col: 1 });
    expect(index['T-6']).toMatchObject({ row: 2, col: 3 });
    expect(index['T-9']).toMatchObject({ row: 3, col: 3 });
  });

  it('format personnalisé 2x5', () => {
    const { faces, index } = computeLayout(range(11), { rows: 2, cols: 5 });
    expect(faces).toHaveLength(2);
    expect(faces[0].slots).toHaveLength(10);
    expect(index['T-7']).toMatchObject({ faceIndex: 0, row: 2, col: 2 });
    expect(index['T-11']).toMatchObject({ faceIndex: 1, row: 1, col: 1 });
  });

  it('applique les valeurs par défaut (3x3 recto-verso)', () => {
    const { options } = computeLayout(range(1));
    expect(options).toMatchObject({
      rows: 3,
      cols: 3,
      doubleSided: true,
      variantMode: 'after-base',
    });
  });
});

describe('recto-verso', () => {
  it('activé : deux faces par feuillet', () => {
    const { index, summary } = computeLayout(range(20), { rows: 2, cols: 2 });
    expect(index['T-1']).toMatchObject({ sheet: 1, side: 'recto' });
    expect(index['T-5']).toMatchObject({ sheet: 1, side: 'verso' });
    expect(index['T-9']).toMatchObject({ sheet: 2, side: 'recto' });
    expect(index['T-17']).toMatchObject({ sheet: 3, side: 'recto' });
    expect(summary.sheetsUsed).toBe(3);
  });

  it('désactivé : une face par feuillet, toujours recto', () => {
    const { index, summary } = computeLayout(range(20), { rows: 2, cols: 2, doubleSided: false });
    expect(index['T-5']).toMatchObject({ sheet: 2, side: 'recto' });
    expect(index['T-17']).toMatchObject({ sheet: 5, side: 'recto' });
    expect(summary.sheetsUsed).toBe(5);
  });
});

describe('variantes', () => {
  const cards = [
    card(2),
    card(1),
    card(1, { suffix: 'a', variant: 'alt-art', baseCardId: 'T-1' }),
    card(3),
    card(4, { variant: 'overnumbered', baseCardId: 'T-2' }),
    card(1, { suffix: 's', variant: 'signature', baseCardId: 'T-1' }),
  ];

  it('after-base : chaque variante suit sa base, ordre stable', () => {
    expect(ids(computeLayout(cards, { rows: 1, cols: 6 }))).toEqual([
      'T-1',
      'T-1a',
      'T-1s',
      'T-2',
      'T-4',
      'T-3',
    ]);
  });

  it('end : variantes regroupées après le set', () => {
    expect(ids(computeLayout(cards, { rows: 1, cols: 6, variantMode: 'end' }))).toEqual([
      'T-1',
      'T-2',
      'T-3',
      'T-1a',
      'T-1s',
      'T-4',
    ]);
  });

  it('exclude : aucune variante', () => {
    const layout = computeLayout(cards, { rows: 1, cols: 3, variantMode: 'exclude' });
    expect(ids(layout)).toEqual(['T-1', 'T-2', 'T-3']);
    expect(layout.summary).toMatchObject({ totalCards: 3, variantCards: 0 });
  });

  it('filtre par type de variante', () => {
    const layout = computeLayout(cards, { rows: 1, cols: 6, includedVariants: ['signature'] });
    expect(ids(layout).filter(Boolean)).toEqual(['T-1', 'T-1s', 'T-2', 'T-3']);
  });

  it('includedVariants vide : seules les cartes de base', () => {
    const layout = computeLayout(cards, { rows: 1, cols: 3, includedVariants: [] });
    expect(layout.summary.variantCards).toBe(0);
  });
});

describe('tri', () => {
  const mixed = [
    card(1, { domain: 'mind', rarity: 'rare', type: 'spell' }),
    card(2, { domain: 'fury', rarity: 'epic', type: 'legend' }),
    card(3, { domain: 'calm', rarity: 'common', type: 'unit' }),
    card(4, { domain: 'fury', rarity: 'common', type: 'spell' }),
  ];
  const order = (sortBy) => ids(computeLayout(mixed, { rows: 1, cols: 4, sortBy }));

  it('par numéro', () => expect(order('number')).toEqual(['T-1', 'T-2', 'T-3', 'T-4']));
  it('par domaine puis numéro', () =>
    expect(order('domain')).toEqual(['T-2', 'T-4', 'T-3', 'T-1']));
  it('par rareté puis numéro', () => expect(order('rarity')).toEqual(['T-3', 'T-4', 'T-1', 'T-2']));
  it('par type puis numéro', () => expect(order('type')).toEqual(['T-2', 'T-3', 'T-1', 'T-4']));
});

describe('coupure par groupe', () => {
  const cards = [
    ...range(5, { domain: 'fury' }),
    ...Array.from({ length: 3 }, (_, i) => card(10 + i, { domain: 'calm' })),
  ];

  it('chaque domaine commence en haut d’une face', () => {
    const layout = computeLayout(cards, { rows: 2, cols: 2, sortBy: 'domain', breakBy: 'domain' });
    expect(layout.index['T-5']).toMatchObject({ faceIndex: 1, row: 1, col: 1 });
    expect(layout.index['T-10']).toMatchObject({ faceIndex: 2, row: 1, col: 1 });
    expect(layout.faces[1].slots.slice(1).every((s) => s.card === null)).toBe(true);
    expect(layout.summary.emptySlots).toBe(4);
  });

  it('pas de face vide quand un groupe remplit exactement une face', () => {
    const layout = computeLayout(cards.slice(1), { rows: 2, cols: 2, breakBy: 'domain' });
    expect(layout.index['T-10']).toMatchObject({ faceIndex: 1, row: 1, col: 1 });
  });

  it('une variante reste avec sa base même si son domaine diffère', () => {
    const layout = computeLayout(
      [card(1), card(1, { suffix: 'a', variant: 'alt-art', baseCardId: 'T-1', domain: 'calm' })],
      { rows: 2, cols: 2, breakBy: 'domain' },
    );
    expect(layout.index['T-1a']).toMatchObject({ faceIndex: 0, row: 1, col: 2 });
  });

  it('en mode end, la section variantes commence sur une nouvelle face', () => {
    const layout = computeLayout(
      [...range(3), card(1, { suffix: 'a', variant: 'alt-art', baseCardId: 'T-1' })],
      { rows: 2, cols: 2, variantMode: 'end', breakBy: 'domain' },
    );
    expect(layout.index['T-1a']).toMatchObject({ faceIndex: 1, row: 1, col: 1 });
  });
});

describe('décalage initial', () => {
  it('faces réservées laissées vides au début', () => {
    const layout = computeLayout(range(4), { rows: 2, cols: 2, reservedFaces: 2 });
    expect(layout.index['T-1']).toMatchObject({ faceIndex: 2, sheet: 2, side: 'recto' });
    expect(layout.faces.slice(0, 2).every((f) => f.reserved)).toBe(true);
    expect(layout.summary).toMatchObject({ facesUsed: 3, cardFaces: 1, emptySlots: 0 });
  });

  it('départ à droite après une face réservée : saute le verso', () => {
    const layout = computeLayout(range(4), {
      rows: 2,
      cols: 2,
      reservedFaces: 1,
      startOnRight: true,
    });
    expect(layout.index['T-1']).toMatchObject({ faceIndex: 2, sheet: 2, side: 'recto' });
    expect(layout.summary.skippedFaces).toBe(2);
  });

  it('départ à droite sans décalage nécessaire (déjà un recto)', () => {
    const layout = computeLayout(range(4), {
      rows: 2,
      cols: 2,
      reservedFaces: 2,
      startOnRight: true,
    });
    expect(layout.index['T-1']).toMatchObject({ faceIndex: 2, side: 'recto' });
  });

  it('départ à droite en simple face : aucun décalage', () => {
    const layout = computeLayout(range(4), {
      rows: 2,
      cols: 2,
      doubleSided: false,
      reservedFaces: 1,
      startOnRight: true,
    });
    expect(layout.index['T-1']).toMatchObject({ faceIndex: 1, sheet: 2 });
  });
});

describe('maxPages', () => {
  it('signale le dépassement', () => {
    const { summary } = computeLayout(range(40), { rows: 3, cols: 3, maxPages: 2 });
    expect(summary).toMatchObject({ sheetsUsed: 3, fits: false, overflowSheets: 1 });
  });

  it('tient dans le classeur', () => {
    const { summary } = computeLayout(range(36), { rows: 3, cols: 3, maxPages: 2 });
    expect(summary).toMatchObject({ sheetsUsed: 2, fits: true, overflowSheets: 0 });
  });

  it('sans limite : toujours ok', () => {
    expect(computeLayout(range(500)).summary.fits).toBe(true);
  });
});

describe('cas limites et cohérence', () => {
  it('aucune carte', () => {
    const layout = computeLayout([], { reservedFaces: 1 });
    expect(layout.summary).toMatchObject({ totalCards: 0, facesUsed: 1, emptySlots: 0 });
  });

  it('options invalides rejetées', () => {
    expect(() => computeLayout([], { rows: 0 })).toThrow();
    expect(() => computeLayout([], { sortBy: 'nom' })).toThrow();
  });

  it('ne modifie pas les cartes d’entrée', () => {
    const cards = range(3).toReversed();
    const snapshot = structuredClone(cards);
    computeLayout(cards);
    expect(cards).toEqual(snapshot);
  });

  it('set d’exemple : index et grille concordent, aucune case en double', () => {
    for (const options of [
      {},
      { rows: 4, cols: 3, sortBy: 'domain', breakBy: 'domain', variantMode: 'end' },
      { rows: 2, cols: 2, doubleSided: false, reservedFaces: 3, startOnRight: true },
    ]) {
      const layout = computeLayout(sample.cards, options);
      const placed = layout.faces.flatMap((f) => f.slots.filter((s) => s.card));
      expect(placed).toHaveLength(sample.cards.length);
      for (const face of layout.faces) {
        for (const slot of face.slots.filter((s) => s.card)) {
          expect(layout.index[slot.card.id]).toEqual({
            faceIndex: face.faceIndex,
            sheet: face.sheet,
            side: face.side,
            row: slot.row,
            col: slot.col,
          });
        }
      }
    }
  });
});
