import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { localCollection } from './localCollection.js';
import { storage } from './storage.js';

const TRACKING_KEY = 'binderbound.trackCollection';
const EMPTY = new Set();

/**
 * Deux sources interchangeables : le navigateur pour un invité, le compte (API) une fois connecté.
 * Le compte reçoit des changements unitaires (cocher / décocher) plutôt que toute la liste.
 */
const sources = {
  local: {
    load: async (setId) => localCollection.load(setId),
    save: (setId, next) => localCollection.save(setId, [...next]),
  },
  remote: {
    load: (setId, signal) => api.collection.get(setId, signal).then((r) => r.cardIds),
    save: (setId, next, change) => {
      if (!change) return api.collection.replace(setId, [...next]);
      return change.owned
        ? api.collection.add(setId, change.cardId)
        : api.collection.remove(setId, change.cardId);
    },
  },
};

/** Cartes possédées pour un set. Les mises à jour sont optimistes. */
export function useCollection(setId) {
  const { user } = useAuth();
  const source = user ? sources.remote : sources.local;
  const key = `${user?.id ?? 'guest'}:${setId}`;

  const [state, setState] = useState({ key: null, owned: EMPTY });
  const [version, setVersion] = useState(0); // force un rechargement après une erreur
  const [tracking, setTrackingState] = useState(() => storage.get(TRACKING_KEY, false));
  const ownedRef = useRef(EMPTY);

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve(source.load(setId, controller.signal))
      .then((ids) => {
        if (controller.signal.aborted) return;
        ownedRef.current = new Set(ids);
        setState({ key, owned: ownedRef.current });
      })
      .catch((err) => !controller.signal.aborted && console.error(err));
    return () => controller.abort();
  }, [key, setId, source, version]);

  const commit = useCallback(
    (next, change) => {
      ownedRef.current = next;
      setState({ key, owned: next });
      // En cas d'échec (réseau, session expirée…), on recharge l'état réel.
      Promise.resolve(source.save(setId, next, change)).catch((err) => {
        console.error(err);
        setVersion((v) => v + 1);
      });
    },
    [key, setId, source],
  );

  const toggle = useCallback(
    (cardId) => {
      const next = new Set(ownedRef.current);
      const owned = !next.has(cardId);
      if (owned) next.add(cardId);
      else next.delete(cardId);
      commit(next, { cardId, owned });
    },
    [commit],
  );

  const setAll = useCallback((cardIds) => commit(new Set(cardIds)), [commit]);

  const setTracking = useCallback((value) => {
    storage.set(TRACKING_KEY, value);
    setTrackingState(value);
  }, []);

  const owned = state.key === key ? state.owned : EMPTY;

  // Objet stable tant que rien ne change : laisse fonctionner le memo des faces et des cartes.
  return useMemo(
    () => ({ owned, toggle, setAll, tracking, setTracking, synced: Boolean(user) }),
    [owned, toggle, setAll, tracking, setTracking, user],
  );
}
