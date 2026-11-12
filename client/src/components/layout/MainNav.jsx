import { NavLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { useAuth } from '../../auth/useAuth.js';
import { useTradeSummary } from '../../hooks/useTradeSummary.js';
import { Book, Cards, Packs, Trade } from '../icons/Icons.jsx';
import { STEPS } from './steps.js';
import styles from './MainNav.module.css';

const LINKS = [
  // Le parcours de création (set → classeur → options → résultat) relève de « Sets ».
  { to: '/', key: 'sets', icon: Packs, match: (path) => STEPS.some((s) => s.path === path) },
  { to: '/binders', key: 'binders', icon: Book, accounts: true },
  { to: '/collection', key: 'collection', icon: Cards },
  { to: '/echanges', key: 'trades', icon: Trade, user: true },
];

/** Navigation principale du header ; libellés masqués sur petit écran (icônes seules). */
export function MainNav() {
  const { t } = useTranslation();
  const { enabled, user } = useAuth();
  const { pathname } = useLocation();
  const waiting = useTradeSummary(pathname);

  return (
    <nav className={styles.nav} aria-label={t('nav.label')}>
      {LINKS.filter((link) => (!link.accounts || enabled) && (!link.user || user)).map(
        ({ to, key, icon: Icon, match }) => {
          const active = match ? match(pathname) : pathname.startsWith(to);
          return (
            <NavLink
              key={key}
              to={to}
              className={`${styles.link} ${active ? styles.active : ''}`}
              aria-current={active ? 'page' : undefined}
              title={t(`nav.${key}`)}
            >
              <Icon className={styles.icon} />
              <span className={styles.label}>{t(`nav.${key}`)}</span>
              {key === 'trades' && waiting > 0 && (
                <span className={styles.badge} aria-label={t('nav.waiting', { count: waiting })}>
                  {waiting}
                </span>
              )}
              {active && <motion.span layoutId="nav-underline" className={styles.underline} />}
            </NavLink>
          );
        },
      )}
    </nav>
  );
}
