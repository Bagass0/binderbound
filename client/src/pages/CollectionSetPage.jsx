import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useSet } from '../hooks/useConfig.js';
import { useCollection } from '../hooks/useCollection.js';
import { itemMotion } from '../lib/motion.js';
import { localizedName } from '../lib/format.js';
import { CardFrame } from '../components/binder/CardFrame.jsx';
import { CardPreview } from '../components/binder/CardPreview.jsx';
import { RarityGem } from '../components/common/RarityGem.jsx';
import { ErrorMessage, Loading } from '../components/common/StatusMessage.jsx';
import { Segmented } from '../components/ui/controls.jsx';
import { ChevronLeft } from '../components/icons/Icons.jsx';
import styles from './CollectionSetPage.module.css';

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'showcase', 'promo'];
const byNumber = new Intl.Collator('en', { numeric: true }).compare;

/**
 * Les cartes d'un set, rangées par rareté : possédées en couleur, manquantes estompées.
 * Filtres par état et par rareté ; un clic ouvre la carte en grand pour la cocher.
 */
export default function CollectionSetPage() {
  const { t, i18n } = useTranslation();
  const { setId } = useParams();
  const { data: set, error } = useSet(setId);
  const collection = useCollection(setId);
  const [show, setShow] = useState('all'); // all | owned | missing
  const [rarity, setRarity] = useState(null);
  const [preview, setPreview] = useState(null);

  // Dans cette page on coche toujours : l'aperçu propose « possédée / manquante ».
  const checking = useMemo(() => ({ ...collection, tracking: true }), [collection]);

  const groups = useMemo(() => {
    if (!set) return [];
    const sorted = set.cards.toSorted((a, b) => a.number - b.number || byNumber(a.id, b.id));
    return RARITIES.map((r) => ({ rarity: r, cards: sorted.filter((c) => c.rarity === r) })).filter(
      (g) => g.cards.length,
    );
  }, [set]);

  if (error) return <ErrorMessage error={error} />;
  if (!set) return <Loading />;

  const { owned } = collection;
  const count = (cards) => cards.filter((c) => owned.has(c.id)).length;
  const total = set.cards.length;
  const ownedTotal = count(set.cards);
  const keep = (card) =>
    show === 'all' || (show === 'owned' ? owned.has(card.id) : !owned.has(card.id));
  const visible = groups
    .filter((g) => !rarity || g.rarity === rarity)
    .map((g) => ({ ...g, shown: g.cards.filter(keep) }))
    .filter((g) => g.shown.length);

  return (
    <>
      <header className={styles.header}>
        <Link to="/collection" className={styles.back}>
          <ChevronLeft /> {t('collectionPage.title')}
        </Link>
        <span className={styles.code}>{set.code}</span>
        <h1 className="accent-text">{localizedName(set, i18n.language)}</h1>
        <div className={styles.overall}>
          <span>
            {t('collection.progress', { owned: ownedTotal, total })}
            <em>{Math.round((ownedTotal / total) * 100)} %</em>
          </span>
          <span className={styles.bar} aria-hidden>
            <span style={{ '--ratio': ownedTotal / total }} />
          </span>
        </div>
      </header>

      <div className={styles.filters}>
        <Segmented
          value={show}
          onChange={setShow}
          options={['all', 'owned', 'missing'].map((v) => ({
            value: v,
            label: t(`collectionSet.show.${v}`),
          }))}
        />
        <div className={styles.rarities} role="group" aria-label={t('collectionSet.rarity')}>
          <button
            type="button"
            aria-pressed={!rarity}
            className={`${styles.chip} ${!rarity ? styles.active : ''}`}
            onClick={() => setRarity(null)}
          >
            {t('collectionSet.allRarities')}
          </button>
          {groups.map((g) => (
            <button
              key={g.rarity}
              type="button"
              aria-pressed={rarity === g.rarity}
              className={`${styles.chip} ${rarity === g.rarity ? styles.active : ''}`}
              style={{ '--rarity': `var(--rarity-${g.rarity})` }}
              onClick={() => setRarity(rarity === g.rarity ? null : g.rarity)}
            >
              <RarityGem rarity={g.rarity} className={styles.chipGem} />
              {t(`rarity.${g.rarity}`)}
              <small>
                {count(g.cards)}/{g.cards.length}
              </small>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && <p className={styles.empty}>{t('collectionSet.empty')}</p>}

      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((g) => (
          <motion.section
            key={g.rarity}
            className={styles.group}
            layout
            variants={itemMotion}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            style={{ '--rarity': `var(--rarity-${g.rarity})` }}
          >
            <h2 className={styles.groupTitle}>
              <RarityGem rarity={g.rarity} className={styles.groupGem} />
              {t(`rarity.${g.rarity}`)}
              <span>
                {count(g.cards)}/{g.cards.length}
              </span>
            </h2>
            <ul className={styles.grid}>
              {g.shown.map((card) => (
                <li key={card.id} className={styles.slot}>
                  <CardFrame
                    card={card}
                    missing={!owned.has(card.id)}
                    pressed={owned.has(card.id)}
                    onClick={(c, el) => setPreview({ card: c, origin: el })}
                  />
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </AnimatePresence>

      <CardPreview
        card={preview?.card ?? null}
        origin={preview?.origin}
        setCode={set.code}
        collection={checking}
        onClose={() => setPreview(null)}
      />
    </>
  );
}
