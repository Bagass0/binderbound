import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button.jsx';
import { ChevronLeft, ChevronRight } from '../icons/Icons.jsx';
import styles from './StepActions.module.css';

/** Barre collante en bas des étapes : Retour / Suivant, avec un résumé au centre. */
export function StepActions({ back, next, nextLabel, children }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        {back ? (
          <Button variant="ghost" icon={<ChevronLeft />} onClick={() => navigate(back)}>
            {t('common.back')}
          </Button>
        ) : (
          <span />
        )}
        <div className={styles.center}>{children}</div>
        {next && (
          <Button variant="primary" onClick={() => navigate(next)}>
            {nextLabel ?? t('common.next')}
            <ChevronRight style={{ marginLeft: '0.4rem', verticalAlign: '-0.15em' }} />
          </Button>
        )}
      </div>
    </div>
  );
}
