import { motion } from 'motion/react';
import { gridStyle } from '../../lib/format.js';
import styles from './GridPreview.module.css';

/**
 * Aperçu schématique d'une face (rows × cols). Les cases s'animent quand la grille change.
 * `cells` optionnel : tableau de 'base' | 'variant' | 'empty' pour colorer les cases.
 */
export function GridPreview({ rows, cols, size = 'md', cells, active }) {
  const count = rows * cols;
  return (
    <div
      className={`${styles.grid} ${styles[size]} ${active ? styles.active : ''}`}
      style={gridStyle(rows, cols)}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          layout
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 28,
            delay: size === 'lg' ? i * 0.015 : 0,
          }}
          className={`${styles.cell} ${cells ? styles[cells[i] ?? 'empty'] : ''}`}
        />
      ))}
    </div>
  );
}
