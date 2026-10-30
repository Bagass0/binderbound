import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../auth/useAuth.js';
import { Book, Logout, User } from '../icons/Icons.jsx';
import styles from './AccountMenu.module.css';

/** Bouton « Se connecter », ou avatar + menu (Mes classeurs, déconnexion). */
export function AccountMenu() {
  const { t } = useTranslation();
  const { enabled, status, user, logout } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Fermeture au clic à l'extérieur ou avec Échap.
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

  if (!enabled || status === 'loading') return null;

  if (!user) {
    if (pathname === '/login') return null;
    const next = encodeURIComponent(pathname + search);
    return (
      <Link to={`/login?next=${next}`} className={styles.login}>
        <User />
        <span>{t('auth.signIn')}</span>
      </Link>
    );
  }

  const signOut = async () => {
    setOpen(false);
    // On quitte d'abord la page : une page réservée aux comptes redirigerait vers la connexion.
    navigate('/');
    await logout();
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={styles.avatarButton}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('account.menu', { name: user.name })}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar user={user} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className={styles.menu}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <div className={styles.identity}>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <Link
              role="menuitem"
              to="/binders"
              className={styles.item}
              onClick={() => setOpen(false)}
            >
              <Book /> {t('account.binders')}
            </Link>
            <button role="menuitem" type="button" className={styles.item} onClick={signOut}>
              <Logout /> {t('auth.signOut')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Avatar({ user }) {
  const [broken, setBroken] = useState(false);
  if (user.avatarUrl && !broken)
    return (
      <img
        className={styles.avatar}
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  return <span className={styles.avatar}>{user.name.trim()[0]?.toUpperCase()}</span>;
}
