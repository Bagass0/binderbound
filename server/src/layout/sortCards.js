import { CARD_TYPES, DOMAINS, MULTI_DOMAIN, RARITIES, VARIANTS } from '../config/cardEnums.js';

/** Valeur de groupe d'une carte : les cartes à plusieurs domaines forment le groupe « multi ». */
export const groupValue = (card, criterion) =>
  criterion === 'domain'
    ? card.domains.length > 1
      ? MULTI_DOMAIN
      : card.domains[0]
    : card[criterion];

// Rang de chaque valeur dans l'ordre défini par la config (recherche O(1) pendant le tri).
const toRanks = (values) => new Map(values.map((v, i) => [v, i]));
const RANKS = {
  domain: toRanks([...DOMAINS, MULTI_DOMAIN]),
  rarity: toRanks(RARITIES),
  type: toRanks(CARD_TYPES),
};
const VARIANT_RANKS = toRanks(VARIANTS);

/**
 * Comparateur : critère principal (selon l'ordre défini dans la config), puis numéro, puis
 * variante (113 avant 113a, overnumbered 299 avant signature 299*).
 * Array#toSorted est stable : à égalité, l'ordre d'origine du JSON est conservé.
 */
function comparator(sortBy) {
  const ranks = RANKS[sortBy];
  return (a, b) => {
    if (ranks) {
      const diff = ranks.get(groupValue(a, sortBy)) - ranks.get(groupValue(b, sortBy));
      if (diff !== 0) return diff;
    }
    return a.number - b.number || VARIANT_RANKS.get(a.variant) - VARIANT_RANKS.get(b.variant);
  };
}

/**
 * Trie les cartes et positionne les variantes selon `variantMode`.
 * Renvoie des entrées { card, section, group } : une coupure a lieu quand l'un des deux change.
 * Les cartes hors série (runes R01, cartes SP…) n'ont pas de place dans la numérotation :
 * elles ferment toujours le classeur.
 */
export function sortCards(cards, { sortBy, variantMode, breakBy }) {
  const compare = comparator(sortBy);
  const bases = cards.filter((c) => c.variant === 'base');
  const variants = cards.filter((c) => c.variant !== 'base' && c.variant !== 'special');
  const entry = (card, section, groupCard = card) => ({
    card,
    section,
    group: breakBy ? groupValue(groupCard, breakBy) : null,
  });
  const sorted = (list, section) => list.toSorted(compare).map((c) => entry(c, section));
  // Hors série : ordre de leur identifiant (R01…R06, puis SP1…SP6), leur numéro n'ayant pas de sens.
  const byId = new Intl.Collator('en', { numeric: true }).compare;
  const specials = cards
    .filter((c) => c.variant === 'special')
    .toSorted((a, b) => byId(a.id, b.id))
    .map((c) => entry(c, 'special'));

  if (variantMode === 'exclude') return sorted(bases, 'base');

  // Les variantes forment leur propre section, triée avec le même critère.
  if (variantMode === 'end')
    return [...sorted(bases, 'base'), ...sorted(variants, 'variants'), ...specials];

  // after-base : seules les variantes qui partagent le numéro de leur base (alt-arts : 113,
  // 113a) la suivent et héritent de son groupe. Les overnumbered et signatures ont leur propre
  // numéro de collection : elles se rangent à ce numéro, donc en fin de set.
  const baseById = new Map(bases.map((b) => [b.id, b]));
  const followsBase = (v) => baseById.get(v.baseCardId)?.number === v.number;
  const byBase = Map.groupBy(variants.filter(followsBase).toSorted(compare), (v) => v.baseCardId);
  const anchors = [...bases, ...variants.filter((v) => !followsBase(v))].toSorted(compare);
  return [
    ...anchors.flatMap((anchor) => [
      entry(anchor, 'base'),
      ...(byBase.get(anchor.id) ?? []).map((v) => entry(v, 'base', anchor)),
    ]),
    ...specials,
  ];
}
