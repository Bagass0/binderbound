import { useTranslation } from 'react-i18next';
import { cardPrice, formatPrice } from '../../lib/format.js';

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

/** Mention des sources des prix, avec la date de mise à jour. */
export function PriceSource({ prices }) {
  const { t, i18n } = useTranslation();
  if (!prices) return null;
  const date = new Date(prices.updatedAt).toLocaleDateString(i18n.language);
  const sources = prices.sources ?? [prices.source];
  const names = sources.map((s) => s.name).join(' + ');
  const converted = prices.currency === 'EUR' && sources.some((s) => s.id === 'tcgplayer');
  return (
    <>
      {t('price.source', { source: names, currency: prices.currency, date })}
      {converted && ` · ${t('price.converted')}`}
    </>
  );
}
