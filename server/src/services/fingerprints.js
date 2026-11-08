import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fingerprintSet } from '../import/fingerprint.js';

/** Empreintes visuelles des cartes (scan), un fichier par set : { [cardId]: base64 }. */
export const FINGERPRINTS_DIR = path.resolve(import.meta.dirname, '../../data/fingerprints');

/** Calcule et écrit les empreintes d'un set ; renvoie le nombre de cartes couvertes. */
export async function writeFingerprints(set, dir = FINGERPRINTS_DIR) {
  const fingerprints = await fingerprintSet(set.cards, {
    onError: (message) => console.warn(`  ⚠ ${message}`),
  });
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${set.id}.json`), JSON.stringify(fingerprints) + '\n');
  return Object.keys(fingerprints).length;
}

/**
 * Lecture des empreintes, à la demande (seul le scan en a besoin) puis gardées en mémoire.
 * Un set sans fichier renvoie null : le scan n'est alors pas proposé pour ce set.
 */
export function createFingerprintStore(dir = FINGERPRINTS_DIR) {
  const cache = new Map();
  return {
    get(setId) {
      if (!cache.has(setId)) {
        cache.set(
          setId,
          readFile(path.join(dir, `${setId}.json`), 'utf8').then(JSON.parse, (err) => {
            if (err.code === 'ENOENT') return null;
            cache.delete(setId);
            throw err;
          }),
        );
      }
      return cache.get(setId);
    },
  };
}
