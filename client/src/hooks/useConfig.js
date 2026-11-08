import { api } from '../api/client.js';
import { useAsync } from './useAsync.js';

/** Listes de référence (domaines, variantes…) servies par l'API. */
export const useConfig = () => useAsync('config', () => api.config());

/** Un set complet (avec ses cartes). */
export const useSet = (setId) => useAsync(`set:${setId}`, () => api.set(setId));

/** Prix des cartes d'un set ; null si la source est indisponible (les prix sont facultatifs). */
export const usePrices = (setId) =>
  useAsync(`prices:${setId}`, () => api.prices(setId).catch(() => null));

/** Prix de tous les sets, indexés par identifiant de set (null pour un set sans prix). */
export const useAllPrices = () =>
  useAsync('prices:*', async () => {
    const sets = await api.sets();
    const prices = await Promise.all(sets.map((s) => api.prices(s.id).catch(() => null)));
    return Object.fromEntries(sets.map((s, i) => [s.id, prices[i]]));
  });

/** Liste des sets disponibles. */
export const useSets = () => useAsync('sets', () => api.sets());
