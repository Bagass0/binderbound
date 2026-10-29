import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Warning } from '../../components/icons/Icons.jsx';
import styles from './Summary.module.css';

export function Summary({ summary }) {
  const { t } = useTranslation();
  const tiles = [
    {
      key: 'cards',
      value: summary.totalCards,
      label: t('summary.cards', { count: summary.totalCards }),
      hint: t('summary.cardsHint', { base: summary.baseCards, variants: summary.variantCards }),
    },
    {
      key: 'faces',
      value: summary.cardFaces,
      label: t('summary.faces', { count: summary.cardFaces }),
      hint: summary.skippedFaces
        ? t('summary.skippedHint', { count: summary.skippedFaces })
        : t('summary.slotsPerFace', { count: summary.slotsPerFace }),
    },
    {
      key: 'sheets',
      value: summary.sheetsUsed,
      label: t('summary.sheets', { count: summary.sheetsUsed }),
      hint: summary.maxPages ? t('summary.maxHint', { max: summary.maxPages }) : t('summary.noMax'),
    },
    {
      key: 'empty',
      value: summary.emptySlots,
      label: t('summary.empty', { count: summary.emptySlots }),
      hint: t('summary.emptyHint'),
    },
  ];

  return (
    <>
      <motion.ul
        className={styles.tiles}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      >
        {tiles.map((tile) => (
          <motion.li
            key={tile.key}
            className={styles.tile}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          >
            <span className={styles.value}>{tile.value}</span>
            <span className={styles.label}>{tile.label}</span>
            <span className={styles.hint}>{tile.hint}</span>
          </motion.li>
        ))}
      </motion.ul>
      {!summary.fits && (
        <motion.div
          className={styles.warning}
          role="alert"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Warning />
          <span>
            {t('summary.overflow', {
              count: summary.overflowSheets,
              used: summary.sheetsUsed,
              max: summary.maxPages,
            })}
          </span>
        </motion.div>
      )}
    </>
  );
}
