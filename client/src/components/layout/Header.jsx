import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Emblem } from '../icons/Icons.jsx';
import { LANGUAGES } from '../../i18n.js';
import { AccountMenu } from './AccountMenu.jsx';
import { SoundToggle } from './SoundToggle.jsx';
import styles from './Header.module.css';

export function Header() {
  const { t, i18n } = useTranslation();
  return (
    <header className={`${styles.header} no-print`}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label={t('app.home')}>
          <motion.span
            className={styles.emblem}
            whileHover={{ rotate: -8, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          >
            <Emblem />
          </motion.span>
          <span className={styles.name}>
            <span className="accent-text">{t('app.name')}</span>
            <small>{t('app.tagline')}</small>
          </span>
        </Link>

        <div className={styles.actions}>
          <SoundToggle />
          <div className={styles.lang} role="group" aria-label={t('app.language')}>
            {LANGUAGES.map((lng) => {
              const active = i18n.resolvedLanguage === lng;
              return (
                <button
                  key={lng}
                  type="button"
                  aria-pressed={active}
                  className={active ? styles.active : ''}
                  onClick={() => i18n.changeLanguage(lng)}
                >
                  {active && <motion.span layoutId="lang-pill" className={styles.pill} />}
                  <span className={styles.langLabel}>{lng.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
