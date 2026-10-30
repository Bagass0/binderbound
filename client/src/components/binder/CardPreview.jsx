import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  domainLabel,
  domainStyle,
  formatPosition,
  isVariant,
  localizedName,
  padNumber,
} from '../../lib/format.js';
import { cardImage } from '../../lib/images.js';
import { Button } from '../ui/Button.jsx';
import styles from './CardPreview.module.css';

/**
 * Aperçu d'une carte en grand (dialog natif : focus, Échap et fond gérés par le navigateur).
 * `card` null = fermé.
 */
export function CardPreview({ card, position, setCode, collection, onClose }) {
  const { t, i18n } = useTranslation();
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (card && !dialog.open) dialog.showModal();
    if (!card && dialog.open) dialog.close();
  }, [card]);

  const owned = card && collection.owned.has(card.id);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={card ? localizedName(card, i18n.language) : undefined}
      onClose={onClose}
      // Clic sur le fond (en dehors du contenu) : fermeture.
      onClick={(e) => e.target === e.currentTarget && dialogRef.current.close()}
    >
      {card && (
        <div className={styles.content} style={domainStyle(card)}>
          <div className={`${styles.visual} ${styles[card.orientation]}`}>
            {card.imageUrl ? (
              <img
                {...cardImage(card.imageUrl, { sizes: '(max-width: 40rem) 90vw, 28rem' })}
                alt={localizedName(card, i18n.language)}
              />
            ) : (
              <span className={styles.noImage}>{t('preview.noImage')}</span>
            )}
          </div>

          <div className={styles.info}>
            <span className={styles.code}>
              {setCode} · #{padNumber(card.number)}
            </span>
            <h2 className={styles.name}>{localizedName(card, i18n.language)}</h2>

            <dl className={styles.facts}>
              <dt>{t('preview.position')}</dt>
              <dd className={styles.position}>{position ? formatPosition(t, position) : '—'}</dd>
              <dt>{t('list.domain')}</dt>
              <dd>{domainLabel(t, card)}</dd>
              <dt>{t('preview.type')}</dt>
              <dd>
                {t(`type.${card.type}`)}
                {card.supertype && ` · ${card.supertype}`}
              </dd>
              <dt>{t('list.rarity')}</dt>
              <dd>{t(`rarity.${card.rarity}`)}</dd>
              {isVariant(card) && (
                <>
                  <dt>{t('list.variant')}</dt>
                  <dd>{t(`variant.${card.variant}`)}</dd>
                </>
              )}
              {card.artist && (
                <>
                  <dt>{t('preview.artist')}</dt>
                  <dd>{card.artist}</dd>
                </>
              )}
            </dl>

            <div className={styles.actions}>
              {collection.tracking && (
                <Button
                  variant={owned ? 'secondary' : 'primary'}
                  onClick={() => collection.toggle(card.id)}
                >
                  {owned ? t('preview.markMissing') : t('preview.markOwned')}
                </Button>
              )}
              <Button variant="ghost" onClick={() => dialogRef.current.close()}>
                {t('preview.close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
