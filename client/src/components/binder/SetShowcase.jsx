import { useReducedMotion } from 'motion/react';
import { BOOSTERS } from '../../lib/boosters.js';
import { cardImage } from '../../lib/images.js';
import styles from './SetShowcase.module.css';

/**
 * Vitrine d'un set : son booster (ou, à défaut, sa carte phare) mis en scène dans un halo à
 * la couleur de l'emballage, un second exemplaire en retrait pour la profondeur. Au survol,
 * le booster suit le pointeur en 3D et un reflet métallisé le balaie.
 */
export function SetShowcase({ setId, image, color, className = '' }) {
  const reduceMotion = useReducedMotion();
  const booster = BOOSTERS[setId];
  const tint = booster?.color ?? color;
  const src = booster ? { src: booster.image } : image && cardImage(image, { sizes: '12rem' });

  // Inclinaison 3D d'après la position du pointeur dans la vitrine (de -1 à 1 sur chaque axe).
  const tilt = (e) => {
    if (reduceMotion) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--px', ((e.clientX - r.left) / r.width) * 2 - 1);
    e.currentTarget.style.setProperty('--py', ((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const reset = (e) => {
    e.currentTarget.style.setProperty('--px', 0);
    e.currentTarget.style.setProperty('--py', 0);
  };

  return (
    <span
      className={`${styles.showcase} ${booster ? '' : styles.card} ${className}`}
      style={tint ? { '--set-color': tint } : undefined}
      onPointerMove={tilt}
      onPointerLeave={reset}
      aria-hidden
    >
      {src && (
        <>
          <img className={styles.back} {...src} alt="" loading="lazy" decoding="async" />
          {/* Masque du reflet : seulement pour nos boosters (même origine) ; une image du CDN
              de Riot en masque CSS serait chargée en CORS et refusée. */}
          <span
            className={styles.front}
            style={booster ? { '--mask': `url("${booster.image}")` } : undefined}
          >
            <img {...src} alt="" loading="lazy" decoding="async" draggable={false} />
            <i className={styles.sheen} />
          </span>
        </>
      )}
      <i className={styles.floor} />
    </span>
  );
}
