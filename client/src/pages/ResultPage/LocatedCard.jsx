import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { EASE_OUT } from '../../lib/motion.js';
import { cardNumber, localizedName } from '../../lib/format.js';
import { cardImage } from '../../lib/images.js';
import { PlacementGuide } from '../../components/binder/PlacementGuide.jsx';
import { PriceTag } from '../../components/common/PriceTag.jsx';
import { Button } from '../../components/ui/Button.jsx';
import styles from './LocatedCard.module.css';

/** Encart « Où ranger cette carte », affiché après une recherche par nom ou numéro. */
export function LocatedCard({ card, layout, prices, onDismiss }) {
  const { t, i18n } = useTranslation();
  return (
    <motion.section
      className={styles.located}
      aria-live="polite"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
    >
      {card.imageUrl && (
        <img
          className={styles.thumb}
          {...cardImage(card.imageUrl, { sizes: '4rem' })}
          alt=""
          decoding="async"
        />
      )}
      <div className={styles.card}>
        <span className={styles.eyebrow}>{t('search.located')}</span>
        <strong>
          #{cardNumber(card)} {localizedName(card, i18n.language)}
        </strong>
        <PriceTag prices={prices} card={card} className={styles.price} />
      </div>
      <div className={styles.guide}>
        <PlacementGuide layout={layout} card={card} />
      </div>
      <Button variant="ghost" size="sm" className={styles.dismiss} onClick={onDismiss}>
        {t('search.dismiss')}
      </Button>
    </motion.section>
  );
}
