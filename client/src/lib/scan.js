/**
 * Reconnaissance d'une carte photographiée. Le serveur fournit les empreintes du set et leurs
 * paramètres (server/src/import/fingerprint.js) : la zone de l'illustration est réduite à une
 * mosaïque `grid` × `grid`, puis comparée aux empreintes. Chaque canal est normalisé (moyenne 0,
 * écart-type 1) : l'éclairage et la balance des blancs de la caméra comptent peu, seuls les
 * motifs de l'illustration restent.
 */

/** Ratio d'une carte (63 × 88 mm, tokens --card-w / --card-h), pour le cadre de visée. */
export const CARD_RATIO = 63 / 88;

/** Score minimal pour accepter une carte sans confirmation (1 = identique). */
export const CONFIDENT = 0.6;

function normalize(bytes) {
  const v = Float32Array.from(bytes);
  for (let c = 0; c < 3; c++) {
    let mean = 0;
    for (let i = c; i < v.length; i += 3) mean += v[i];
    mean /= v.length / 3;
    let variance = 0;
    for (let i = c; i < v.length; i += 3) variance += (v[i] - mean) ** 2;
    const sd = Math.sqrt(variance / (v.length / 3)) || 1;
    for (let i = c; i < v.length; i += 3) v[i] = (v[i] - mean) / sd;
  }
  return v;
}

const decode = (base64) => normalize(Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0)));

/** Corrélation de deux empreintes normalisées. */
function similarity(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum / a.length;
}

/** Moyenne par blocs d'une image RVBA `size` × `size` → empreinte normalisée `grid` × `grid`. */
function mosaic(rgba, size, grid) {
  const block = size / grid;
  const out = new Uint8Array(grid * grid * 3);
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let y = gy * block; y < (gy + 1) * block; y++) {
        for (let x = gx * block; x < (gx + 1) * block; x++) {
          const i = (y * size + x) * 4;
          r += rgba[i];
          g += rgba[i + 1];
          b += rgba[i + 2];
        }
      }
      const n = block * block;
      out.set([r / n, g / n, b / n], (gy * grid + gx) * 3);
    }
  }
  return normalize(out);
}

function canvas(width, height) {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  const ctx = el.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  return { el, ctx };
}

/**
 * Rectangle d'une carte centrée dans une image `width` × `height` : haute de `fill` de l'image,
 * sans dépasser `maxWidth` de sa largeur. Mêmes proportions que le cadre de visée affiché.
 */
export function guideRect(width, height, { fill = 0.8, maxWidth = 0.9 } = {}) {
  let h = height * fill;
  let w = h * CARD_RATIO;
  if (w > width * maxWidth) {
    w = width * maxWidth;
    h = w / CARD_RATIO;
  }
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}

/**
 * Prépare la recherche dans un set à partir de la réponse de /fingerprints
 * ({ grid, sample, artZone, cards: { [cardId]: base64 } }).
 * - `sample(source, rect)` : empreintes de la carte visée (rectangle en pixels de `source`) ;
 * - `match(samples)` : cartes classées de la plus ressemblante à la moins ressemblante.
 * Les canevas de travail sont créés une fois : le scan en continu n'alloue rien à chaque image.
 */
export function createMatcher({ grid, sample: size, artZone, cards: fingerprints }, cards) {
  const refs = cards
    .filter((card) => fingerprints[card.id])
    .map((card) => ({ card, vector: decode(fingerprints[card.id]) }));
  const hasLandscape = refs.some((r) => r.card.orientation === 'landscape');

  // La carte seule, redressée à une taille fixe (4 px par mm), et l'illustration réduite.
  const portrait = canvas(252, 352);
  const turned = hasLandscape && canvas(352, 252);
  const out = canvas(size, size);
  const read = ({ el }, [zx, zy, zw, zh]) => {
    out.ctx.drawImage(
      el,
      zx * el.width,
      zy * el.height,
      zw * el.width,
      zh * el.height,
      0,
      0,
      size,
      size,
    );
    return mosaic(out.ctx.getImageData(0, 0, size, size).data, size, grid);
  };

  return {
    size: refs.length,

    /**
     * Une carte de paysage (champ de bataille) se tient de travers dans le cadre portrait : on
     * l'échantillonne aussi tournée d'un quart de tour, dans les deux sens, si le set en a.
     */
    sample(source, rect) {
      portrait.ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, 252, 352);
      const samples = { portrait: [read(portrait, artZone.portrait)] };
      if (turned) {
        samples.landscape = [Math.PI / 2, -Math.PI / 2].map((angle) => {
          turned.ctx.setTransform(1, 0, 0, 1, 176, 126);
          turned.ctx.rotate(angle);
          turned.ctx.drawImage(portrait.el, -126, -176);
          return read(turned, artZone.landscape);
        });
      }
      return samples;
    },

    match(samples, limit = 6) {
      return refs
        .map(({ card, vector }) => {
          let score = -Infinity;
          for (const s of samples[card.orientation] ?? samples.portrait)
            score = Math.max(score, similarity(s, vector));
          return { card, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
  };
}
