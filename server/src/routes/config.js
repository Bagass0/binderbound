import { Router } from 'express';
import * as enums from '../config/cardEnums.js';

/** Expose les listes de référence au client : une seule source de vérité. */
export function configRouter({ accounts } = {}) {
  const router = Router();
  const payload = {
    domains: enums.DOMAINS,
    /** Groupes de tri par domaine : domaines simples puis cartes multi-domaines. */
    domainGroups: [...enums.DOMAINS, enums.MULTI_DOMAIN],
    rarities: enums.RARITIES,
    variantTypes: enums.VARIANT_TYPES,
    sortOptions: enums.SORT_OPTIONS,
    variantModes: enums.VARIANT_MODES,
    breakOptions: enums.BREAK_OPTIONS,
    binderPresets: enums.BINDER_PRESETS,
    gridLimits: enums.GRID_LIMITS,
    /** Comptes disponibles (base configurée) et Client ID public du bouton Google. */
    accounts: { enabled: Boolean(accounts), googleClientId: accounts?.googleClientId ?? null },
  };
  router.get('/', (_req, res) => res.json(payload));
  return router;
}
