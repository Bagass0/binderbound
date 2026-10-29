import { CARD_TYPES, DOMAINS, RARITIES } from '../config/cardEnums.js';

// Rang de chaque valeur dans l'ordre défini par la config (recherche O(1) pendant le tri).
const toRanks = (values) => new Map(values.map((v, i) => [v, i]));
const RANKS = { domain: toRanks(DOMAINS), rarity: toRanks(RARITIES), type: toRanks(CARD_TYPES) };

/**
 * Comparateur : critère principal (selon l'ordre défini dans la config), puis numéro.
 * Array#toSorted est stable : à égalité, l'ordre d'origine du JSON est conservé.
 */
function comparator(sortBy) {
  const ranks = RANKS[sortBy];
  return (a, b) => {
    if (ranks) {
      const diff = ranks.get(a[sortBy]) - ranks.get(b[sortBy]);
      if (diff !== 0) return diff;
    }
    return a.number - b.number;
  };
}

/**
 * Trie les cartes et positionne les variantes selon `variantMode`.
 * Renvoie des entrées { card, section, group } : une coupure a lieu quand l'un des deux change.
 * Le schéma garantit que chaque variante pointe vers une carte de base du set.
 */
export function sortCards(cards, { sortBy, variantMode, breakBy }) {
  const compare = comparator(sortBy);
  const bases = cards.filter((c) => c.variant === 'base').toSorted(compare);
  const variants = cards.filter((c) => c.variant !== 'base');
  const entry = (card, section, groupCard = card) => ({
    card,
    section,
    group: breakBy ? groupCard[breakBy] : null,
  });

  if (variantMode === 'exclude') return bases.map((card) => entry(card, 'base'));

  if (variantMode === 'end') {
    // Les variantes forment leur propre section, triée avec le même critère.
    return [
      ...bases.map((card) => entry(card, 'base')),
      ...variants.toSorted(compare).map((card) => entry(card, 'variants')),
    ];
  }

  // after-base : chaque variante suit sa carte de base (par numéro, puis ordre du JSON)
  // et hérite de son groupe pour ne jamais en être séparée.
  const byBase = Map.groupBy(
    variants.toSorted((a, b) => a.number - b.number),
    (v) => v.baseCardId,
  );
  return bases.flatMap((base) => [
    entry(base, 'base'),
    ...(byBase.get(base.id) ?? []).map((v) => entry(v, 'base', base)),
  ]);
}
