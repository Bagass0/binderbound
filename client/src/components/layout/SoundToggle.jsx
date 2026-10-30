import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAmbience } from '../../lib/ambience.js';
import { storage } from '../../hooks/storage.js';
import styles from './SoundToggle.module.css';

const KEY = 'binderbound.sound';

/**
 * Bouton d'ambiance sonore. Le choix est mémorisé ; comme les navigateurs bloquent le son
 * sans geste de l'utilisateur, une ambiance laissée allumée reprend au premier clic.
 */
export function SoundToggle() {
  const { t } = useTranslation();
  const [on, setOn] = useState(() => storage.get(KEY, false));
  const [playing, setPlaying] = useState(false);

  const play = useCallback(async () => {
    try {
      await (await getAmbience()).start();
      setPlaying(true);
    } catch (err) {
      console.warn(err);
    }
  }, []);

  useEffect(() => {
    if (!on || playing) return;
    window.addEventListener('pointerdown', play, { once: true });
    return () => window.removeEventListener('pointerdown', play);
  }, [on, playing, play]);

  const toggle = async () => {
    const next = !playing;
    setOn(next);
    storage.set(KEY, next);
    if (next) await play();
    else {
      (await getAmbience()).stop();
      setPlaying(false);
    }
  };

  return (
    <button
      type="button"
      className={`${styles.button} ${playing ? styles.playing : ''}`}
      aria-pressed={playing}
      aria-label={t(playing ? 'sound.off' : 'sound.on')}
      title={t(playing ? 'sound.off' : 'sound.on')}
      // Le clic sur le bouton ne doit pas aussi déclencher la reprise automatique.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={toggle}
    >
      <span className={styles.bars} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ '--i': i }} />
        ))}
      </span>
    </button>
  );
}
