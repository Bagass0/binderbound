import { layoutOptionsSchema } from '../schemas/layout.schema.js';
import { sortCards } from './sortCards.js';
import { faceToSheet, isRightFace, slotToCell } from './positions.js';
import { countCards } from './countCards.js';

/**
 * Calcule l'emplacement de chaque carte dans le classeur.
 * Fonction pure : aucune dépendance à Express ni au système de fichiers.
 *
 * @param {Array} cards  cartes du set (schéma set.schema.js)
 * @param {object} rawOptions  options partielles, complétées par les valeurs par défaut
 * @returns {{ summary: object, faces: Array, index: Record<string, object> }}
 */
export function computeLayout(cards, rawOptions = {}) {
  const options = layoutOptionsSchema.parse(rawOptions);
  const { rows, cols, doubleSided, reservedFaces, startOnRight, maxPages } = options;

  // 1. Filtrage : les cartes de base sont toujours gardées, les variantes selon la liste.
  const included = new Set(options.includedVariants);
  const filtered = cards.filter((c) => c.variant === 'base' || included.has(c.variant));

  // 2. Tri + position des variantes.
  const ordered = sortCards(filtered, options);

  // 3. Taille d'une face.
  const slotsPerFace = rows * cols;

  // 4. Décalage initial. « Commencer à droite » ajoute une face si la première face libre
  //    tombe sur une page de gauche (verso).
  let firstFace = reservedFaces;
  if (startOnRight && !isRightFace(firstFace, doubleSided)) firstFace += 1;

  // 5–6. Placement séquentiel, avec saut en début de face à chaque changement de groupe.
  const placements = [];
  let cursor = firstFace * slotsPerFace;
  let previous;
  ordered.forEach((entry, i) => {
    const groupChanged =
      options.breakBy &&
      i > 0 &&
      (entry.section !== previous.section || entry.group !== previous.group);
    if (groupChanged && cursor % slotsPerFace !== 0) {
      cursor = Math.ceil(cursor / slotsPerFace) * slotsPerFace;
    }
    previous = entry;
    placements.push({
      card: entry.card,
      faceIndex: Math.floor(cursor / slotsPerFace),
      slot: cursor % slotsPerFace,
    });
    cursor += 1;
  });

  // 7. Construction des faces (y compris réservées / sautées) et de l'index.
  const faceCount = placements.length ? placements.at(-1).faceIndex + 1 : firstFace;
  const faces = Array.from({ length: faceCount }, (_, faceIndex) => ({
    faceIndex,
    ...faceToSheet(faceIndex, doubleSided),
    reserved: faceIndex < firstFace,
    slots: Array.from({ length: slotsPerFace }, (_, s) => ({ ...slotToCell(s, cols), card: null })),
  }));

  const index = {};
  for (const { card, faceIndex, slot } of placements) {
    faces[faceIndex].slots[slot].card = card;
    index[card.id] = {
      faceIndex,
      ...faceToSheet(faceIndex, doubleSided),
      ...slotToCell(slot, cols),
    };
  }

  // Résumé.
  const sheetsUsed = faceCount ? faceToSheet(faceCount - 1, doubleSided).sheet : 0;
  const cardFaces = Math.max(faceCount - firstFace, 0);
  const counts = countCards(placements.map((p) => p.card));
  const summary = {
    totalCards: counts.total,
    baseCards: counts.base,
    variantCards: counts.variants,
    slotsPerFace,
    facesUsed: faceCount,
    cardFaces,
    sheetsUsed,
    emptySlots: cardFaces * slotsPerFace - placements.length,
    skippedFaces: firstFace,
    maxPages,
    fits: maxPages === null || sheetsUsed <= maxPages,
    overflowSheets: maxPages === null ? 0 : Math.max(sheetsUsed - maxPages, 0),
  };

  return { summary, faces, index, options };
}
