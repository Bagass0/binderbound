import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useAsync } from '../hooks/useAsync.js';
import { useSets } from '../hooks/useConfig.js';
import { withParams } from '../hooks/useLayoutParams.js';
import { EASE_OUT } from '../lib/motion.js';
import { localizedName } from '../lib/format.js';
import { cardImage } from '../lib/images.js';
import { PageHeading } from '../components/common/PageHeading.jsx';
import { ErrorMessage, Loading } from '../components/common/StatusMessage.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Dialog } from '../components/ui/Dialog.jsx';
import { TextField } from '../components/ui/TextField.jsx';
import { ChevronRight, Pencil, Plus, Trash } from '../components/icons/Icons.jsx';
import styles from './BindersPage.module.css';

export default function BindersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  const { data: binders, error } = useAsync(`binders:${user.id}:${version}`, (signal) =>
    api.binders.list(signal),
  );
  const { data: sets } = useSets();
  const [renaming, setRenaming] = useState(null);

  const setsById = new Map(sets?.map((s) => [s.id, s]));

  return (
    <>
      <PageHeading eyebrow={t('binders.eyebrow', { name: user.name })} title={t('binders.title')}>
        {t('binders.lead')}
      </PageHeading>

      {error && <ErrorMessage error={error} />}
      {!binders && !error && <Loading />}

      {binders && (
        <ul className={styles.grid}>
          <AnimatePresence initial={false}>
            {binders.map((binder, i) => (
              <motion.li
                key={binder.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05, ease: EASE_OUT } }}
                exit={{ opacity: 0, scale: 0.94 }}
              >
                <BinderCard
                  binder={binder}
                  set={setsById.get(binder.setId)}
                  onRename={() => setRenaming(binder)}
                  onDeleted={refresh}
                />
              </motion.li>
            ))}
            <motion.li key="new" layout>
              <Link to="/" className={styles.newCard}>
                <Plus />
                <span>{t('binders.new')}</span>
                {binders.length === 0 && <small>{t('binders.empty')}</small>}
              </Link>
            </motion.li>
          </AnimatePresence>
        </ul>
      )}

      <RenameDialog
        binder={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={() => {
          setRenaming(null);
          refresh();
        }}
      />
    </>
  );
}

function BinderCard({ binder, set, onRename, onDeleted }) {
  const { t, i18n } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const { params, progress } = binder;
  const href = `/result?${withParams('', { ...params, binderId: binder.id })}`;
  const ratio = progress?.total ? progress.owned / progress.total : 0;
  const updated = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
    new Date(binder.updatedAt),
  );

  const remove = async () => {
    // En cas d'échec, le rechargement de la liste montre l'état réel.
    await api.binders.remove(binder.id).catch(console.error);
    onDeleted();
  };

  return (
    <article className={styles.card}>
      {set?.coverImage && (
        <img
          className={styles.cover}
          {...cardImage(set.coverImage, { sizes: 'auto, 200px' })}
          alt=""
          loading="lazy"
        />
      )}
      <span className={styles.code}>
        {set ? `${set.code} · ${localizedName(set, i18n.language)}` : binder.setId}
      </span>
      <h2 className={styles.name}>{binder.name}</h2>
      <p className={styles.details}>
        {t('binders.format', { rows: params.rows, cols: params.cols })} ·{' '}
        {t(params.doubleSided ? 'binders.duplex' : 'binders.simplex')} ·{' '}
        {t('binders.sortedBy', { sort: t(`sort.${params.sortBy}`).toLowerCase() })}
      </p>

      {progress && (
        <div className={styles.progress}>
          <span>{t('collection.progress', progress)}</span>
          <div className={styles.bar}>
            <motion.div
              className={styles.barFill}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: ratio }}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.2 }}
            />
          </div>
        </div>
      )}
      <span className={styles.updated}>{t('binders.updated', { date: updated })}</span>

      <div className={styles.actions}>
        <Link to={href} className={styles.open}>
          {t('binders.open')} <ChevronRight />
        </Link>
        {confirming ? (
          <span className={styles.confirm}>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="secondary" className={styles.danger} onClick={remove}>
              {t('binders.confirmDelete')}
            </Button>
          </span>
        ) : (
          <span className={styles.tools}>
            <Button
              size="sm"
              variant="ghost"
              icon={<Pencil />}
              aria-label={t('binders.rename')}
              onClick={onRename}
            />
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash />}
              aria-label={t('binders.delete')}
              onClick={() => setConfirming(true)}
            />
          </span>
        )}
      </div>
    </article>
  );
}

function RenameDialog({ binder, onClose, onRenamed }) {
  const { t } = useTranslation();
  return (
    <Dialog open={Boolean(binder)} onClose={onClose} title={t('binders.rename')}>
      {binder && <RenameForm binder={binder} onCancel={onClose} onRenamed={onRenamed} />}
    </Dialog>
  );
}

function RenameForm({ binder, onCancel, onRenamed }) {
  const { t } = useTranslation();
  const [name, setName] = useState(binder.name);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.binders.update(binder.id, { name });
      onRenamed();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <form className={styles.dialogForm} onSubmit={submit}>
      <TextField
        label={t('save.name')}
        value={name}
        maxLength={80}
        autoFocus
        required
        onChange={(e) => setName(e.target.value)}
        error={error && t('save.invalidName')}
      />
      <div className={styles.dialogActions}>
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
