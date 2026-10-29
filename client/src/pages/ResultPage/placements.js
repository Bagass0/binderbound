/** Liste à plat des cartes placées, dans l'ordre du classeur. */
export function toPlacements(layout) {
  return layout.faces.flatMap((face) =>
    face.slots
      .filter((slot) => slot.card)
      .map((slot) => ({ card: slot.card, ...layout.index[slot.card.id] })),
  );
}
