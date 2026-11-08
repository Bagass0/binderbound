import { decodePng } from './coverColor.js';

/**
 * Empreinte visuelle d'une carte, pour le scan : l'illustration est réduite à une mosaïque de
 * GRID × GRID couleurs moyennes. Le client (client/src/lib/scan.js) reçoit ces paramètres avec
 * les empreintes, calcule la même mosaïque sur la photo et cherche la carte la plus proche.
 */
export const GRID = 12;
/** Côté de la vignette demandée au CDN, moyennée ensuite par blocs de SAMPLE / GRID. */
const SAMPLE = 96;

/**
 * Zone de l'illustration (fractions x, y, largeur, hauteur de la carte), sans les icônes de
 * coût ni le texte : c'est la partie qui distingue le mieux deux cartes.
 */
const ART_ZONE = {
  portrait: [0.08, 0.12, 0.84, 0.36],
  landscape: [0.08, 0.1, 0.84, 0.55],
};

/** Paramètres envoyés au client avec les empreintes (GET /api/sets/:id/fingerprints). */
export const FINGERPRINT_PARAMS = { grid: GRID, sample: SAMPLE, artZone: ART_ZONE };

/** Moyenne par blocs d'une image carrée `size` × `size` ([r, v, b] par pixel) → GRID × GRID. */
export function mosaic(pixels, size = SAMPLE) {
  const block = size / GRID;
  const out = new Uint8Array(GRID * GRID * 3);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const sum = [0, 0, 0];
      for (let y = gy * block; y < (gy + 1) * block; y++) {
        for (let x = gx * block; x < (gx + 1) * block; x++) {
          const p = pixels[y * size + x];
          sum[0] += p[0];
          sum[1] += p[1];
          sum[2] += p[2];
        }
      }
      const i = (gy * GRID + gx) * 3;
      for (let c = 0; c < 3; c++) out[i + c] = Math.round(sum[c] / (block * block));
    }
  }
  return out;
}

/** URL de la vignette de l'illustration : le CDN recadre et étire la zone en SAMPLE × SAMPLE. */
export function artThumbnailUrl(imageUrl, orientation = 'portrait') {
  const url = new URL(imageUrl);
  const size = url.pathname.match(/-(\d+)x(\d+)\.\w+$/);
  if (!size) return null;
  const [w, h] = [Number(size[1]), Number(size[2])];
  const [x, y, rw, rh] = ART_ZONE[orientation] ?? ART_ZONE.portrait;
  url.searchParams.set('rect', [x * w, y * h, rw * w, rh * h].map(Math.round).join(','));
  for (const [key, value] of Object.entries({ w: SAMPLE, h: SAMPLE, fit: 'scale', fm: 'png' }))
    url.searchParams.set(key, value);
  return url.href;
}

/** Empreinte (base64) d'une carte, ou null si son image n'est pas sur le CDN redimensionnable. */
export async function fingerprint(card, { signal } = {}) {
  const url = card.imageUrl && artThumbnailUrl(card.imageUrl, card.orientation);
  if (!url) return null;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Empreinte de ${card.id} → HTTP ${res.status}`);
  const pixels = decodePng(Buffer.from(await res.arrayBuffer()));
  return Buffer.from(mosaic(pixels)).toString('base64');
}

/** Empreintes de toutes les cartes d'un set ({ [cardId]: base64 }), quelques requêtes à la fois. */
export async function fingerprintSet(cards, { concurrency = 8, onError = console.warn } = {}) {
  const result = {};
  const queue = [...cards];
  const worker = async () => {
    for (let card = queue.shift(); card; card = queue.shift()) {
      try {
        const fp = await fingerprint(card);
        if (fp) result[card.id] = fp;
      } catch (err) {
        onError(err.message);
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  // Ordre du set, pour des fichiers stables d'une synchronisation à l'autre.
  return Object.fromEntries(cards.filter((c) => result[c.id]).map((c) => [c.id, result[c.id]]));
}
