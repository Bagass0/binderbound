import { useTranslation } from 'react-i18next';
import styles from './Footer.module.css';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className={`${styles.footer} no-print`}>
      <p>{t('footer.disclaimer')}</p>
    </footer>
  );
}
