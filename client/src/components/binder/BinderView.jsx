import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { EASE_OUT } from '../../lib/motion.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { Face } from './Face.jsx';
import { faceToSpread, spreadCount, spreadFaces } from './spreads.js';
import { formatFace } from '../../lib/format.js';
import { ChevronLeft, ChevronRight } from '../icons/Icons.jsx';
import styles from './BinderView.module.css';

/**
 * Vue classeur.
 * - Desktop : classeur ouvert (2 faces), on tourne les pages en 3D autour de la reliure.
 * - Mobile : une face à la fois, navigation par swipe ou boutons.
 * `target` ({ cardId, nonce }) permet de sauter à une carte depuis la recherche.
 */
export function BinderView({ layout, target, collection, onCardClick }) {
  const isDesktop = useMediaQuery('(min-width: 60rem)');
  const props = { layout, target, collection, onCardClick };
  return isDesktop ? <SpreadView {...props} /> : <SingleFaceView {...props} />;
}

const clamp = (n, total) => Math.min(Math.max(n, 0), total - 1);

/**
 * Applique la cible de recherche (pattern « ajuster l'état pendant le rendu »).
 * La face est résolue dans le layout courant : `onFace(faceIndex)`.
 */
function useTarget(target, layout, onFace) {
  const [seen, setSeen] = useState(target?.nonce);
  if (target && target.nonce !== seen) {
    setSeen(target.nonce);
    const position = layout.index[target.cardId];
    if (position) onFace(position.faceIndex);
  }
}

const initialFace = (target, layout) => layout.index[target?.cardId]?.faceIndex ?? 0;

function useArrowKeys(onPrev, onNext) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev, onNext]);
}

