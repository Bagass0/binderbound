import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './GoogleButton.module.css';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let gsi; // promesse du script Google Identity Services, chargé une seule fois

const loadGsi = () =>
  (gsi ??= new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement('script'), { src: GSI_SRC, async: true });
    script.onload = () => resolve(window.google.accounts.id);
    script.onerror = () => {
      gsi = null;
      reject(new Error('Google Identity Services indisponible'));
    };
    document.head.append(script);
  }));

/**
 * Bouton officiel « Continuer avec Google ». Google renvoie un jeton d'identité signé (JWT)
 * que le serveur vérifie avant d'ouvrir la session : aucun mot de passe ne transite.
 */
export function GoogleButton({ clientId, onCredential }) {
  const { t, i18n } = useTranslation();
  const ref = useRef(null);
  const callback = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    loadGsi()
      .then((id) => {
        if (cancelled || !ref.current) return;
        id.initialize({
          client_id: clientId,
          callback: (response) => callback.current(response.credential),
          ux_mode: 'popup',
        });
        id.renderButton(ref.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: i18n.language,
          width: Math.min(ref.current.offsetWidth, 400),
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [clientId, i18n.language]);

  if (failed) return <p className={styles.failed}>{t('auth.googleUnavailable')}</p>;
  return <div ref={ref} className={styles.button} />;
}
