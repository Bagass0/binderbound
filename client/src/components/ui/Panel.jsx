import styles from './Panel.module.css';

/** Panneau vitré avec titre optionnel. */
export function Panel({
  as: Tag = 'section',
  title,
  subtitle,
  children,
  className = '',
  ...props
}) {
  return (
    <Tag className={`${styles.panel} ${className}`} {...props}>
      {title && (
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>
      )}
      {children}
    </Tag>
  );
}
