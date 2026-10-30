import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useAsync } from '../hooks/useAsync.js';
import { withParams } from '../hooks/useLayoutParams.js';
import { ChevronRight } from '../components/icons/Icons.jsx';
import styles from './RecentBinders.module.css';

const SHOWN = 3;

/** Accueil d'un compte connecté : reprendre directement un classeur récent. */
export function RecentBinders() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: binders } = useAsync(user ? `recent:${user.id}` : 'recent:none', (signal) =>
    user ? api.binders.list(signal) : null,
  );
  if (!binders?.length) return null;

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
        {binders.slice(0, SHOWN).map((binder) => {
          const { progress } = binder;
          const ratio = progress?.total ? progress.owned / progress.total : 0;
          return (
            <li key={binder.id}>
              <Link
                className={styles.item}
                to={`/result?${withParams('', { ...binder.params, binderId: binder.id })}`}
              >
                <span className={styles.name}>{binder.name}</span>
                {progress && (
                  <span className={styles.meta}>
                    {t('collection.progress', progress)}
                    <span className={styles.bar} style={{ '--ratio': ratio }} aria-hidden />
                  </span>
                )}
                <ChevronRight className={styles.go} />
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
