import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { getAmbience, STYLES } from '../../lib/ambience.js';
import { storage } from '../../hooks/storage.js';
import { Toggle } from '../ui/controls.jsx';
import styles from './SoundToggle.module.css';

const KEY = 'binderbound.sound';
const STYLE_KEY = 'binderbound.soundStyle';
const STYLE_IDS = Object.keys(STYLES);

/**
 * Ambiance sonore, activée par défaut. Le bouton ouvre un panneau : marche/arrêt et choix du
 * style (la Faille, Ionia, taverne, Îles obscures). Les choix sont mémorisés ; comme les
 * navigateurs bloquent le son sans geste de l'utilisateur, l'ambiance démarre au premier clic
 * ou à la première touche.
 */
export function SoundToggle() {
  const { t } = useTranslation();
  const [on, setOn] = useState(() => storage.get(KEY, true));
  const [style, setStyle] = useState(() => {
    const saved = storage.get(STYLE_KEY, 'faille');
    return STYLE_IDS.includes(saved) ? saved : 'faille';
  });
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  // Style à jouer au démarrage automatique (mis à jour par `choose`, seul à le changer).
  const styleRef = useRef(style);

  const play = useCallback(async () => {
    try {
      const player = await getAmbience(styleRef.current);
      player.setStyle(styleRef.current);
      await player.start();
      setPlaying(true);
    } catch (err) {
      console.warn(err);
    }
  }, []);

  useEffect(() => {
    if (!on || playing) return;
    const events = ['pointerdown', 'keydown'];
    events.forEach((e) => window.addEventListener(e, play, { once: true }));
    return () => events.forEach((e) => window.removeEventListener(e, play));
  }, [on, playing, play]);

  // Fermeture du panneau au clic à l'extérieur ou avec Échap.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const setEnabled = async (next) => {
    setOn(next);
    storage.set(KEY, next);
    if (next) await play();
    else {
      (await getAmbience(style)).stop();
      setPlaying(false);
    }
  };

  // Choisir un style le fait entendre tout de suite (et rallume l'ambiance si besoin).
  const choose = async (id) => {
    setStyle(id);
    styleRef.current = id;
    storage.set(STYLE_KEY, id);
    if (playing) (await getAmbience(id)).setStyle(id);
    else await setEnabled(true);
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      // Les clics dans le bouton et le panneau ne doivent pas déclencher la reprise automatique.
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`${styles.button} ${playing ? styles.playing : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('sound.title')}
        title={t('sound.title')}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.bars} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ '--i': i }} />
          ))}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t('sound.title')}
            className={styles.panel}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <Toggle label={t('sound.title')} checked={playing} onChange={setEnabled} />
            <div className={styles.styles} role="radiogroup" aria-label={t('sound.style')}>
              {STYLE_IDS.map((id) => {
                const active = id === style;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`${styles.style} ${active ? styles.active : ''}`}
                    style={{ '--hue': `var(--sound-${id})` }}
                    onClick={() => choose(id)}
                  >
                    <i className={styles.dot} aria-hidden />
                    <span>
                      <strong>{t(`sound.styles.${id}.name`)}</strong>
                      <small>{t(`sound.styles.${id}.hint`)}</small>
                    </span>
                    {active && playing && (
                      <span className={`${styles.bars} ${styles.mini}`} aria-hidden>
                        {[0, 1, 2].map((i) => (
                          <span key={i} style={{ '--i': i }} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
