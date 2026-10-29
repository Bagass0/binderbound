import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';

import { useCollection } from '../../hooks/useCollection.js';
import { useConfig, useSet } from '../../hooks/useConfig.js';
import { useLayout } from '../../hooks/useLayout.js';
import { useLayoutParams } from '../../hooks/useLayoutParams.js';
import { PageHeading } from '../../components/common/PageHeading.jsx';

import { ErrorMessage, Loading } from '../../components/common/StatusMessage.jsx';
import { BinderView } from '../../components/binder/BinderView.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Toggle } from '../../components/ui/controls.jsx';
import { Book, Download, Link, List, Printer } from '../../components/icons/Icons.jsx';
import { Summary } from './Summary.jsx';
import { SearchBar } from './SearchBar.jsx';
import { ListView } from './ListView.jsx';
import { PrintSheet } from './PrintSheet.jsx';
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
  const { params } = useLayoutParams();
  const { data: config, error: configError } = useConfig();
  const { data: set, error: setError } = useSet(params.setId);
  const { data: layout, error: layoutError, loading } = useLayout(params, config, { delay: 0 });
  const collection = useCollection(params.setId);

  const [tab, setTab] = useState('binder');
  const [target, setTarget] = useState(null); // { cardId, nonce }
  const [copied, setCopied] = useState(false);
  const tabsRef = useRef(null);

  const placements = useMemo(() => (layout ? toPlacements(layout) : []), [layout]);

  const locate = useCallback((card) => {
    setTab('binder');
    setTarget((prev) => ({ cardId: card.id, nonce: (prev?.nonce ?? 0) + 1 }));
    // Les onglets restent montés : on peut amener le classeur à l'écran tout de suite.
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const { tracking, toggle } = collection;
  const toggleOwned = useCallback((card) => toggle(card.id), [toggle]);

  const exportCsv = () => {
    const csv = buildCsv(placements, { t, lang: i18n.language, collection });
    const name = `binderbound-${set.code.toLowerCase()}-${layout.options.rows}x${layout.options.cols}.csv`;
    downloadFile(csv, name);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
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
        <PageHeading
          eyebrow={`${set.code} · ${localizedName(set, i18n.language)}`}
          title={t('result.title')}
        >
          {t('result.lead')}
        </PageHeading>

        <motion.div animate={{ opacity: loading ? 0.6 : 1 }}>
          <Summary summary={layout.summary} />
        </motion.div>

        <div className={styles.toolbar}>
          <SearchBar cards={set.cards} index={layout.index} onSelect={locate} />
          <div className={styles.exports}>
            <Button size="sm" icon={<Link />} onClick={copyLink}>
              {copied ? t('result.copied') : t('result.share')}
            </Button>
            <Button size="sm" icon={<Download />} onClick={exportCsv}>
              {t('result.exportCsv')}
            </Button>
            <Button size="sm" icon={<Printer />} onClick={() => window.print()}>
              {t('result.print')}
            </Button>
          </div>
        </div>

        <div className={styles.collectionBar}>
          <Toggle
            label={t('collection.title')}
            description={t('collection.hint')}
            checked={collection.tracking}
            onChange={collection.setTracking}
          />
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
                      animate={{ scaleX: placements.length ? ownedCount / placements.length : 0 }}
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
        </div>

        <div
          ref={tabsRef}
          className={`${styles.tabs} ${styles.binderAnchor}`}
          role="tablist"
          aria-label={t('result.views')}
        >
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
              {tab === key && <motion.span layoutId="tab-underline" className={styles.underline} />}
            </button>
          ))}
        </div>

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
                onCardClick={tracking ? toggleOwned : undefined}
              />
            ) : (
              <ListView
                placements={placements}
                config={config}
                collection={collection}
                onLocate={locate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <PrintSheet set={set} layout={layout} placements={placements} collection={collection} />
    </>
  );
}
