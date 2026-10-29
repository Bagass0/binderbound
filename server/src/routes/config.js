import { Router } from 'express';
import * as enums from '../config/cardEnums.js';

/** Expose les listes de référence au client : une seule source de vérité. */
export function configRouter() {
  const router = Router();
  const payload = {
    domains: enums.DOMAINS,
    rarities: enums.RARITIES,
    variantTypes: enums.VARIANT_TYPES,
    sortOptions: enums.SORT_OPTIONS,
    variantModes: enums.VARIANT_MODES,
    breakOptions: enums.BREAK_OPTIONS,
    binderPresets: enums.BINDER_PRESETS,
    gridLimits: enums.GRID_LIMITS,
  };
  router.get('/', (_req, res) => res.json(payload));
  return router;
}
