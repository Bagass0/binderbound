import { useTranslation } from 'react-i18next';
import styles from './RarityBreakdown.module.css';

/** Ordre d'affichage des raretés (de la plus courante à la plus rare). */
const ORDER = ['common', 'uncommon', 'rare', 'epic', 'showcase', 'promo'];

/**
 * Cartes possédées par rareté, avec la gemme officielle de Riftbound pour chacune (ronde,
 * triangle, carrée, pentagone ; hexagone pour les illustrations alternatives). : `byRarity` = { rarity: { owned, total } }.
 * `compact` : une ligne de pastilles (cartes de classeur) ; sinon une barre par rareté.
 */
export function RarityBreakdown({ byRarity, compact = false }) {
  const { t } = useTranslation();
  const rows = ORDER.filter((r) => byRarity?.[r]?.total).map((r) => ({ r, ...byRarity[r] }));
  if (!rows.length) return null;

  if (compact) {
    return (
      <ul className={styles.chips} aria-label={t('rarityBreakdown.label')}>
        {rows.map(({ r, owned, total }) => (
          <li
            key={r}
            className={`${styles.chip} ${owned === total ? styles.complete : ''}`}
            style={{ '--rarity': `var(--rarity-${r})` }}
            title={t(`rarity.${r}`)}
          >
            <i className={styles.gem} data-rarity={r} aria-hidden />
            <span className="visually-hidden">{t(`rarity.${r}`)} : </span>
            {owned}/{total}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <dl className={styles.bars}>
      {rows.map(({ r, owned, total }) => (
        <div key={r} className={styles.row} style={{ '--rarity': `var(--rarity-${r})` }}>
          <dt>
            <i className={styles.gem} data-rarity={r} aria-hidden />
            {t(`rarity.${r}`)}
          </dt>
          <dd>
            <span className={styles.track} aria-hidden>
              <span className={styles.fill} style={{ '--ratio': owned / total }} />
            </span>
            <span className={styles.count}>
              {owned}/{total}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
