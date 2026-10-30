import { useTranslation } from 'react-i18next';
import { AnimatedNumber } from './AnimatedNumber.jsx';
import styles from './LiveEstimate.module.css';

/** Estimation en direct du résultat, affichée dans la barre d'actions. */
export function LiveEstimate({ layout }) {
  const { t } = useTranslation();
  if (!layout) return null;
  const { summary } = layout;
  return (
    <div className={styles.estimate} aria-live="polite">
      <span>
        <AnimatedNumber value={summary.totalCards} className={styles.value} />{' '}
        {t('summary.cards', { count: summary.totalCards })}
      </span>
      <span className={styles.sep} aria-hidden />
      <span>
        <AnimatedNumber value={summary.cardFaces} className={styles.value} />{' '}
        {t('summary.faces', { count: summary.cardFaces })}
      </span>
      <span className={styles.sep} aria-hidden />
      <span>
        <AnimatedNumber value={summary.sheetsUsed} className={styles.value} />{' '}
        {t('summary.sheets', { count: summary.sheetsUsed })}
      </span>
    </div>
  );
}
