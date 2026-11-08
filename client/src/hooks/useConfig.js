import { api } from '../api/client.js';
import { useAsync } from './useAsync.js';

/** Listes de référence (domaines, variantes…) servies par l'API. */
export const useConfig = () => useAsync('config', () => api.config());

/** Un set complet (avec ses cartes). */
export const useSet = (setId) => useAsync(`set:${setId}`, () => api.set(setId));

/** Prix des cartes d'un set ; null si la source est indisponible (les prix sont facultatifs). */
export const usePrices = (setId) =>
  useAsync(`prices:${setId}`, () => api.prices(setId).catch(() => null));

/** Liste des sets disponibles. */
export const useSets = () => useAsync('sets', () => api.sets());
