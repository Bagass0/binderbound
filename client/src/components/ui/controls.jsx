import { useId } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Check } from '../icons/Icons.jsx';
import styles from './controls.module.css';

const spring = { type: 'spring', stiffness: 500, damping: 34 };

/** Interrupteur on/off : case à cocher native (role="switch") dessinée en piste. */
export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={`${styles.field} ${styles.row} ${disabled ? styles.disabled : ''}`}>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="visually-hidden"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={`${styles.switch} ${checked ? styles.on : ''}`} aria-hidden>
        <motion.span className={styles.knob} layout transition={spring} />
      </span>
    </label>
  );
}

/** Groupe de choix exclusifs, avec un indicateur qui glisse vers l'option active. */
export function Segmented({ value, onChange, options, label }) {
  const group = useId();
  return (
    <div className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.segmented} role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${styles.segment} ${active ? styles.segmentActive : ''}`}
              onClick={() => onChange(opt.value)}
            >
              {active && (
                <motion.span
                  layoutId={`seg-${group}`}
                  className={styles.segmentGlow}
                  transition={spring}
                />
              )}
              <span className={styles.segmentLabel}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Carte de choix (radio enrichi), utilisée pour les modes de variantes. */
export function ChoiceCards({ value, onChange, options, label }) {
  return (
    <div className={styles.field} role="radiogroup" aria-label={label}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.choices}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <motion.button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`${styles.choice} ${active ? styles.choiceActive : ''}`}
              onClick={() => onChange(opt.value)}
            >
              {opt.visual && <span className={styles.choiceVisual}>{opt.visual}</span>}
              <span className={styles.choiceTitle}>{opt.label}</span>
              {opt.description && <span className={styles.description}>{opt.description}</span>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/** Champ numérique avec boutons − / +. `value` peut être null si `allowEmpty`. */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  description,
  allowEmpty,
  placeholder,
}) {
  const id = useId();
  const { t } = useTranslation();
  const clamp = (n) => Math.min(Math.max(n, min), max);
  const step = (delta) => {
    if (value === null) return delta > 0 && onChange(min);
    if (allowEmpty && delta < 0 && value <= min) return onChange(null);
    onChange(clamp(value + delta));
  };
  return (
    <div className={`${styles.field} ${styles.row}`}>
      <span className={styles.text}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      <div className={styles.stepper}>
        <button
          type="button"
          aria-label={t('common.decrease')}
          onClick={() => step(-1)}
          disabled={value === null || (value <= min && !allowEmpty)}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => {
            if (e.target.value === '') return allowEmpty ? onChange(null) : undefined;
            const n = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(n)) onChange(clamp(n));
          }}
        />
        <button
          type="button"
          aria-label={t('common.increase')}
          onClick={() => step(1)}
          disabled={value !== null && value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Case à cocher animée. */
export function Checkbox({ checked, onChange, label, disabled }) {
  return (
    <label className={`${styles.checkbox} ${disabled ? styles.disabled : ''}`}>
      <input
        type="checkbox"
        className="visually-hidden"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={`${styles.box} ${checked ? styles.boxChecked : ''}`} aria-hidden>
        <motion.span
          initial={false}
          animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={spring}
          className={styles.tick}
        >
          <Check />
        </motion.span>
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}

/** Séparateur en dégradé. */
export const Divider = () => <div className={styles.divider} aria-hidden />;
