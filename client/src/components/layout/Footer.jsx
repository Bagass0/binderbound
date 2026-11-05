import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.css';

const DATA_SOURCE = { name: 'Riftcodex', url: 'https://riftcodex.com' };

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className={`${styles.footer} no-print`}>
      <p>{t('footer.disclaimer')}</p>
      <p>
        {t('footer.data', { source: DATA_SOURCE.name })}{' '}
        <a href={DATA_SOURCE.url} target="_blank" rel="noreferrer">
          {DATA_SOURCE.url.replace('https://', '')}
        </a>
      </p>
      <p className={styles.links}>
        <Link to="/conditions">{t('footer.terms')}</Link>
        <Link to="/confidentialite">{t('footer.privacy')}</Link>
      </p>
    </footer>
  );
}
