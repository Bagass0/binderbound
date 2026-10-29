import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { TypeIcon } from '../icons/Icons.jsx';
import { domainStyle, isVariant, localizedName, padNumber } from '../../lib/format.js';
import styles from './CardFrame.module.css';

/**
 * Case occupée : cadre de carte stylisé (pas d'artwork officiel).
 * `onClick(card)` rend la carte cliquable (mode collection).
 */
export const CardFrame = memo(function CardFrame({ card, missing, highlight, onClick }) {
  const { t, i18n } = useTranslation();
  const name = localizedName(card, i18n.language);
  const variant = isVariant(card);

  const label = [
    `#${padNumber(card.number)} ${name}`,
    t(`domain.${card.domain}`),
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
      className={`${styles.card} ${missing ? styles.missing : ''} ${highlight ? styles.highlight : ''}`}
      style={{
        ...domainStyle(card.domain),
        '--rarity': `var(--rarity-${card.rarity})`,
      }}
      title={label}
      aria-label={label}
      aria-pressed={interactive ? !missing : undefined}
      onClick={interactive ? () => onClick(card) : undefined}
    >
      <span className={styles.top}>
        <span className={styles.number}>{padNumber(card.number)}</span>
        <span className={styles.gem} aria-hidden />
      </span>
      <span className={styles.art} aria-hidden>
        <TypeIcon type={card.type} />
      </span>
      <span className={styles.name}>{name}</span>
      {variant && <span className={styles.badge}>{t(`variantShort.${card.variant}`)}</span>}
    </Tag>
  );
});
