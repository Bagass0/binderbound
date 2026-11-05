import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useAsync } from '../hooks/useAsync.js';
import { useSets } from '../hooks/useConfig.js';
import { withParams } from '../hooks/useLayoutParams.js';
import { EASE_OUT } from '../lib/motion.js';
import { localizedName } from '../lib/format.js';
import { SetShowcase } from '../components/binder/SetShowcase.jsx';
import { ChevronRight } from '../components/icons/Icons.jsx';
import styles from './RecentBinders.module.css';

const SHOWN = 3;

/** Accueil d'un compte connecté : reprendre directement un classeur récent. */
export function RecentBinders() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data: sets } = useSets();
  const { data: binders } = useAsync(user ? `recent:${user.id}` : 'recent:none', (signal) =>
    user ? api.binders.list(signal) : null,
  );
  if (!binders?.length) return null;
  const setsById = new Map(sets?.map((s) => [s.id, s]));

  return (
    <motion.section
      className={styles.recent}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={styles.head}>
        <h2 className={styles.title}>{t('recent.title')}</h2>
        <Link to="/binders" className={styles.all}>
          {t('recent.all', { count: binders.length })} <ChevronRight />
        </Link>
      </div>
      <ul className={styles.list}>
        {binders.slice(0, SHOWN).map((binder, i) => {
          const set = setsById.get(binder.setId);
          const { progress, params } = binder;
          const ratio = progress?.total ? progress.owned / progress.total : 0;
          return (
            <motion.li
              key={binder.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.07, ease: EASE_OUT } }}
            >
              <Link
                className={styles.item}
                to={`/result?${withParams('', { ...params, binderId: binder.id })}`}
              >
                <SetShowcase
                  className={styles.showcase}
                  setId={binder.setId}
                  image={set?.coverImage}
                  color={set?.color}
                />
                <span className={styles.body}>
                  <span className={styles.code}>
                    {set ? localizedName(set, i18n.language) : binder.setId} ·{' '}
                    {t('binders.format', { rows: params.rows, cols: params.cols })}
                  </span>
                  <span className={styles.name}>{binder.name}</span>
                  {progress && (
                    <span className={styles.meta}>
                      <span>
                        {t('collection.progress', progress)}
                        <em>{Math.round(ratio * 100)} %</em>
                      </span>
                      <span className={styles.bar} style={{ '--ratio': ratio }} aria-hidden />
                    </span>
                  )}
                  <span className={styles.go}>
                    {t('recent.resume')} <ChevronRight />
                  </span>
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </motion.section>
  );
}
