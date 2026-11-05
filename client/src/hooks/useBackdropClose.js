import { useRef } from 'react';

/**
 * Fermeture d'un <dialog> au clic sur le fond. Le clic doit commencer ET finir sur le fond :
 * une sélection de texte commencée dans un champ et relâchée dehors produit un « click » sur
 * le dialog, qui fermait la fenêtre en pleine saisie.
 */
export function useBackdropClose(close) {
  const pressedOnBackdrop = useRef(false);
  return {
    onPointerDown: (e) => {
      pressedOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e) => {
      if (pressedOnBackdrop.current && e.target === e.currentTarget) close();
      pressedOnBackdrop.current = false;
    },
  };
}
