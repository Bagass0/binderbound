import { useEffect, useState } from 'react';

/**
 * Exécute `fn(signal)` à chaque changement de `key` (chaîne fournie par l'appelant, qui
 * résume tout ce dont `fn` dépend). Les réponses obsolètes sont annulées ; les données
 * précédentes restent disponibles pendant un nouveau chargement.
 */
export function useAsync(key, fn, { delay = 0 } = {}) {
  const [state, setState] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      Promise.resolve(fn(controller.signal))
        .then((data) => !controller.signal.aborted && setState({ key, data, error: null }))
        .catch((error) => {
          if (!controller.signal.aborted) setState((s) => ({ ...s, key, error }));
        });
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` est le contrat de dépendance
  }, [key]);

  return { data: state.data, error: state.error, loading: state.key !== key };
}
