import { localizedName } from '../../lib/format.js';

const escape = (value, sep) => {
  const s = String(value ?? '');
  return s.includes(sep) || s.includes('"') || s.includes('\n')
    ? `"${s.replaceAll('"', '""')}"`
    : s;
};

/**
 * Génère le CSV de la liste de rangement. Séparateur « ; » en français (Excel FR), « , » sinon.
 * Le BOM UTF-8 garantit l'affichage correct des accents dans Excel.
 */
export function buildCsv(placements, { t, lang, collection }) {
  const sep = lang === 'fr' ? ';' : ',';
  const header = [
    t('list.sheet'),
    t('list.side'),
    t('list.row'),
    t('list.col'),
    t('list.number'),
    'ID',
    t('list.name'),
    t('list.domain'),
    t('list.rarity'),
    t('list.variant'),
  ];
  if (collection.tracking) header.push(t('collection.ownedShort'));

  const lines = placements.map((p) => {
    const row = [
      p.sheet,
      t(`side.${p.side}`),
      p.row,
      p.col,
      p.card.number,
      p.card.id,
      localizedName(p.card, lang),
      t(`domain.${p.card.domain}`),
      t(`rarity.${p.card.rarity}`),
      t(`variant.${p.card.variant}`),
    ];
    if (collection.tracking)
      row.push(collection.owned.has(p.card.id) ? t('common.yes') : t('common.no'));
    return row.map((v) => escape(v, sep)).join(sep);
  });

  return '﻿' + [header.map((v) => escape(v, sep)).join(sep), ...lines].join('\r\n');
}

export function downloadFile(content, filename, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
