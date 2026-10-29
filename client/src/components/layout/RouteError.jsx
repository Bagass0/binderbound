import { useRouteError } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ErrorMessage } from '../common/StatusMessage.jsx';
import styles from './AppLayout.module.css';

/** Erreur de rendu inattendue : message dans la charte plutôt que l'écran par défaut. */
export function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();
  return (
    <main className={styles.main}>
      <ErrorMessage error={error} />
      <p style={{ textAlign: 'center' }}>
        <a href="/">{t('app.home')}</a>
      </p>
    </main>
  );
}
