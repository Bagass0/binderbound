import { api } from '../api/client.js';
import { useAsync } from './useAsync.js';

/** Listes de référence (domaines, variantes…) servies par l'API. */
export const useConfig = () => useAsync('config', () => api.config());

/** Un set complet (avec ses cartes). */
export const useSet = (setId) => useAsync(`set:${setId}`, () => api.set(setId));

/** Liste des sets disponibles. */
export const useSets = () => useAsync('sets', () => api.sets());
