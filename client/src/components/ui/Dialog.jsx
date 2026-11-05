import { useEffect, useRef } from 'react';
import { useBackdropClose } from '../../hooks/useBackdropClose.js';
import styles from './Dialog.module.css';

/**
 * Boîte de dialogue modale (dialog natif : focus, Échap et fond gérés par le navigateur).
 * Contrôlée par `open` ; `onClose` est appelé quelle que soit la façon de fermer.
 */
export function Dialog({ open, onClose, title, children }) {
  const ref = useRef(null);
  const backdrop = useBackdropClose(() => ref.current.close());

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-label={title} onClose={onClose} {...backdrop}>
      {open && (
        <div className={styles.content}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {children}
        </div>
      )}
    </dialog>
  );
}
