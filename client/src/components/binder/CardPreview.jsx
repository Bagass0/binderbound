import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { animate, useReducedMotion } from 'motion/react';
import { useBackdropClose } from '../../hooks/useBackdropClose.js';
import { EASE_OUT } from '../../lib/motion.js';
import {
  domainLabel,
  domainStyle,
  formatPosition,
  isVariant,
  localizedName,
  cardNumber,
} from '../../lib/format.js';
import { cardImage } from '../../lib/images.js';
import { Button } from '../ui/Button.jsx';
import { RarityGem } from '../common/RarityGem.jsx';
import styles from './CardPreview.module.css';

const ZOOM = { duration: 0.42, ease: EASE_OUT };
const UNZOOM = { duration: 0.32, ease: [0.4, 0, 0.7, 0.2] };

/**
 * Transformation qui superpose l'illustration de l'aperçu à la carte d'origine (`from`) :
 * l'aperçu « sort » de la carte cliquée et y retourne à la fermeture.
 */
function flipFrom(from, visual, dialog) {
  if (!from?.isConnected || !visual) return null;
  const o = from.getBoundingClientRect();
  if (!o.width || o.bottom < 0 || o.top > window.innerHeight) return null;
  const v = visual.getBoundingClientRect();
  const d = dialog.getBoundingClientRect();
  // Le zoom part du centre de l'illustration, pas de celui du panneau.
  dialog.style.transformOrigin = `${v.left - d.left + v.width / 2}px ${v.top - d.top + v.height / 2}px`;
  return {
    x: o.left + o.width / 2 - (v.left + v.width / 2),
    y: o.top + o.height / 2 - (v.top + v.height / 2),
    scale: Math.min(o.width / v.width, o.height / v.height),
  };
}

/**
 * Aperçu d'une carte en grand (dialog natif : focus et fond gérés par le navigateur).
 * `card` null = fermé ; `origin` est l'élément cliqué, d'où l'aperçu s'ouvre en zoomant.
 */
export function CardPreview({ card, origin, position, setCode, collection, onClose }) {
  const { t, i18n } = useTranslation();
  const dialogRef = useRef(null);
  const visualRef = useRef(null);
  const surfaceRef = useRef(null);
  const infoRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [closing, setClosing] = useState(false);

  // Ouverture : on affiche le dialog, puis on joue le zoom depuis la carte d'origine.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!card) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    if (reduceMotion) return;
    const flip = flipFrom(origin, visualRef.current, dialog);
    const fade = { opacity: [0, 1] };
    if (flip) {
      animate(dialog, { x: [flip.x, 0], y: [flip.y, 0], scale: [flip.scale, 1] }, ZOOM);
      animate(surfaceRef.current, fade, { ...ZOOM, delay: 0.05 });
    } else {
      animate(dialog, { opacity: [0, 1], scale: [0.96, 1] }, ZOOM);
    }
    animate(infoRef.current, { ...fade, x: [16, 0] }, { ...ZOOM, delay: 0.12 });
  }, [card, origin, reduceMotion]);

  // Fermeture : chemin inverse vers la carte d'origine, puis fermeture réelle du dialog.
  const requestClose = async () => {
    const dialog = dialogRef.current;
    if (closing || !dialog?.open) return;
    setClosing(true);
    if (!reduceMotion) {
      const flip = flipFrom(origin, visualRef.current, dialog);
      const out = { duration: 0.15 };
      animate(infoRef.current, { opacity: 0 }, out);
      if (flip) {
        animate(surfaceRef.current, { opacity: 0 }, out);
        await animate(dialog, flip, UNZOOM);
      } else {
        await animate(dialog, { opacity: 0, scale: 0.96 }, UNZOOM);
      }
    }
    dialog.close();
    dialog.style.transform = '';
    dialog.style.opacity = '';
    setClosing(false);
  };
  const backdrop = useBackdropClose(requestClose);

  const owned = card && collection.owned.has(card.id);

  return (
    <dialog
      ref={dialogRef}
      aria-label={card ? localizedName(card, i18n.language) : undefined}
      className={`${styles.dialog} ${closing ? styles.closing : ''}`}
      onClose={onClose}
      // Échap : on joue l'animation de fermeture au lieu de fermer net.
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      {...backdrop}
    >
      {card && (
        <div className={styles.content} style={domainStyle(card)}>
          <span ref={surfaceRef} className={styles.surface} aria-hidden />
          <div ref={visualRef} className={`${styles.visual} ${styles[card.orientation]}`}>
            {card.imageUrl ? (
              <img
                {...cardImage(card.imageUrl, { sizes: '(max-width: 40rem) 90vw, 28rem' })}
                alt={localizedName(card, i18n.language)}
              />
            ) : (
              <span className={styles.noImage}>{t('preview.noImage')}</span>
            )}
          </div>

          <div ref={infoRef} className={styles.info}>
            <span className={styles.code}>
              {setCode} · #{cardNumber(card)}
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
              <dd className={styles.rarity}>
                <RarityGem rarity={card.rarity} className={styles.gem} />
                {t(`rarity.${card.rarity}`)}
              </dd>
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
              <Button variant="ghost" onClick={requestClose}>
                {t('preview.close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
