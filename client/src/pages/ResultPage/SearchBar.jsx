import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from '../../components/icons/Icons.jsx';
import {
  domainStyle,
  formatPosition,
  isVariant,
  localizedName,
  padNumber,
} from '../../lib/format.js';
import styles from './SearchBar.module.css';

const MAX_RESULTS = 8;
const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Numéro de collection tapé : chiffres, lettre d'alt-art éventuelle, étoile de signature. */
const CODE = /^\d+[a-z]?\*?$/;

/** Numéro de collection d'une carte, tiré de son identifiant : OGN-027A-298 → « 27a ». */
const collectorCode = (card) => {
  const match = card.id.match(/^[A-Z]+-0*(\d+)([A-Z]?)(\*?)/);
  return match ? `${match[1]}${match[2].toLowerCase()}${match[3]}` : String(card.number);
};

/** Recherche par nom (dans les deux langues), numéro (« 113a » pour l'alt-art) ou identifiant. */
export function SearchBar({ cards, index, onSelect }) {
  const { t, i18n } = useTranslation();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  // Texte de recherche normalisé, calculé une fois par carte placée (et non à chaque frappe).
  const searchable = useMemo(
    () =>
      cards
        .filter((c) => index[c.id])
        .map((card) => ({
          card,
          code: collectorCode(card),
          text: normalize(`${card.id} ${card.name.fr} ${card.name.en}`),
        })),
    [cards, index],
  );

  const results = useMemo(() => {
    const q = normalize(query.trim()).replace(/^#/, '');
    if (!q) return [];
    // « 113a » vise l'alt-art, « 226* » la signature : la carte exacte passe en tête,
    // puis les autres versions du même numéro, puis les correspondances de nom.
    const code = q.match(CODE)?.[0];
    const number = code && Number.parseInt(code, 10);
    const rank = ({ card, code: c, text }) => {
      if (c === code) return 0;
      if (card.number === number) return 1;
      return text.includes(q) ? 2 : null;
    };
    return searchable
      .map((entry) => ({ entry, rank: rank(entry) }))
      .filter((r) => r.rank !== null)
      .sort((a, b) => a.rank - b.rank) // tri stable : l'ordre du set est conservé à rang égal
      .slice(0, MAX_RESULTS)
      .map((r) => r.entry.card);
  }, [query, searchable]);

  // Le champ se vide (et garde le focus) : on enchaîne directement avec le numéro suivant.
  const select = (card) => {
    onSelect(card);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(results[active] ?? results[0]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && query.trim() !== '';

  return (
    <div className={styles.search}>
      <Search className={styles.icon} />
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        aria-label={t('search.label')}
        placeholder={t('search.placeholder')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      <AnimatePresence>
        {showList && (
          <motion.ul
            id={listId}
            role="listbox"
            className={styles.results}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {results.length === 0 && <li className={styles.none}>{t('search.noResult')}</li>}
            {results.map((card, i) => (
              <li
                key={card.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`${styles.result} ${i === active ? styles.active : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(card);
                }}
                style={domainStyle(card)}
              >
                <span className={styles.number}>
                  #{padNumber(card.number)}
                  {collectorCode(card).replace(/^\d+/, '')}
                </span>
                <span className={styles.name}>
                  {localizedName(card, i18n.language)}
                  {isVariant(card) && (
                    <span className={styles.variant}>{t(`variant.${card.variant}`)}</span>
                  )}
                </span>
                <span className={styles.position}>{formatPosition(t, index[card.id])}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
