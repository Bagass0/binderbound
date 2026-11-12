import { useTranslation } from 'react-i18next';
import { cardPrice, formatPrice, localizedName } from '../../lib/format.js';
import { CardFrame } from '../binder/CardFrame.jsx';
import { PriceTag } from '../common/PriceTag.jsx';
import styles from './TradeCards.module.css';

/** Valeur totale d'une liste de cartes (cartes sans prix ignorées). */
const cardsValue = (prices, cards) =>
  cards.reduce((sum, c) => sum + (cardPrice(prices, c)?.value ?? 0), 0);

/** « 12,40 € » ou rien si les prix sont indisponibles. */
export function TotalValue({ prices, cards }) {
  const { i18n } = useTranslation();
  if (!prices || !cards.length) return null;
  return <span>{formatPrice(cardsValue(prices, cards), prices.currency, i18n.language)}</span>;
}

/**
 * Petite grille de cartes d'un échange. Avec `onToggle`, chaque carte se sélectionne ;
 * `tag(card)` ajoute une étiquette (« Lui manque »…), `unavailable` grise les cartes perdues.
 */
export function TradeCards({ cards, prices, selected, onToggle, tag, unavailable, empty }) {
  const { i18n } = useTranslation();
  if (!cards.length) return empty ? <p className={styles.empty}>{empty}</p> : null;
  return (
    <ul className={styles.grid}>
      {cards.map((card) => {
        const label = tag?.(card);
        const isSelected = selected?.has(card.id);
        return (
          <li
            key={card.id}
            className={`${styles.item} ${isSelected ? styles.selected : ''}`}
            title={localizedName(card, i18n.language)}
          >
            <div className={styles.slot}>
              <CardFrame
                card={card}
                missing={(onToggle && !isSelected) || unavailable?.has(card.id)}
                pressed={onToggle ? isSelected : undefined}
                onClick={onToggle ? () => onToggle(card.id) : undefined}
              />
              {label && <span className={styles.tag}>{label}</span>}
            </div>
            <PriceTag prices={prices} card={card} className={styles.price} />
          </li>
        );
      })}
    </ul>
  );
}
