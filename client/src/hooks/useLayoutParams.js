import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Paramètres du parcours, synchronisés avec l'URL (query params) pour pouvoir partager un lien.
 * Seules les valeurs différentes des défauts sont écrites, pour garder des URL courtes.
 */
export const DEFAULTS = {
  setId: null,
  rows: 3,
  cols: 3,
  doubleSided: true,
  sortBy: 'number',
  variantMode: 'after-base',
  includedVariants: null, // null = toutes les variantes
  breakByGroup: false, // la coupure suit le critère de tri (breakBy = sortBy)
  reservedFaces: 0,
  startOnRight: false,
  binderId: null, // classeur sauvegardé en cours d'édition (compte connecté)
};

const URL_KEYS = {
  setId: 'set',
  rows: 'rows',
  cols: 'cols',
  doubleSided: 'duplex',
  sortBy: 'sort',
  variantMode: 'variants',
  includedVariants: 'only',
  breakByGroup: 'break',
  reservedFaces: 'reserved',
  startOnRight: 'right',
  binderId: 'binder',
};

const int = (v, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : undefined;
};
const bool = (v) => (v === '1' ? true : v === '0' ? false : undefined);

const parsers = {
  setId: (v) => v || undefined,
  rows: (v) => int(v, 1, 6),
  cols: (v) => int(v, 1, 6),
  doubleSided: bool,
  sortBy: (v) => v || undefined,
  variantMode: (v) => v || undefined,
  includedVariants: (v) => (v === '' ? [] : v.split(',').filter(Boolean)),
  breakByGroup: bool,
  reservedFaces: (v) => int(v, 0, 50),
  startOnRight: bool,
  binderId: (v) => int(v, 1, Number.MAX_SAFE_INTEGER),
};

const serialize = (value) => {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (Array.isArray(value)) return value.join(',');
  return String(value);
};

/** Applique un patch de paramètres à une query string (valeurs par défaut retirées). */
export function withParams(search, patch) {
  const next = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    const urlKey = URL_KEYS[key];
    if (!urlKey) continue; // ex. réglage d'un ancien classeur sauvegardé, retiré depuis
    if (value === null || value === undefined || value === DEFAULTS[key]) next.delete(urlKey);
    else next.set(urlKey, serialize(value));
  }
  return next;
}

export function useLayoutParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => {
    const result = { ...DEFAULTS };
    for (const [key, urlKey] of Object.entries(URL_KEYS)) {
      const raw = searchParams.get(urlKey);
      if (raw === null) continue;
      const parsed = parsers[key](raw);
      if (parsed !== undefined) result[key] = parsed;
    }
    return result;
  }, [searchParams]);

  const update = useCallback(
    (patch) => setSearchParams((prev) => withParams(prev, patch), { replace: true }),
    [setSearchParams],
  );

  return { params, update, search: searchParams.toString() };
}

/** La coupure par groupe suit le critère de tri, s'il fait partie des critères de coupure. */
export const canBreakBy = (sortBy, config) => config.breakOptions.includes(sortBy);

/** Réglages sauvegardés avec un classeur : tous les paramètres, sauf l'identifiant du classeur. */
export const binderParams = ({ binderId, ...params }) => params;

/** Deux jeux de réglages identiques ? (pour savoir si un classeur a des modifications) */
export const sameParams = (a, b) =>
  Object.keys(binderParams(DEFAULTS)).every(
    (key) => JSON.stringify(a[key] ?? DEFAULTS[key]) === JSON.stringify(b[key] ?? DEFAULTS[key]),
  );

/** Transforme les paramètres d'URL en body pour POST /api/layout. */
export function toLayoutRequest(params, config) {
  return {
    setId: params.setId,
    rows: params.rows,
    cols: params.cols,
    doubleSided: params.doubleSided,
    sortBy: params.sortBy,
    variantMode: params.variantMode,
    includedVariants: params.includedVariants ?? config.variantTypes,
    breakBy: params.breakByGroup && canBreakBy(params.sortBy, config) ? params.sortBy : null,
    reservedFaces: params.reservedFaces,
    startOnRight: params.startOnRight,
  };
}
