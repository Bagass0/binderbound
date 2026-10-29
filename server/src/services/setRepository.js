import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { setSchema } from '../schemas/set.schema.js';
import { countCards } from '../layout/countCards.js';

export const SETS_DIR = path.resolve(import.meta.dirname, '../../data/sets');

/**
 * Charge et valide tous les sets du dossier. Un fichier invalide est ignoré
 * (avec un message) pour ne pas bloquer le démarrage du serveur.
 */
export async function loadSets(dir = SETS_DIR) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  const sets = new Map();
  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(dir, file), 'utf8'));
    const result = setSchema.safeParse(raw);
    if (!result.success) {
      console.warn(`[sets] ${file} ignoré :\n${z.prettifyError(result.error)}`);
      continue;
    }
    sets.set(result.data.id, result.data);
  }
  return sets;
}

/** Métadonnées d'un set pour la liste (sans les cartes). */
export const toSummary = ({ cards, ...meta }) => ({ ...meta, counts: countCards(cards) });

export function createSetRepository(sets) {
  // Les sets ne changent pas après le chargement : la liste est calculée une seule fois.
  const summaries = [...sets.values()]
    .map(toSummary)
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  return {
    list: () => summaries,
    get: (id) => sets.get(id) ?? null,
  };
}
