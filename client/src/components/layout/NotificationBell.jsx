import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../../api/client.js';
import { useAuth } from '../../auth/useAuth.js';
import { notifyChanged, useUnreadCount } from '../../hooks/useNotifications.js';
import { Bell, Check } from '../icons/Icons.jsx';
import { Button } from '../ui/Button.jsx';
import styles from './NotificationBell.module.css';

/** « il y a 5 min », « il y a 2 j »… (null pour moins d'une minute : « à l'instant »). */
function timeAgo(date, lang) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  const format = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' });
  for (const [unit, size] of [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return null;
}

/**
 * Cloche du header : demandes d'ami (acceptables sur place), échanges reçus, acceptés,
 * refusés ou annulés. Ouvrir le panneau marque tout comme lu.
 */
export function NotificationBell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const unread = useUnreadCount(pathname);
  // Ouvert sur une page donnée : changer de page referme le panneau.
  const [openOn, setOpenOn] = useState(null);
  const open = openOn === pathname;
  const setOpen = (value) => setOpenOn(value ? pathname : null);
  const rootRef = useRef(null);
  const { t } = useTranslation();

  // Fermeture au clic à l'extérieur ou avec Échap.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !rootRef.current?.contains(e.target) && setOpenOn(null);
    const onKey = (e) => e.key === 'Escape' && setOpenOn(null);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={`${styles.button} ${unread ? styles.unread : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('notifications.label', { count: unread })}
        title={t('notifications.title')}
        onClick={() => setOpen(!open)}
      >
        <Bell />
        {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t('notifications.title')}
            className={styles.panel}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <NotificationList />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Contenu du panneau, chargé à chaque ouverture. */
function NotificationList() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState({ list: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.notifications
      .list(controller.signal)
      .then(({ notifications }) => {
        setState({ list: notifications, error: null });
        // Les non lues restent mises en évidence pendant cette ouverture.
        if (notifications.some((n) => !n.read)) api.notifications.markRead().then(notifyChanged);
      })
      .catch((error) => !controller.signal.aborted && setState({ list: null, error }));
    return () => controller.abort();
  }, [version]);

  const answer = (fn) => () =>
    fn()
      .catch(console.error)
      .finally(() => {
        setVersion((v) => v + 1);
        notifyChanged();
      });

  const { list, error } = state;
  return (
    <>
      <header className={styles.head}>
        <strong>{t('notifications.title')}</strong>
        <Link to="/echanges" className={styles.all}>
          {t('notifications.seeTrades')}
        </Link>
      </header>
      {error && <p className={styles.empty}>{t('notifications.error')}</p>}
      {!list && !error && <p className={styles.empty}>{t('notifications.loading')}</p>}
      {list?.length === 0 && <p className={styles.empty}>{t('notifications.none')}</p>}
      {list?.length > 0 && (
        <ul className={styles.list}>
          {list.map((n) => (
            <li key={n.id} className={n.read ? '' : styles.new}>
              {n.actor.avatarUrl ? (
                <img
                  className={styles.avatar}
                  src={n.actor.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className={styles.avatar} aria-hidden>
                  {n.actor.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className={styles.body}>
                <p>
                  {t(`notifications.types.${n.type}`, {
                    name: n.actor.name,
                    set: n.trade?.setId.toUpperCase(),
                  })}
                </p>
                <small>{timeAgo(n.createdAt, i18n.language) ?? t('notifications.justNow')}</small>
                {n.type === 'friend_request' && n.pending && (
                  <div className={styles.actions}>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={answer(() => api.friends.accept(n.actor.id))}
                    >
                      {t('friends.accept')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={answer(() => api.friends.remove(n.actor.id))}
                    >
                      {t('friends.decline')}
                    </Button>
                  </div>
                )}
                {n.type === 'friend_request' && !n.pending && (
                  <span className={styles.done}>
                    <Check /> {t('notifications.nowFriends')}
                  </span>
                )}
                {n.type === 'friend_accepted' && (
                  <Link to="/amis" className={styles.link}>
                    {t('notifications.viewFriends')}
                  </Link>
                )}
                {n.type === 'trade_received' && (
                  <Link to="/echanges" className={styles.link}>
                    {t('notifications.viewTrade')}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
