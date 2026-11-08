import { useTranslation } from 'react-i18next';
import { cardPrice, formatPrice } from '../../lib/format.js';

/** Prix de marché d'une carte (« 2,26 $ », ou « 37,69 $ foil »), ou `fallback` si inconnu. */
export function PriceTag({ prices, card, fallback = null, className }) {
  const { t, i18n } = useTranslation();
  const price = cardPrice(prices, card);
  if (!price) return fallback;
  return (
    <span className={className}>
      {formatPrice(price.value, prices.currency, i18n.language)}
      {price.foil && ` ${t('price.foil')}`}
    </span>
  );
}

/** Mention de la source des prix, avec la date de mise à jour. */
export function PriceSource({ prices }) {
  const { t, i18n } = useTranslation();
  if (!prices) return null;
  const date = new Date(prices.updatedAt).toLocaleDateString(i18n.language);
  return t('price.source', { source: prices.source.name, date });
}
