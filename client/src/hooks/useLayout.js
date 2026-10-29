import { api } from '../api/client.js';
import { useAsync } from './useAsync.js';
import { toLayoutRequest } from './useLayoutParams.js';

/** Calcule le placement côté serveur (avec un léger debounce pendant que l'utilisateur règle). */
export function useLayout(params, config, { delay = 150 } = {}) {
  const body = config && params.setId ? toLayoutRequest(params, config) : null;
  const key = JSON.stringify(body);
  return useAsync(key, (signal) => (body ? api.layout(body, signal) : null), { delay });
}
