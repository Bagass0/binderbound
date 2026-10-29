import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import styles from './StatusMessage.module.css';

/** Chargement (rune qui tourne) ou erreur. */
export function Loading({ label }) {
  const { t } = useTranslation();
  return (
    <div className={styles.status} role="status">
      <motion.span
        className={styles.rune}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
      />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

export function ErrorMessage({ error }) {
  const { t } = useTranslation();
  return (
    <div className={`${styles.status} ${styles.error}`} role="alert">
      <strong>{t('common.error')}</strong>
      <span>{error?.message}</span>
    </div>
  );
}
