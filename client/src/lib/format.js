/** Helpers de présentation partagés (cartes, sets, positions). */

/** Nom traduit d'une carte ou d'un set, avec repli sur le français. */
export const localizedName = (entity, lang) => entity.name[lang] ?? entity.name.fr;

export const isVariant = (card) => card.variant !== 'base';

export const padNumber = (n) => String(n).padStart(3, '0');

/**
 * Numéro imprimé sur la carte, tiré de son identifiant officiel : « 027a » (alt-art),
 * « 299* » (signature), « R02 » (rune), « R02a » (rune alternative), « T03 » (jeton)… Le simple numéro de
 * collection perdrait la lettre ou le préfixe.
 */
export const cardNumber = (card) => {
  const match = card.id.match(/^[A-Z]+-([A-Z]*)(\d+)([A-Z]?)(\*?)/);
  if (!match) return padNumber(card.number);
  const [, prefix, digits, letter, star] = match;
  const suffix = `${letter.toLowerCase()}${star}`;
  return prefix ? `${prefix}${digits}${suffix}` : `${digits.padStart(3, '0')}${suffix}`;
};

/** Variables CSS de couleur des domaines d'une carte (le second sert aux cartes bi-domaines). */
export const domainStyle = ({ domains }) => ({
  '--domain': `var(--domain-${domains[0]})`,
  '--domain-2': `var(--domain-${domains.at(-1)})`,
});

/** Libellé des domaines : « Fureur / Esprit ». */
export const domainLabel = (t, { domains }) => domains.map((d) => t(`domain.${d}`)).join(' / ');

/** Groupe de tri par domaine (miroir du serveur) : les bi-domaines forment le groupe « multi ». */
export const domainGroup = ({ domains }) => (domains.length > 1 ? 'multi' : domains[0]);

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
