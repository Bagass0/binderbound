import { describe, expect, it } from 'vitest';
import { applySupplement, loadSupplement } from '../src/import/supplements.js';
import { setSchema } from '../src/schemas/set.schema.js';
import ven from '../data/sets/ven.json' with { type: 'json' };

describe('suppléments de cartes', () => {
  it('ajoute une carte absente de la source', () => {
    const set = { cards: [{ id: 'A' }] };
    const { set: merged, added } = applySupplement(set, [{ id: 'B' }]);
    expect(merged.cards.map((c) => c.id)).toEqual(['A', 'B']);
    expect(added).toHaveLength(1);
  });

  it('laisse la source faire foi quand elle fournit déjà la carte', () => {
    const set = { cards: [{ id: 'A', name: 'source' }] };
    const { set: merged, added } = applySupplement(set, [{ id: 'A', name: 'manuel' }]);
    expect(merged.cards).toEqual([{ id: 'A', name: 'source' }]);
    expect(added).toEqual([]);
  });

  it('une rune alternative ajoutée à la main forme un set valide', () => {
    const runeAlt = {
      ...ven.cards.find((c) => c.id === 'VEN-R02'),
      id: 'VEN-R02A',
      name: { fr: 'Calm Rune (Alternate Art)', en: 'Calm Rune (Alternate Art)' },
      rarity: 'showcase',
      variant: 'alt-art',
      baseCardId: 'VEN-R02',
      imageUrl: '/cards/ven-r02a.webp',
    };
    const { set } = applySupplement(ven, [runeAlt]);
    expect(setSchema.safeParse(set).success).toBe(true);
  });

  it('un set sans fichier de supplément n’ajoute rien', async () => {
    expect(await loadSupplement('inexistant')).toEqual([]);
  });
});
