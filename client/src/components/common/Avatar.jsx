import styles from './Avatar.module.css';

/** Photo d'un joueur, ou l'initiale de son nom sur fond doré. */
export function Avatar({ user, size = 'md' }) {
  return user.avatarUrl ? (
    <img
      className={`${styles.avatar} ${styles[size]}`}
      src={user.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
    />
  ) : (
    <span className={`${styles.avatar} ${styles[size]}`} aria-hidden>
      {user.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
