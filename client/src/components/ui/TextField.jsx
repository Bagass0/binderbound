import { useId } from 'react';
import styles from './TextField.module.css';

/** Champ texte avec libellé, aide et message d'erreur reliés au champ (accessibilité). */
export function TextField({ label, hint, error, className = '', ...props }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`${styles.field} ${className}`}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-hint`} className={styles.hint}>
            {hint}
          </span>
        )
      )}
    </div>
  );
}
