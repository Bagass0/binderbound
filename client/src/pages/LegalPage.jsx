import { useTranslation } from 'react-i18next';
import { PageHeading } from '../components/common/PageHeading.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import styles from './LegalPage.module.css';

/** Éditeur du site : contact pour les questions et l'exercice des droits RGPD. */
export const CONTACT = 'hugobpereira55@gmail.com';

/** Page de texte juridique : titre, introduction et sections tirées des traductions. */
export function LegalPage({ ns, children }) {
  const { t } = useTranslation();
  const sections = t(`${ns}.sections`, { returnObjects: true, email: CONTACT });

  return (
    <>
      <PageHeading title={t(`${ns}.title`)}>{t(`${ns}.lead`)}</PageHeading>
      <Panel as="article" className={styles.article}>
        {sections.map((section) => (
          <section key={section.title} className={styles.section}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <p className={styles.updated}>{t('legal.updated')}</p>
      </Panel>
      {children}
    </>
  );
}
