/**
 * Convertit un index de face (0-based) en page, feuillet (1-based) et côté. Les pages se
 * comptent comme dans un livre : feuillet 1 recto = page 1, feuillet 1 verso = page 2…
 */
export function faceToSheet(faceIndex, doubleSided) {
  const page = faceIndex + 1;
  if (!doubleSided) return { page, sheet: page, side: 'recto' };
  return {
    page,
    sheet: Math.floor(faceIndex / 2) + 1,
    side: faceIndex % 2 === 0 ? 'recto' : 'verso',
  };
}

/**
 * Une face est « à droite » quand le classeur est ouvert : en recto-verso ce sont les rectos
 * (faces paires), en simple face toutes les faces le sont.
 */
export const isRightFace = (faceIndex, doubleSided) => !doubleSided || faceIndex % 2 === 0;

/** Convertit une position linéaire dans la face (0-based) en ligne / colonne (1-based). */
export function slotToCell(slotIndex, cols) {
  return { row: Math.floor(slotIndex / cols) + 1, col: (slotIndex % cols) + 1 };
}
