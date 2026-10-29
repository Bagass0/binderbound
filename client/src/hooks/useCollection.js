import { useCallback, useMemo, useState } from 'react';
import { storage } from './storage.js';

const collectionKey = (setId) => `binderbound.collection.${setId}`;
const TRACKING_KEY = 'binderbound.trackCollection';

/** Cartes possédées pour un set, sauvegardées dans localStorage. */
export function useCollection(setId) {
  const [owned, setOwned] = useState(() => new Set(storage.get(collectionKey(setId), [])));
  const [tracking, setTrackingState] = useState(() => storage.get(TRACKING_KEY, false));
  const [loadedFor, setLoadedFor] = useState(setId);

  // Changement de set : on recharge la collection correspondante.
  if (loadedFor !== setId) {
    setLoadedFor(setId);
    setOwned(new Set(storage.get(collectionKey(setId), [])));
  }

  const persist = useCallback(
    (next) => {
      storage.set(collectionKey(setId), [...next]);
      return next;
    },
    [setId],
  );

  const toggle = useCallback(
    (cardId) =>
      setOwned((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) next.delete(cardId);
        else next.add(cardId);
        return persist(next);
      }),
    [persist],
  );

  const setAll = useCallback((cardIds) => setOwned(persist(new Set(cardIds))), [persist]);

  const setTracking = useCallback((value) => {
    storage.set(TRACKING_KEY, value);
    setTrackingState(value);
  }, []);

  // Objet stable tant que rien ne change : laisse fonctionner le memo des faces et des cartes.
  return useMemo(
    () => ({ owned, toggle, setAll, tracking, setTracking }),
    [owned, toggle, setAll, tracking, setTracking],
  );
}
