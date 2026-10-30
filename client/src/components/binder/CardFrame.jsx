import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TypeIcon } from '../icons/Icons.jsx';
import { cardImage } from '../../lib/images.js';
import { domainLabel, domainStyle, isVariant, localizedName, padNumber } from '../../lib/format.js';
import styles from './CardFrame.module.css';

/**
 * Case occupée : illustration officielle de la carte (CDN Riot), ou cadre stylisé si elle
 * est absente ou ne charge pas. `onClick(card)` rend la carte cliquable ; `pressed` indique
 * l'état « possédée » en mode collection.
 */
export const CardFrame = memo(function CardFrame({ card, missing, pressed, highlight, onClick }) {
  const { t, i18n } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(card.imageUrl) && !imageFailed;
  const name = localizedName(card, i18n.language);
  const variant = isVariant(card);

  const label = [
    `#${padNumber(card.number)} ${name}`,
    domainLabel(t, card),
    t(`rarity.${card.rarity}`),
    variant && t(`variant.${card.variant}`),
    missing && t('collection.missing'),
  ]
    .filter(Boolean)
    .join(' · ');

  const interactive = Boolean(onClick);
  const Tag = interactive ? 'button' : 'div';
  return (
    <Tag
      type={interactive ? 'button' : undefined}
      className={[
        styles.card,
        showImage && styles.illustrated,
        card.orientation === 'landscape' && styles.landscape,
        missing && styles.missing,
        highlight && styles.highlight,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...domainStyle(card),
        '--rarity': `var(--rarity-${card.rarity})`,
      }}
      title={label}
      aria-label={label}
      aria-pressed={interactive ? pressed : undefined}
      onClick={interactive ? () => onClick(card) : undefined}
    >
      {showImage ? (
        <img
          className={styles.image}
          {...cardImage(card.imageUrl)}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <>
          <span className={styles.top}>
            <span className={styles.number}>{padNumber(card.number)}</span>
            <span className={styles.gem} aria-hidden />
          </span>
          <span className={styles.art} aria-hidden>
            <TypeIcon type={card.type} />
          </span>
          <span className={styles.name}>{name}</span>
        </>
      )}
      {variant && <span className={styles.badge}>{t(`variantShort.${card.variant}`)}</span>}
    </Tag>
  );
});
