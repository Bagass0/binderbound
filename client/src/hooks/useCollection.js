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
// Les doubles (cartes à échanger) n'existent qu'avec un compte : les échanges passent par lui.
const sources = {
  local: {
    load: async (setId) => ({ cardIds: localCollection.load(setId), doubleIds: [] }),
    save: (setId, next) => localCollection.save(setId, [...next]),
  },
  remote: {
    load: (setId, signal) => api.collection.get(setId, signal),
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

  const [state, setState] = useState({ key: null, owned: EMPTY, doubles: EMPTY });
  const [version, setVersion] = useState(0); // force un rechargement après une erreur
  const [tracking, setTrackingState] = useState(() => storage.get(TRACKING_KEY, false));
  const ownedRef = useRef(EMPTY);
  const doublesRef = useRef(EMPTY);

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve(source.load(setId, controller.signal))
      .then(({ cardIds, doubleIds }) => {
        if (controller.signal.aborted) return;
        ownedRef.current = new Set(cardIds);
        doublesRef.current = new Set(doubleIds);
        setState({ key, owned: ownedRef.current, doubles: doublesRef.current });
      })
      .catch((err) => !controller.signal.aborted && console.error(err));
    return () => controller.abort();
  }, [key, setId, source, version]);

  // En cas d'échec (réseau, session expirée…), on recharge l'état réel.
  const reload = useCallback((err) => {
    console.error(err);
    setVersion((v) => v + 1);
  }, []);

  /** Un double est toujours possédé : retirer une carte retire son double (comme le serveur). */
  const commit = useCallback(
    (next, change) => {
      const doubles = new Set([...doublesRef.current].filter((id) => next.has(id)));
      ownedRef.current = next;
      doublesRef.current = doubles;
      setState({ key, owned: next, doubles });
      Promise.resolve(source.save(setId, next, change)).catch(reload);
    },
    [key, setId, source, reload],
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

  /** Marque ou retire un double (compte uniquement) ; marquer un double coche la carte. */
  const toggleDouble = useCallback(
    (cardId) => {
      const doubles = new Set(doublesRef.current);
      const owned = new Set(ownedRef.current);
      const add = !doubles.has(cardId);
      if (add) {
        doubles.add(cardId);
        owned.add(cardId);
      } else {
        doubles.delete(cardId);
      }
      ownedRef.current = owned;
      doublesRef.current = doubles;
      setState({ key, owned, doubles });
      (add ? api.collection.addDouble : api.collection.removeDouble)(setId, cardId).catch(reload);
    },
    [key, setId, reload],
  );

  const setTracking = useCallback((value) => {
    storage.set(TRACKING_KEY, value);
    setTrackingState(value);
  }, []);

  const current = state.key === key;
  const owned = current ? state.owned : EMPTY;
  const doubles = current ? state.doubles : EMPTY;

  // Objet stable tant que rien ne change : laisse fonctionner le memo des faces et des cartes.
  return useMemo(
    () => ({
      owned,
      doubles,
      toggle,
      setAll,
      toggleDouble: user ? toggleDouble : null,
      tracking,
      setTracking,
      synced: Boolean(user),
    }),
    [owned, doubles, toggle, setAll, toggleDouble, tracking, setTracking, user],
  );
}
