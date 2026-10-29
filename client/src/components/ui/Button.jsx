import { motion } from 'motion/react';
import styles from './Button.module.css';

/**
 * Bouton « éclat ». variant : primary (laiton), secondary (contour), ghost (texte).
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
      {...props}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children && <span>{children}</span>}
    </motion.button>
  );
}
