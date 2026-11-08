import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';

import { useCollection } from '../../hooks/useCollection.js';
import { useConfig, usePrices, useSet } from '../../hooks/useConfig.js';
import { useLayout } from '../../hooks/useLayout.js';
import { useLayoutParams } from '../../hooks/useLayoutParams.js';

import { ErrorMessage, Loading } from '../../components/common/StatusMessage.jsx';
import { BinderView } from '../../components/binder/BinderView.jsx';
import { CardPreview } from '../../components/binder/CardPreview.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Toggle } from '../../components/ui/controls.jsx';
import { Book, Download, Link, List, Printer, Scan } from '../../components/icons/Icons.jsx';
import { PriceSource } from '../../components/common/PriceTag.jsx';
import { Summary } from './Summary.jsx';
import { SearchBar } from './SearchBar.jsx';
import { LocatedCard } from './LocatedCard.jsx';
import { ScanDialog } from './ScanDialog.jsx';
import { ListView } from './ListView.jsx';
import { PrintSheet } from './PrintSheet.jsx';
import { SaveBinder } from './SaveBinder.jsx';
import { toPlacements } from './placements.js';
import { buildCsv, downloadFile } from './exportCsv.js';
import { localizedName } from '../../lib/format.js';
import styles from './ResultPage.module.css';

const TABS = [
  { key: 'binder', icon: <Book /> },
  { key: 'list', icon: <List /> },
];

