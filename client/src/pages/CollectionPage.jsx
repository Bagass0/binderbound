import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useAsync } from '../hooks/useAsync.js';
import { localCollection } from '../hooks/localCollection.js';
import { withParams } from '../hooks/useLayoutParams.js';
import { EASE_OUT } from '../lib/motion.js';
import { localizedName } from '../lib/format.js';
import { SetShowcase } from '../components/binder/SetShowcase.jsx';
import { PageHeading } from '../components/common/PageHeading.jsx';
import { RarityBreakdown } from '../components/common/RarityBreakdown.jsx';
import { ErrorMessage, Loading } from '../components/common/StatusMessage.jsx';
import { ChevronRight } from '../components/icons/Icons.jsx';
import styles from './CollectionPage.module.css';

const list = { show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

/** Avancement d'un set : toutes ses cartes (variantes comprises), par rareté. */
function setProgress(set, ownedIds) {
  const owned = new Set(ownedIds);
  const progress = { owned: 0, total: 0, byRarity: {} };
  for (const card of set.cards) {
    const rarity = (progress.byRarity[card.rarity] ??= { owned: 0, total: 0 });
    const have = owned.has(card.id) ? 1 : 0;
    progress.total += 1;
    progress.owned += have;
    rarity.total += 1;
    rarity.owned += have;
  }
  return progress;
}

/**
 * Ma collection : l'avancement de chaque set, toutes versions confondues, détaillé par rareté.
 * Compte connecté → collection du serveur ; invité → celle de ce navigateur.
 */
export default function CollectionPage() {
  const { t, i18n } = useTranslation();
  const { status, user } = useAuth();

  const key = status === 'ready' ? `collection:${user?.id ?? 'guest'}` : 'collection:pending';
  const { data, error } = useAsync(key, async (signal) => {
    if (status !== 'ready') return null;
    const [summaries, owned] = await Promise.all([
      api.sets(),
      user ? api.collection.all(signal).then((r) => r.sets) : localCollection.all(),
    ]);
    const sets = await Promise.all(summaries.map((s) => api.set(s.id)));
    return sets.map((set, i) => ({
      summary: summaries[i],
      progress: setProgress(set, owned[set.id] ?? []),
    }));
  });

  if (error) return <ErrorMessage error={error} />;
  if (!data) return <Loading />;

  const totals = data.reduce(
    (acc, { progress }) => ({
      owned: acc.owned + progress.owned,
      total: acc.total + progress.total,
      started: acc.started + (progress.owned > 0 ? 1 : 0),
      complete: acc.complete + (progress.owned === progress.total ? 1 : 0),
    }),
    { owned: 0, total: 0, started: 0, complete: 0 },
  );

  return (
    <>
      <PageHeading
        eyebrow={user ? t('binders.eyebrow', { name: user.name }) : t('collectionPage.guest')}
        title={t('collectionPage.title')}
      >
        {t('collectionPage.lead')}
      </PageHeading>

      <dl className={styles.summary}>
        <div>
          <dt>{t('collectionPage.cards')}</dt>
          <dd>
            <strong>{totals.owned}</strong> / {totals.total}
          </dd>
        </div>
        <div>
          <dt>{t('collectionPage.started')}</dt>
          <dd>
            <strong>{totals.started}</strong> / {data.length}
          </dd>
        </div>
        <div>
          <dt>{t('collectionPage.complete')}</dt>
          <dd>
            <strong>{totals.complete}</strong>
          </dd>
        </div>
      </dl>

      {totals.owned === 0 && <p className={styles.empty}>{t('collectionPage.empty')}</p>}

      {['main', 'promo'].map((kind) => {
        const group = data.filter(({ summary }) => summary.kind === kind);
        if (!group.length) return null;
        return (
          <section key={kind} className={styles.section}>
            <h2 className={styles.sectionTitle}>{t(`setSelect.kind.${kind}`)}</h2>
            <motion.ul className={styles.grid} variants={list} initial="hidden" animate="show">
              {group.map(({ summary: set, progress }) => {
                const ratio = progress.total ? progress.owned / progress.total : 0;
                return (
                  <motion.li key={set.id} variants={item}>
                    <article className={styles.card}>
                      <SetShowcase
                        className={styles.showcase}
                        setId={set.id}
                        image={set.coverImage}
                        color={set.color}
                      />
                      <div className={styles.body}>
                        <span className={styles.code}>{set.code}</span>
                        <h3 className={styles.name}>{localizedName(set, i18n.language)}</h3>
                        <div className={styles.overall}>
                          <span>
                            {t('collection.progress', progress)}
                            <em>{Math.round(ratio * 100)} %</em>
                          </span>
                          <span className={styles.bar} aria-hidden>
                            <span style={{ '--ratio': ratio }} />
                          </span>
                        </div>
                        <RarityBreakdown byRarity={progress.byRarity} />
                        <Link
                          className={styles.open}
                          to={`/result?${withParams('', { setId: set.id })}`}
                        >
                          {t('collectionPage.open')} <ChevronRight />
                        </Link>
                      </div>
                    </article>
                  </motion.li>
                );
              })}
            </motion.ul>
          </section>
        );
      })}
    </>
  );
}
