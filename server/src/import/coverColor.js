import { inflateSync } from 'node:zlib';

const SAMPLE = 8; // côté de la vignette analysée, en pixels

/**
 * Couleur dominante d'une illustration, pour teinter le classeur d'un set.
 * Le CDN d'images (Sanity) sait recadrer et réduire : on lui demande le cœur de l'illustration
 * en vignette de 8×8, dont on garde la teinte vive
 * la plus présente — une simple moyenne donnerait un brun terne pour presque tous les sets.
 */
export async function coverColor(imageUrl, { signal } = {}) {
  if (!imageUrl) return null;
  const url = new URL(imageUrl);
  const size = url.pathname.match(/-(\d+)x(\d+)\.\w+$/);
  if (size) {
    // Cœur de l'illustration : sans le cadre doré, les icônes de coût ni le texte de la carte.
    const [w, h] = [Number(size[1]), Number(size[2])];
    const rect = [0.15 * w, 0.1 * h, 0.7 * w, 0.42 * h].map(Math.round);
    url.searchParams.set('rect', rect.join(','));
  }
  for (const [key, value] of Object.entries({ w: SAMPLE, h: SAMPLE, fit: 'crop', fm: 'png' }))
    url.searchParams.set(key, value);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Couleur de ${imageUrl} → HTTP ${res.status}`);
  return dominantColor(decodePng(Buffer.from(await res.arrayBuffer())));
}

const hex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mean = (pixels) =>
  [0, 1, 2].map((i) => pixels.reduce((sum, p) => sum + p[i], 0) / pixels.length);

/** Teinte vive la plus présente (pondérée par la saturation), à défaut la moyenne. */
export function dominantColor(pixels) {
  const bins = new Map();
  for (const [r, g, b] of pixels) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max ? (max - min) / max : 0;
    if (saturation < 0.2 || max < 40) continue; // gris, blancs et ombres ne comptent pas
    const d = max - min;
    const hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const bin = Math.floor(hue * 2) % 12; // 12 secteurs de 30°
    const entry = bins.get(bin) ?? { weight: 0, pixels: [] };
    entry.weight += saturation ** 2 * (max / 255); // les teintes franches l'emportent
    entry.pixels.push([r, g, b]);
    bins.set(bin, entry);
  }
  const best = [...bins.values()].sort((a, b) => b.weight - a.weight)[0];
  return hex(mean(best ? best.pixels : pixels));
}

/** Pixels [r, v, b] d'un PNG 8 bits RVB ou RVBA non entrelacé (vignettes du CDN). */
export function decodePng(png) {
  let offset = 8; // signature PNG
  let header;
  const data = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        depth: body[8],
        colorType: body[9],
        interlace: body[12],
      };
    } else if (type === 'IDAT') data.push(body);
    offset += 12 + length;
  }
  if (!header || header.depth !== 8 || ![2, 6].includes(header.colorType) || header.interlace)
    throw new Error('PNG attendu : 8 bits, RVB ou RVBA, non entrelacé');

  const { width, height } = header;
  const bpp = header.colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(data));
  const out = Buffer.alloc(stride * height);
  // Annule le filtre PNG de chaque ligne (None, Sub, Up, Average, Paeth).
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a;
      else if (filter === 2) predictor = b;
      else if (filter === 3) predictor = Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = (value + predictor) & 0xff;
    }
  }
  const pixels = [];
  for (let i = 0; i < out.length; i += bpp) pixels.push([out[i], out[i + 1], out[i + 2]]);
  return pixels;
}
