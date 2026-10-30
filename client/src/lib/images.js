/** CDN des illustrations Riot : il redimensionne et convertit à la volée (?w=…&fm=webp). */
const RESIZABLE = 'cmsassets.rgpub.io';
// Paliers serrés : le navigateur reçoit une image presque à la taille de la case. Le CDN la
// réduit avec un filtre de qualité ; Chrome, lui, réduit en bilinéaire et crénèle le petit
// texte des cartes dès que l'écart dépasse ~15 % (Firefox s'en sort mieux).
const WIDTHS = [100, 120, 140, 160, 190, 220, 260, 300, 360, 420, 500, 600, 744];

const resized = (url, width) => {
  const u = new URL(url);
  u.searchParams.set('w', width);
  u.searchParams.set('fm', 'webp');
  return u.href;
};

/**
 * Attributs d'une illustration de carte : le navigateur choisit la largeur adaptée à la case
 * (`sizes`) au lieu de réduire 7 fois une image de 744 px, ce qui la rendait crénelée,
 * et télécharge ~25 Ko de WebP au lieu de ~700 Ko de PNG.
 * `sizes="auto"` (images lazy) laisse le navigateur mesurer la case lui-même.
 */
export function cardImage(url, { sizes = 'auto, 240px' } = {}) {
  if (!url) return {};
  if (URL.parse(url)?.host !== RESIZABLE) return { src: url };
  return {
    src: resized(url, 480),
    srcSet: WIDTHS.map((w) => `${resized(url, w)} ${w}w`).join(', '),
    sizes,
  };
}
