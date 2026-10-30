import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../../components/ui/controls.jsx';
import {
  domainGroup,
  domainLabel,
  domainStyle,
  isVariant,
  localizedName,
  padNumber,
} from '../../lib/format.js';
import styles from './ListView.module.css';
import { cardImage } from '../../lib/images.js';

const ALL = '';

/** Tableau Carte → Feuillet / Face / Ligne / Colonne, avec tri et filtres. */
/** Colonnes triables : clé de tri → clé de traduction de l'en-tête. */
const SORTABLE = [
  ['number', 'list.number'],
  ['name', 'list.name'],
  ['domain', 'list.domain'],
  ['rarity', 'list.rarity'],
  ['variant', 'list.variant'],
  ['position', 'list.sheet'],
];

function sortValue(key, { lang, config }) {
  const rank = (list) => new Map(list.map((v, i) => [v, i]));
  switch (key) {
    case 'number':
      return (p) => p.card.number;
    case 'name':
      return (p) => localizedName(p.card, lang);
    case 'domain': {
      const ranks = rank(config.domainGroups);
      return (p) => ranks.get(domainGroup(p.card));
    }
    case 'rarity': {
      const ranks = rank(config.rarities);
      return (p) => ranks.get(p.card.rarity);
    }
    case 'variant':
      return (p) => p.card.variant;
    default:
      return (p) => p.faceIndex * 1000 + p.row * 10 + p.col;
  }
}

export function ListView({ placements, config, collection, onLocate, onPreview }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [sort, setSort] = useState({ key: 'position', dir: 1 });
  const [filters, setFilters] = useState({ text: '', domain: ALL, variant: ALL, owned: ALL });

  const rows = useMemo(() => {
    const q = filters.text.trim().toLowerCase();
    const filtered = placements.filter(({ card }) => {
      if (filters.domain && !card.domains.includes(filters.domain)) return false;
      if (filters.variant && card.variant !== filters.variant) return false;
      if (filters.owned && collection.tracking) {
        const has = collection.owned.has(card.id);
        if ((filters.owned === 'owned') !== has) return false;
      }
      if (!q) return true;
      return (
        String(card.number).includes(q) ||
        card.id.toLowerCase().includes(q) ||
        localizedName(card, lang).toLowerCase().includes(q)
      );
    });
    // Clé de tri calculée une fois par ligne, puis comparaison simple.
    const value = sortValue(sort.key, { lang, config });
    const compare =
      typeof value(filtered[0] ?? placements[0]) === 'string'
        ? new Intl.Collator(lang).compare
        : (a, b) => a - b;
    return filtered
      .map((p) => [value(p), p])
      .sort((a, b) => compare(a[0], b[0]) * sort.dir)
      .map(([, p]) => p);
  }, [placements, filters, sort, lang, collection.owned, collection.tracking, config]);

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));
  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const variants = ['base', ...config.variantTypes];

  const sortHeader = ([key, label]) => (
    <th
      key={key}
      aria-sort={sort.key === key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" onClick={() => toggleSort(key)}>
        {t(label)}
        <span className={styles.arrow} data-active={sort.key === key}>
          {sort.key === key && sort.dir < 0 ? '▾' : '▴'}
        </span>
      </button>
    </th>
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.filters}>
        <input
          type="search"
          placeholder={t('list.filterText')}
          aria-label={t('list.filterText')}
          value={filters.text}
          onChange={setFilter('text')}
        />
        <select value={filters.domain} onChange={setFilter('domain')} aria-label={t('list.domain')}>
          <option value={ALL}>{t('list.allDomains')}</option>
          {config.domains.map((d) => (
            <option key={d} value={d}>
              {t(`domain.${d}`)}
            </option>
          ))}
        </select>
        <select
          value={filters.variant}
          onChange={setFilter('variant')}
          aria-label={t('list.variant')}
        >
          <option value={ALL}>{t('list.allVariants')}</option>
          {variants.map((v) => (
            <option key={v} value={v}>
              {t(`variant.${v}`)}
            </option>
          ))}
        </select>
        {collection.tracking && (
          <select
            value={filters.owned}
            onChange={setFilter('owned')}
            aria-label={t('collection.title')}
          >
            <option value={ALL}>{t('list.allCards')}</option>
            <option value="owned">{t('collection.owned')}</option>
            <option value="missing">{t('collection.missing')}</option>
          </select>
        )}
        <span className={styles.count}>{t('list.count', { count: rows.length })}</span>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {collection.tracking && (
                <th className={styles.ownedCol}>{t('collection.ownedShort')}</th>
              )}
              {SORTABLE.map(sortHeader)}
              <th>{t('list.side')}</th>
              <th>{t('list.row')}</th>
              <th>{t('list.col')}</th>
              <th>
                <span className="visually-hidden">{t('list.locate')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const missing = collection.tracking && !collection.owned.has(p.card.id);
              return (
                <tr
                  key={p.card.id}
                  className={missing ? styles.missing : ''}
                  style={domainStyle(p.card)}
                >
                  {collection.tracking && (
                    <td className={styles.ownedCol}>
                      <Checkbox
                        checked={!missing}
                        onChange={() => collection.toggle(p.card.id)}
                        label={<span className="visually-hidden">{t('collection.toggle')}</span>}
                      />
                    </td>
                  )}
                  <td className={styles.num}>{padNumber(p.card.number)}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.name}
                      onClick={() => onPreview(p.card)}
                      title={t('preview.open')}
                    >
                      {p.card.imageUrl && (
                        <img
                          className={styles.thumb}
                          {...cardImage(p.card.imageUrl, { sizes: 'auto, 48px' })}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      {localizedName(p.card, lang)}
                    </button>
                  </td>
                  <td>
                    <span className={styles.domain}>{domainLabel(t, p.card)}</span>
                  </td>
                  <td>{t(`rarity.${p.card.rarity}`)}</td>
                  <td>
                    {!isVariant(p.card) ? (
                      <span className={styles.dim}>—</span>
                    ) : (
                      <span className={styles.badge}>{t(`variant.${p.card.variant}`)}</span>
                    )}
                  </td>
                  <td className={styles.pos}>{p.sheet}</td>
                  <td>{t(`side.${p.side}`)}</td>
                  <td className={styles.pos}>{p.row}</td>
                  <td className={styles.pos}>{p.col}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.locate}
                      onClick={() => onLocate(p.card)}
                    >
                      {t('list.locate')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
