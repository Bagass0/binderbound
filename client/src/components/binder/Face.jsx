import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { CardFrame } from './CardFrame.jsx';
import { formatFace, gridStyle } from '../../lib/format.js';
import styles from './Face.module.css';

/**
 * Une face du classeur. `face` null = page sans cartes (intérieur de couverture, dos vide).
 * `stagger` : les cartes apparaissent en cascade au montage (animation CSS).
 */
export const Face = memo(function Face({
  face,
  rows,
  cols,
  placeholder,
  highlight,
  collection,
  onCardClick,
  stagger = true,
}) {
  const { t } = useTranslation();
  const style = gridStyle(rows, cols);

  if (!face) {
    return (
      <div className={`${styles.face} ${styles.blank}`}>
        <div className={styles.grid} style={style} />
        <span className={styles.blankLabel}>{placeholder}</span>
      </div>
    );
  }

  return (
    <div className={`${styles.face} ${face.reserved ? styles.reserved : ''}`}>
      <div className={`${styles.grid} ${stagger ? styles.stagger : ''}`} style={style}>
        {face.slots.map((slot, i) => {
          const highlighted = highlight?.cardId === slot.card?.id;
          return (
            <div key={i} className={styles.slot} style={{ '--i': i }}>
              {slot.card ? (
                <CardFrame
                  // Nouvelle clé à chaque recherche : relance l'animation de surbrillance.
                  key={highlighted ? highlight.nonce : undefined}
                  card={slot.card}
                  missing={collection?.tracking && !collection.owned.has(slot.card.id)}
                  highlight={highlighted}
                  onClick={onCardClick}
                />
              ) : (
                <span className={styles.empty} aria-label={t('binder.emptySlot')} />
              )}
            </div>
          );
        })}
      </div>
      {face.reserved && <span className={styles.reservedLabel}>{t('binder.reserved')}</span>}
      <span className={styles.caption}>{formatFace(t, face)}</span>
    </div>
  );
});
