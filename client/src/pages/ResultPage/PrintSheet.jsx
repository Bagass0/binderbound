import { useTranslation } from 'react-i18next';
import { memo, useMemo } from 'react';
import { isVariant, localizedName, padNumber } from '../../lib/format.js';

/** Version imprimable : liste de rangement groupée par feuillet. Visible uniquement à l'impression. */
export const PrintSheet = memo(function PrintSheet({ set, layout, placements, collection }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const bySheet = useMemo(() => Map.groupBy(placements, (p) => p.sheet), [placements]);
  const { options, summary } = layout;

  return (
    <section className="print-only print-sheet">
      <h1>
        {t('app.name')} — {localizedName(set, lang)} ({set.code})
      </h1>
      <p className="print-meta">
        {t('print.meta', {
          rows: options.rows,
          cols: options.cols,
          mode: options.doubleSided ? t('print.doubleSided') : t('print.singleSided'),
          cards: summary.totalCards,
          sheets: summary.sheetsUsed,
        })}
      </p>
      {[...bySheet].map(([sheet, items]) => (
        <table key={sheet}>
          <caption>{t('print.sheet', { sheet })}</caption>
          <thead>
            <tr>
              <th>{t('list.side')}</th>
              <th>{t('list.row')}</th>
              <th>{t('list.col')}</th>
              <th>{t('list.number')}</th>
              <th>{t('list.name')}</th>
              <th>{t('list.variant')}</th>
              {collection.tracking && <th>{t('collection.ownedShort')}</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.card.id}>
                <td>{t(`side.${p.side}`)}</td>
                <td>{p.row}</td>
                <td>{p.col}</td>
                <td>{padNumber(p.card.number)}</td>
                <td>{localizedName(p.card, lang)}</td>
                <td>{isVariant(p.card) ? t(`variant.${p.card.variant}`) : ''}</td>
                {collection.tracking && <td>{collection.owned.has(p.card.id) ? '✔' : '☐'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      <p className="print-footer">{t('footer.disclaimer')}</p>
    </section>
  );
});
