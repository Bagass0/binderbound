import { ChevronRight } from '../icons/Icons.jsx';
import styles from './Disclosure.module.css';

/**
 * Section repliable (details/summary natif : clavier et lecteurs d'écran gérés).
 * Pour les réglages avancés : les valeurs par défaut conviennent à la plupart des gens.
 */
export function Disclosure({ title, summary, defaultOpen = false, children }) {
  return (
    <details className={styles.disclosure} open={defaultOpen || undefined}>
      <summary className={styles.summary}>
        <span className={styles.text}>
          <span className={styles.title}>{title}</span>
          {summary && <span className={styles.hint}>{summary}</span>}
        </span>
        <ChevronRight className={styles.chevron} />
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
