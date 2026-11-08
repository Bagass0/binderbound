/** Courbe d'animation de la charte (identique au token CSS --ease-out). */
export const EASE_OUT = [0.22, 1, 0.36, 1];

/**
 * Apparition en cascade d'une grille de cartes (sets, classeurs, collection) : discrète,
 * un léger fondu qui monte de quelques pixels. `listMotion` va sur la liste, `itemMotion`
 * sur chaque élément (variants « hidden » / « show »).
 */
export const listMotion = { show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } };
export const itemMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};
