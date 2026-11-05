import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const SUPPLEMENTS_DIR = path.resolve(import.meta.dirname, '../../data/supplements');

/** Cartes ajoutées à la main pour un set (data/supplements/<id>.json), ou aucune. */
export async function loadSupplement(setId, dir = SUPPLEMENTS_DIR) {
  try {
    const { cards } = JSON.parse(await readFile(path.join(dir, `${setId}.json`), 'utf8'));
    return cards;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Complète un set avec les cartes que la source n'a pas encore (ex. la rune alternative
 * VEN-R02a). Une carte déjà fournie par la source est ignorée : la source fait foi.
 */
export function applySupplement(set, extra) {
  const known = new Set(set.cards.map((c) => c.id));
  const added = extra.filter((c) => !known.has(c.id));
  return { set: { ...set, cards: [...set.cards, ...added] }, added };
}
