/**
 * Listes de référence du jeu. Modifie ces tableaux pour ajuster les valeurs autorisées :
 * l'ordre de chaque tableau est aussi l'ordre de tri utilisé par l'algorithme
 * (ex. tri par rareté : common avant uncommon, etc.).
 */

export const CARD_TYPES = ['legend', 'unit', 'spell', 'gear', 'rune', 'battlefield'];

export const DOMAINS = ['fury', 'calm', 'mind', 'body', 'chaos', 'order', 'colorless'];

/** Groupe de tri des cartes à plusieurs domaines, rangé après les domaines simples. */
export const MULTI_DOMAIN = 'multi';

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'showcase', 'promo'];

/**
 * `base` est la carte normale ; toutes les autres valeurs sont des variantes.
 * `special` : carte hors numérotation du set (runes R01…, cartes SP…, jetons).
 */
export const VARIANTS = [
  'base',
  'alt-art',
  'overnumbered',
  'signature',
  'special',
  'promo',
  'foil',
];

export const VARIANT_TYPES = VARIANTS.filter((v) => v !== 'base');

export const SORT_OPTIONS = ['number', 'domain', 'rarity', 'type'];

export const VARIANT_MODES = ['after-base', 'end', 'exclude'];

/** Sets principaux (extensions) ou de promos (affichés à part sur l'accueil). */
export const SET_KINDS = ['main', 'promo'];

export const ORIENTATIONS = ['portrait', 'landscape'];

/** Critères de coupure de groupe (« nouvelle face par … »). */
export const BREAK_OPTIONS = SORT_OPTIONS.filter((s) => s !== 'number');

/** Formats de classeur prédéfinis proposés par l'interface. */
export const BINDER_PRESETS = [
  { id: '2x2', rows: 2, cols: 2 },
  { id: '3x3', rows: 3, cols: 3 },
  { id: '4x3', rows: 4, cols: 3 },
];

export const GRID_LIMITS = { min: 1, max: 6 };
