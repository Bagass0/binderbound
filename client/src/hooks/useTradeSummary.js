import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';

const REFRESH = 60e3;
const EVENT = 'binderbound:trades-changed';

/** À appeler après une action sur les amis ou les échanges : la pastille se met à jour. */
export const notifyTradesChanged = () => window.dispatchEvent(new Event(EVENT));

/**
 * Nombre de demandes d'ami et de propositions d'échange qui attendent une réponse.
 * Rafraîchi à chaque changement de page, toutes les minutes et après chaque action.
 */
export function useTradeSummary(pathname) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const load = () =>
      api.trades
        .summary(controller.signal)
        .then(setSummary)
        .catch(() => {});
    load();
    const timer = setInterval(load, REFRESH);
    window.addEventListener(EVENT, load);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener(EVENT, load);
    };
  }, [userId, pathname]);

  return userId && summary ? summary.friendRequests + summary.trades : 0;
}