function SpreadView({ layout, target, collection, onCardClick }) {
  const { t } = useTranslation();
  const { faces, options } = layout;
  const { rows, cols, doubleSided } = options;
  const total = spreadCount(faces.length, doubleSided);

  // `desired` est la seule source de navigation ; l'animation rattrape `shown` vers elle,
  // une page à la fois, sans jamais ignorer un clic ou une recherche.
  const [desired, setDesired] = useState(() =>
    faceToSpread(initialFace(target, layout), doubleSided),
  );
  const [shown, setShown] = useState(desired);
  const [turn, setTurn] = useState(null); // { from, to, dir }
  const want = clamp(desired, total);
  const current = clamp(shown, total);

  const go = (to) => setDesired(clamp(to, total));
  useTarget(target, layout, (faceIndex) => go(faceToSpread(faceIndex, doubleSided)));
  const prev = () => setDesired((d) => clamp(d - 1, total));
  const next = () => setDesired((d) => clamp(d + 1, total));
  useArrowKeys(prev, next);

  // Démarre le retournement vers la page voulue dès que la feuille précédente est posée.
  if (!turn && want !== current) {
    setTurn({ from: current, to: want, dir: want > current ? 1 : -1 });
  }

  const facesOf = (s) => {
    const { left, right } = spreadFaces(s, faces.length, doubleSided);
    return {
      left: left === null ? null : faces[left],
      right: right === null ? null : faces[right],
    };
  };

  const blankLabel = (s, side) => {
    if (side === 'left' && s === 0) return t('binder.insideCover');
    if (side === 'left' && !doubleSided) return t('binder.blankBack');
    return t('binder.end');
  };

  const renderFace = (s, side, stagger = false) => (
    <Face
      face={facesOf(s)[side]}
      placeholder={blankLabel(s, side)}
      stagger={stagger}
      rows={rows}
      cols={cols}
      collection={collection}
      onCardClick={onCardClick}
      highlight={target}
    />
  );

  // Pendant un retournement : sous la feuille qui tourne, on montre déjà la page qui sera révélée.
  const base = turn
    ? turn.dir > 0
      ? { left: [turn.from, 'left'], right: [turn.to, 'right'] }
      : { left: [turn.to, 'left'], right: [turn.from, 'right'] }
    : { left: [current, 'left'], right: [current, 'right'] };

  const shownFaces = facesOf(want);
  const sideLabel = (face) => (face ? formatFace(t, face) : '—');

  return (
    <div className={styles.wrapper}>
      <div className={styles.book} style={{ '--rows': rows, '--cols': cols }}>
        <div className={`${styles.page} ${styles.pageLeft}`}>
          {renderFace(...base.left, Boolean(turn && turn.dir < 0))}
        </div>
        <div className={styles.spine} aria-hidden />
        <div className={`${styles.page} ${styles.pageRight}`}>
          {renderFace(...base.right, Boolean(turn && turn.dir > 0))}
        </div>

        {turn && (
          // Animation CSS (keyframes) : fiable, et réduite automatiquement avec prefers-reduced-motion.
          <div
            key={`${turn.from}-${turn.to}`}
            className={`${styles.leaf} ${turn.dir > 0 ? styles.leafRight : styles.leafLeft}`}
            onAnimationEnd={(e) => {
              if (e.target !== e.currentTarget) return; // ignore les animations des cartes
              setShown(turn.to);
              setTurn(null);
            }}
          >
            <div className={styles.leafFront}>
              {renderFace(turn.from, turn.dir > 0 ? 'right' : 'left')}
              <span className={styles.leafShade} />
            </div>
            <div className={styles.leafBack}>
              {renderFace(turn.to, turn.dir > 0 ? 'left' : 'right')}
              <span className={styles.leafShade} />
            </div>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <NavButton dir="prev" onClick={prev} disabled={want === 0} label={t('binder.prevPage')} />
        <div className={styles.indicator} aria-live="polite">
          <span>
            {sideLabel(shownFaces.left)} <em>|</em> {sideLabel(shownFaces.right)}
          </span>
          <small>{t('binder.spreadOf', { current: want + 1, total })}</small>
        </div>
        <NavButton
          dir="next"
          onClick={next}
          disabled={want >= total - 1}
          label={t('binder.nextPage')}
        />
      </div>
      <Progress current={want} total={total} onSelect={go} />
    </div>
  );
}

function SingleFaceView({ layout, target, collection, onCardClick }) {
  const { t } = useTranslation();
  const { faces, options } = layout;
  const total = Math.max(faces.length, 1);
  const [state, setState] = useState(() => ({ index: initialFace(target, layout), dir: 1 }));
  const index = clamp(state.index, total);

  const go = useCallback(
    (to) => {
      const next = clamp(to, total);
      if (next !== index) setState({ index: next, dir: next > index ? 1 : -1 });
    },
    [index, total],
  );
  useTarget(target, layout, go);
  const prev = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);
  useArrowKeys(prev, next);

  const face = faces[index] ?? null;
  return (
    <div className={styles.wrapper}>
      <div className={styles.single}>
        <AnimatePresence mode="popLayout" initial={false} custom={state.dir}>
          <motion.div
            key={index}
            className={styles.singlePage}
            custom={state.dir}
            variants={{
              enter: (dir) => ({ x: `${dir * 100}%`, opacity: 0, rotateY: dir * -25 }),
              center: { x: 0, opacity: 1, rotateY: 0 },
              exit: (dir) => ({ x: `${dir * -100}%`, opacity: 0, rotateY: dir * 25 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: EASE_OUT }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.35}
            onDragEnd={(_e, { offset, velocity }) => {
              const swipe = offset.x + velocity.x * 0.2;
              if (swipe < -60) next();
              else if (swipe > 60) prev();
            }}
          >
            <Face
              face={face}
              rows={options.rows}
              cols={options.cols}
              placeholder={t('binder.end')}
              highlight={target}
              collection={collection}
              onCardClick={onCardClick}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className={styles.controls}>
        <NavButton dir="prev" onClick={prev} disabled={index === 0} label={t('binder.prevFace')} />
        <div className={styles.indicator} aria-live="polite">
          <span>{face ? formatFace(t, face) : '—'}</span>
          <small>{t('binder.faceOf', { current: index + 1, total })}</small>
        </div>
        <NavButton
          dir="next"
          onClick={next}
          disabled={index >= total - 1}
          label={t('binder.nextFace')}
        />
      </div>
      <p className={styles.swipeHint}>{t('binder.swipeHint')}</p>
    </div>
  );
}

function NavButton({ dir, label, ...props }) {
  return (
    <motion.button
      type="button"
      className={styles.nav}
      aria-label={label}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      {...props}
    >
      {dir === 'prev' ? <ChevronLeft /> : <ChevronRight />}
    </motion.button>
  );
}

/** Barre de progression cliquable : un point par double page. */
function Progress({ current, total, onSelect }) {
  const { t } = useTranslation();
  if (total <= 1 || total > 40) return null;
  return (
    <div className={styles.progress}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          className={i === current ? styles.dotActive : styles.dot}
          aria-label={t('binder.goToSpread', { n: i + 1 })}
          aria-current={i === current ? 'page' : undefined}
          onClick={() => onSelect(i)}
        />
      ))}
    </div>
  );
}
