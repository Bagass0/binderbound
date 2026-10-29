/** Répartition cartes de base / variantes. */
export function countCards(cards) {
  const base = cards.filter((c) => c.variant === 'base').length;
  return { base, variants: cards.length - base, total: cards.length };
}
