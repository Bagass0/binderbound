import { motion } from 'motion/react';
import styles from './PageHeading.module.css';

export function PageHeading({ eyebrow, title, children }) {
  return (
    <motion.header
      className={styles.heading}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
    >
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <h1 className="accent-text">{title}</h1>
      {children && <p className={styles.lead}>{children}</p>}
    </motion.header>
  );
}
