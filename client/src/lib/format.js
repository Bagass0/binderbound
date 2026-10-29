/** Helpers de présentation partagés (cartes, sets, positions). */

/** Nom traduit d'une carte ou d'un set, avec repli sur le français. */
export const localizedName = (entity, lang) => entity.name[lang] ?? entity.name.fr;

export const isVariant = (card) => card.variant !== 'base';

export const padNumber = (n) => String(n).padStart(3, '0');

/** Variable CSS de couleur du domaine, à passer en `style`. */
export const domainStyle = (domain) => ({ '--domain': `var(--domain-${domain})` });

/** Libellé de face « Feuillet 2 · Verso ». */
export const formatFace = (t, face) =>
  t('position.face', { sheet: face.sheet, side: t(`side.${face.side}`) });

/** Libellé de position complet « Feuillet 2 · Verso · L1 · C3 ». */
export const formatPosition = (t, pos) =>
  t('position.full', { sheet: pos.sheet, side: t(`side.${pos.side}`), row: pos.row, col: pos.col });

/** Style d'une grille de pochettes : les CSS en déduisent le ratio (tokens --card-w/--card-h). */
export const gridStyle = (rows, cols) => ({
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  '--rows': rows,
  '--cols': cols,
});
