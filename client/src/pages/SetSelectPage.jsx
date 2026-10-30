import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { EASE_OUT } from '../lib/motion.js';
import { useSets } from '../hooks/useConfig.js';
import { useLayoutParams, withParams } from '../hooks/useLayoutParams.js';
import { localizedName } from '../lib/format.js';
import { cardImage } from '../lib/images.js';
import { PageHeading } from '../components/common/PageHeading.jsx';
import { ErrorMessage, Loading } from '../components/common/StatusMessage.jsx';
import { ChevronRight } from '../components/icons/Icons.jsx';
import { RecentBinders } from './RecentBinders.jsx';
import styles from './SetSelectPage.module.css';

const list = { show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } };
const item = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE_OUT } },
};

export default function SetSelectPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { params, search } = useLayoutParams();
  const { data: sets, error, loading } = useSets();

  const choose = (setId) => {
    // On garde les autres réglages déjà présents dans l'URL.
    navigate({ pathname: '/binder', search: withParams(search, { setId }).toString() });
  };

  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' });

  return (
    <>
      <PageHeading eyebrow={t('setSelect.eyebrow')} title={t('setSelect.title')}>
        {t('setSelect.lead')}
      </PageHeading>

      <RecentBinders />

      {loading && <Loading />}
      {error && <ErrorMessage error={error} />}
      {sets &&
        ['main', 'promo'].map((kind) => {
          const group = sets.filter((set) => set.kind === kind);
          if (!group.length) return null;
          return (
            <section key={kind} className={styles.section}>
              <h2 className={styles.sectionTitle}>{t(`setSelect.kind.${kind}`)}</h2>
              <motion.ul className={styles.grid} variants={list} initial="hidden" animate="show">
                {group.map((set) => (
                  <motion.li key={set.id} variants={item}>
                    <SetCard
                      set={set}
                      selected={params.setId === set.id}
                      onChoose={() => choose(set.id)}
                      dateFormat={dateFormat}
                    />
                  </motion.li>
                ))}
              </motion.ul>
            </section>
          );
        })}
      {sets?.length === 0 && <p className={styles.empty}>{t('setSelect.empty')}</p>}
    </>
  );
}

function SetCard({ set, selected, onChoose, dateFormat }) {
  const { t, i18n } = useTranslation();
  return (
    <motion.button
      type="button"
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={onChoose}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
    >
      {set.coverImage && (
        <img
          className={styles.cover}
          {...cardImage(set.coverImage, { sizes: 'auto, 200px' })}
          alt=""
          loading="lazy"
          decoding="async"
        />
      )}
      <span className={styles.code}>{set.code}</span>
      <span className={styles.name}>{localizedName(set, i18n.language)}</span>
      <span className={styles.date}>
        {t('setSelect.released', { date: dateFormat.format(new Date(set.releaseDate)) })}
      </span>
      <span className={styles.counts}>
        <span>
          <strong>{set.counts.base}</strong> {t('setSelect.baseCards', { count: set.counts.base })}
        </span>
        <span>
          <strong>{set.counts.total}</strong> {t('setSelect.withVariants')}
        </span>
      </span>
      <span className={styles.cta}>
        {t('setSelect.choose')} <ChevronRight />
      </span>
    </motion.button>
  );
}
