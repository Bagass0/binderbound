/**
 * Visuels de boosters, par set (fichiers dans client/public/boosters/). La source des
 * données (Riftcodex) n'en fournit pas : ils sont ajoutés à la main. `color` est la teinte
 * de l'emballage, mesurée sur sa bande sertie, qui colore la couverture du classeur.
 * Un set sans booster garde sa carte phare et la couleur calculée à l'import.
 */
export const BOOSTERS = {
  ogn: { image: '/boosters/ogn.webp', color: '#252e4e' },
  sfd: { image: '/boosters/sfd.webp', color: '#d7c9b5' },
  unl: { image: '/boosters/unl.webp', color: '#9c317d' },
  ven: { image: '/boosters/ven.webp', color: '#751834' },
};
