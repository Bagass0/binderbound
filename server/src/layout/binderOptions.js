import { BREAK_OPTIONS, VARIANT_TYPES } from '../config/cardEnums.js';

/** Réglages d'un classeur sauvegardé → options de computeLayout (même règle que le client). */
export const toLayoutOptions = ({ setId, includedVariants, breakByGroup, ...options }) => ({
  ...options,
  includedVariants: includedVariants ?? [...VARIANT_TYPES],
  breakBy: breakByGroup && BREAK_OPTIONS.includes(options.sortBy) ? options.sortBy : null,
});
