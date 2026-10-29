import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { EASE_OUT } from '../../lib/motion.js';
import { useLayoutParams } from '../../hooks/useLayoutParams.js';
import { STEPS } from './steps.js';
import styles from './Stepper.module.css';

/** Barre d'étapes : une ligne dorée qui se remplit, un losange par étape. */
export function Stepper({ current }) {
  const { t } = useTranslation();
  const { params, search } = useLayoutParams();
  const progress = current / (STEPS.length - 1);

  return (
    <nav className={`${styles.stepper} no-print`} aria-label={t('steps.label')}>
      <div className={styles.inner}>
        <div className={styles.track} aria-hidden>
          <motion.div
            className={styles.fill}
            initial={false}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          />
        </div>
        <ol className={styles.list}>
          {STEPS.map((step, i) => {
            const state = i < current ? 'done' : i === current ? 'current' : 'todo';
            const reachable = i === 0 || Boolean(params.setId);
            const content = (
              <>
                <motion.span
                  className={styles.node}

                  initial={false}
                  animate={{ scale: state === 'current' ? 1.15 : 1 }}
                >
                  <span>{i + 1}</span>
                </motion.span>
                <span className={styles.label}>{t(`steps.${step.key}`)}</span>
              </>
            );
            return (
              <li key={step.key} className={`${styles.step} ${styles[state]}`}>
                {reachable && state !== 'current' ? (
                  <Link to={{ pathname: step.path, search }} className={styles.link}>
                    {content}
                  </Link>
                ) : (
                  <span
                    className={styles.link}
                    aria-current={state === 'current' ? 'step' : undefined}
                  >
                    {content}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