export default function ResultPage() {
  const { t, i18n } = useTranslation();
  const { params, update } = useLayoutParams();
  const { data: config, error: configError } = useConfig();
  const { data: set, error: setError } = useSet(params.setId);
  const { data: layout, error: layoutError, loading } = useLayout(params, config, { delay: 0 });
  const collection = useCollection(params.setId);
  const { data: prices } = usePrices(params.setId);

  const [tab, setTab] = useState('binder');
  const [scanning, setScanning] = useState(false);
  const [located, setLocated] = useState(null); // carte trouvée par la recherche
  const [target, setTarget] = useState(null); // { cardId, nonce }
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(null); // { card, origin } : origin = élément cliqué
  const openPreview = useCallback((card, origin) => setPreview({ card, origin }), []);
  const tabsRef = useRef(null);

  const placements = useMemo(() => (layout ? toPlacements(layout) : []), [layout]);

  // Depuis la liste, on remonte jusqu'au classeur ; depuis la recherche, juste au-dessus,
  // la page ne bouge pas pour qu'on puisse enchaîner les recherches.
  const locate = useCallback((card, { scroll = true } = {}) => {
    setTab('binder');
    setTarget((prev) => ({ cardId: card.id, nonce: (prev?.nonce ?? 0) + 1 }));
    // Les onglets restent montés : on peut amener le classeur à l'écran tout de suite.
    if (scroll) tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const locateFromSearch = useCallback(
    (card) => {
      setLocated(card);
      locate(card, { scroll: false });
    },
    [locate],
  );

  const { tracking, toggle } = collection;
  const toggleOwned = useCallback((card) => toggle(card.id), [toggle]);

  const exportCsv = () => {
    const csv = buildCsv(placements, { t, lang: i18n.language, collection });
    const name = `binderbound-${set.code.toLowerCase()}-${layout.options.rows}x${layout.options.cols}.csv`;
    downloadFile(csv, name);
  };

  const copyLink = async () => {
    try {
      // Le lien partagé porte les réglages, pas le classeur sauvegardé (propre au compte).
      const url = new URL(window.location.href);
      url.searchParams.delete('binder');
      await navigator.clipboard.writeText(url.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  const error = configError || setError || layoutError;
  if (error) return <ErrorMessage error={error} />;
  if (!layout || !set) return <Loading label={t('result.computing')} />;

  const ownedCount = placements.filter((p) => collection.owned.has(p.card.id)).length;

  return (
    <>
      <div className="no-print">
        <motion.header
          className={styles.header}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.titles}>
            <span className={styles.eyebrow}>
              {set.code} · {localizedName(set, i18n.language)}
            </span>
            <h1 className="accent-text">{t('result.title')}</h1>
          </div>
          <SaveBinder params={params} update={update} set={set} />
        </motion.header>

        <motion.div animate={{ opacity: loading ? 0.6 : 1 }}>
          <Summary summary={layout.summary} />
        </motion.div>

        <div className={styles.toolbar}>
          <div className={styles.finders}>
            <SearchBar cards={set.cards} index={layout.index} onSelect={locateFromSearch} />
            <Button icon={<Scan />} onClick={() => setScanning(true)}>
              {t('scan.button')}
            </Button>
          </div>
          <div className={styles.exports}>
            <Button size="sm" variant="ghost" icon={<Link />} onClick={copyLink}>
              {copied ? t('result.copied') : t('result.share')}
            </Button>
            <Button size="sm" variant="ghost" icon={<Download />} onClick={exportCsv}>
              {t('result.exportCsv')}
            </Button>
            <Button size="sm" variant="ghost" icon={<Printer />} onClick={() => window.print()}>
              {t('result.print')}
            </Button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {located && (
            <LocatedCard
              key={located.id}
              card={located}
              layout={layout}
              prices={prices}
              onDismiss={() => setLocated(null)}
            />
          )}
        </AnimatePresence>

        <div ref={tabsRef} className={`${styles.viewBar} ${styles.binderAnchor}`}>
          <div className={styles.tabs} role="tablist" aria-label={t('result.views')}>
            {TABS.map(({ key, icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-${key}`}
                aria-selected={tab === key}
                aria-controls={`panel-${key}`}
                className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
                onClick={() => setTab(key)}
              >
                {icon}
                <span>{t(`result.tab.${key}`)}</span>
                {tab === key && (
                  <motion.span layoutId="tab-underline" className={styles.underline} />
                )}
              </button>
            ))}
          </div>

          <div className={styles.collection}>
            <AnimatePresence initial={false}>
              {collection.tracking && (
                <motion.div
                  className={styles.collectionStats}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                >
                  <div className={styles.progress}>
                    <span>
                      {t('collection.progress', { owned: ownedCount, total: placements.length })}
                    </span>
                    <div className={styles.bar}>
                      <motion.div
                        className={styles.barFill}
                        initial={false}
                        animate={{
                          scaleX: placements.length ? ownedCount / placements.length : 0,
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => collection.setAll(placements.map((p) => p.card.id))}
                  >
                    {t('collection.all')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => collection.setAll([])}>
                    {t('collection.none')}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <Toggle
              label={t('collection.title')}
              checked={collection.tracking}
              onChange={collection.setTracking}
            />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {collection.tracking && (
            <motion.p
              className={styles.collectionHint}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {t(collection.synced ? 'collection.hintSynced' : 'collection.hint')}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {tab === 'binder' ? (
              <BinderView
                layout={layout}
                target={target}
                collection={collection}
                onCardClick={tracking ? toggleOwned : openPreview}
              />
            ) : (
              <ListView
                placements={placements}
                config={config}
                collection={collection}
                prices={prices}
                onLocate={locate}
                onPreview={openPreview}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {prices && (
          <p className={styles.priceSource}>
            <PriceSource prices={prices} />
          </p>
        )}
      </div>

      <CardPreview
        card={preview?.card ?? null}
        origin={preview?.origin}
        layout={layout}
        prices={prices}
        setCode={set.code}
        collection={collection}
        onClose={() => setPreview(null)}
      />

      <ScanDialog
        open={scanning}
        onClose={() => setScanning(false)}
        set={set}
        layout={layout}
        prices={prices}
        collection={collection}
        onLocate={locate}
      />

      <PrintSheet set={set} layout={layout} placements={placements} collection={collection} />
    </>
  );
}
