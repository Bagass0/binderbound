import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';

const REFRESH = 60e3;
const EVENT = 'binderbound:notifications';

/** À appeler après une action sur les amis ou les échanges : la cloche se met à jour. */
export const notifyChanged = () => window.dispatchEvent(new Event(EVENT));

/**
 * Nombre de notifications non lues. Rafraîchi à chaque changement de page, toutes les
 * minutes et après chaque action (`notifyChanged`).
 */
export function useUnreadCount(pathname) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const load = () =>
      api.notifications
        .count(controller.signal)
        .then((r) => setUnread(r.unread))
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

  return userId ? unread : 0;
}
