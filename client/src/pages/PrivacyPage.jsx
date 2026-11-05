import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth.js';
import { Download, Trash } from '../components/icons/Icons.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Dialog } from '../components/ui/Dialog.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { LegalPage } from './LegalPage.jsx';
import styles from './LegalPage.module.css';

const EXPORT_URL = '/api/auth/me/export';

export default function PrivacyPage() {
  return (
    <LegalPage ns="privacy">
      <MyData />
    </LegalPage>
  );
}

/** Droits d'accès et d'effacement en libre-service, pour la personne connectée. */
function MyData() {
  const { t } = useTranslation();
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const { hash } = useLocation();
  const ref = useRef(null);

  // Lien « Mes données » du menu de compte : on descend jusqu'au panneau.
  useEffect(() => {
    if (hash === '#donnees') ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, [hash, user]);

  if (!user) return null;

  const remove = async () => {
    setPending(true);
    try {
      await deleteAccount();
      navigate('/');
    } catch (err) {
      setError(err);
      setPending(false);
    }
  };

  return (
    <Panel ref={ref} id="donnees" className={styles.data} title={t('myData.title')}>
      <p>{t('myData.lead', { email: user.email })}</p>
      <div className={styles.dataActions}>
        {/* Réponse en pièce jointe : le navigateur télécharge sans quitter la page. */}
        <Button icon={<Download />} onClick={() => window.location.assign(EXPORT_URL)}>
          {t('myData.export')}
        </Button>
        <Button variant="ghost" icon={<Trash />} onClick={() => setConfirming(true)}>
          {t('myData.delete')}
        </Button>
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('myData.confirmTitle')}
      >
        <p className={styles.dialogText}>{t('myData.confirmText')}</p>
        {error && <p className={styles.error}>{t('myData.error')}</p>}
        <div className={styles.dialogActions}>
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" disabled={pending} onClick={remove}>
            {t('myData.confirm')}
          </Button>
        </div>
      </Dialog>
    </Panel>
  );
}
