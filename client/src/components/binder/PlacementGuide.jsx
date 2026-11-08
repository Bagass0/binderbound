import { useTranslation } from 'react-i18next';
import { gridStyle } from '../../lib/format.js';
import styles from './PlacementGuide.module.css';

/**
 * Où ranger `card` dans le classeur `layout`, en grand : le numéro de page (comme dans un
 * livre : feuillet 1 recto = page 1, verso = page 2), le feuillet et son côté, puis la case sur
 * une mini-grille. Une carte absente du classeur (variante exclue) l'indique simplement.
 */
export function PlacementGuide({ layout, card }) {
  const { t } = useTranslation();
  const position = layout.index[card.id];
  if (!position) return <p className={styles.missing}>{t('placement.notPlaced')}</p>;

  const { rows, cols, doubleSided } = layout.options;
  const target = (position.row - 1) * cols + (position.col - 1);
  return (
    <div className={styles.guide}>
      <div className={styles.page}>
        <span className={styles.pageLabel}>{t('placement.page')}</span>
        <strong className={styles.pageNumber}>{position.page}</strong>
      </div>
      <div className={styles.details}>
        <span className={styles.sheet}>
          {t('placement.sheet', { sheet: position.sheet, side: t(`side.${position.side}`) })}
        </span>
        {doubleSided && (
          <span className={styles.hand}>
            {t(position.side === 'recto' ? 'placement.right' : 'placement.left')}
          </span>
        )}
        <span className={styles.cell}>
          {t('placement.cell', { row: position.row, col: position.col })}
        </span>
      </div>
      <div
        className={styles.grid}
        style={gridStyle(rows, cols)}
        role="img"
        aria-label={`${t('placement.grid')} : ${t('placement.cell', position)}`}
      >
        {Array.from({ length: rows * cols }, (_, i) => (
          <span key={i} className={i === target ? styles.target : undefined} />
        ))}
      </div>
    </div>
  );
}
