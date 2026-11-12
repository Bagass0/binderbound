import { useTranslation } from 'react-i18next';
import { cardPrice, formatPrice } from '../../lib/format.js';
import styles from './PriceTag.module.css';

/** Prix converti d'une autre devise (TCGplayer en euros) : une estimation, marquée « ≈ ». */
const isEstimate = (prices, card) =>
  prices.currency === 'EUR' && prices.prices[card.id]?.src === 'tcgplayer';

/** Prix de marché d'une carte (« 2,26 € », ou « 37,69 € foil »), ou `fallback` si inconnu. */
export function PriceTag({ prices, card, fallback = null, className }) {
  const { t, i18n } = useTranslation();
  const price = cardPrice(prices, card);
  if (!price) return fallback;
  const estimate = isEstimate(prices, card);
  return (
    <span className={className} title={estimate ? t('price.estimate') : undefined}>
      {estimate && '≈ '}
      {formatPrice(price.value, prices.currency, i18n.language)}
      {price.foil && ` ${t('price.foil')}`}
    </span>
  );
}

/**
 * Explication des prix : ce sont des moyennes indicatives, avec leur source et leur date.
 * `prices` : réponse de /api/sets/:id/prices (n'importe quel set : la source est la même).
 */
export function PriceNote({ prices }) {
  const { t, i18n } = useTranslation();
  if (!prices) return null;
  const date = new Date(prices.updatedAt).toLocaleDateString(i18n.language);
  const ids = (prices.sources ?? [prices.source]).map((s) => s.id);
  const source = ids.includes('cardnexus')
    ? ids.includes('tcgplayer')
      ? 'mixed'
      : 'cardnexus'
    : prices.currency === 'EUR'
      ? 'tcgplayer'
      : 'tcgplayerUsd';
  return (
    <p className={styles.note}>
      <strong>{t('price.noteTitle')}</strong> {t(`price.note.${source}`)} {t('price.noteVaries')}{' '}
      {t('price.updated', { date })}
    </p>
  );
}
