/**
 * Doubles pages d'un classeur ouvert.
 * Recto-verso : la face 0 (recto du feuillet 1) est seule à droite, puis chaque double page
 * montre le verso d'un feuillet à gauche et le recto du suivant à droite.
 * Simple face : chaque double page montre une face à droite (le dos du feuillet précédent est vide).
 */
export function spreadCount(faceCount, doubleSided) {
  if (faceCount === 0) return 1;
  return doubleSided ? Math.floor(faceCount / 2) + 1 : faceCount;
}

export function spreadFaces(spread, faceCount, doubleSided) {
  if (!doubleSided) return { left: null, right: spread < faceCount ? spread : null };
  const left = spread === 0 ? null : 2 * spread - 1;
  const right = 2 * spread < faceCount ? 2 * spread : null;
  return { left, right };
}

export const faceToSpread = (faceIndex, doubleSided) =>
  doubleSided ? Math.ceil(faceIndex / 2) : faceIndex;
