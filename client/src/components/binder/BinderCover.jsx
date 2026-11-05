import { BOOSTERS } from '../../lib/boosters.js';
import { cardImage } from '../../lib/images.js';
import styles from './BinderCover.module.css';

/**
 * Classeur fermé vu de face : reliure à anneaux, couverture teintée et, au centre, le booster
 * du set s'il est connu (BOOSTERS). Sinon, la carte phare présentée en entier comme un
 * booster scellé, sur la couleur dominante de son illustration (`color`, calculée à l'import).
 */
export function BinderCover({ setId, image, color, code, label, className = '' }) {
  const booster = BOOSTERS[setId];
  const tint = booster?.color ?? color;
  return (
    <div
      className={`${styles.binder} ${booster ? styles.withBooster : ''} ${className}`}
      style={tint ? { '--set-color': tint } : undefined}
      aria-hidden
    >
      <div className={styles.cover}>
        {booster ? (
          <img
            className={styles.booster}
            src={booster.image}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <CardPack image={image} />
        )}
        <span className={styles.plate}>
          <strong>{code}</strong>
          {label && <span>{label}</span>}
        </span>
      </div>
      <span className={styles.spine}>
        <i />
        <i />
        <i />
      </span>
      <span className={styles.strap} />
    </div>
  );
}

/** Repli sans visuel de booster : la carte phare dans un emballage serti. */
function CardPack({ image }) {
  return (
    <span className={styles.pack}>
      {image && (
        <img
          {...cardImage(image, { sizes: '(max-width: 40rem) 45vw, 10rem' })}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      )}
      <span className={styles.foil} />
    </span>
  );
}
