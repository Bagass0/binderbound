import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../../api/client.js';
import { useAuth } from '../../auth/useAuth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { binderParams, sameParams } from '../../hooks/useLayoutParams.js';
import { localizedName } from '../../lib/format.js';
import { Button } from '../../components/ui/Button.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { TextField } from '../../components/ui/TextField.jsx';
import { Check, Save } from '../../components/icons/Icons.jsx';
import styles from './SaveBinder.module.css';

/**
 * Sauvegarde des réglages dans le compte. Le classeur ouvert est repéré par `?binder=<id>` :
 * on propose alors d'enregistrer les modifications, sinon d'en créer un nouveau.
 */
export function SaveBinder({ params, update, set }) {
  const { t, i18n } = useTranslation();
  const { enabled, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [version, setVersion] = useState(0);
  const [naming, setNaming] = useState(false);
  const [pending, setPending] = useState(false);

  const id = user && params.binderId;
  const { data: binder, error } = useAsync(
    id ? `binder:${id}:${version}` : 'binder:none',
    (signal) => (id ? api.binders.get(id, signal) : null),
  );

  if (!enabled) return null;

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return (
      <Button size="sm" icon={<Save />} onClick={() => navigate(`/login?next=${next}`)}>
        {t('save.signInToSave')}
      </Button>
    );
  }

  const current = binderParams(params);
  // Classeur introuvable (supprimé, ou lien d'un autre compte) : on repart d'un nouveau.
  const saved = id && !error ? binder : null;
  const upToDate = saved && sameParams(saved.params, current);

  const saveChanges = async () => {
    setPending(true);
    try {
      await api.binders.update(saved.id, { params: current });
      setVersion((v) => v + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setPending(false);
    }
  };

  const create = async (name) => {
    const created = await api.binders.create({ name, params: current });
    setNaming(false);
    update({ binderId: created.id });
  };

  const defaultName = `${localizedName(set, i18n.language)} · ${params.rows}×${params.cols}`;

  return (
    <div className={styles.save}>
      <AnimatePresence mode="wait" initial={false}>
        {saved && (
          <motion.span
            key={saved.name}
            className={styles.name}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            {saved.name}
          </motion.span>
        )}
      </AnimatePresence>

      {saved ? (
        <Button
          size="sm"
          variant={upToDate ? 'ghost' : 'primary'}
          icon={upToDate ? <Check /> : <Save />}
          disabled={upToDate || pending}
          onClick={saveChanges}
        >
          {upToDate ? t('save.saved') : t('save.saveChanges')}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="primary"
          icon={<Save />}
          disabled={Boolean(id && !binder && !error)}
          onClick={() => setNaming(true)}
        >
          {t('save.save')}
        </Button>
      )}

      <Dialog open={naming} onClose={() => setNaming(false)} title={t('save.title')}>
        {naming && (
          <NameForm defaultName={defaultName} onCancel={() => setNaming(false)} onSubmit={create} />
        )}
      </Dialog>
    </div>
  );
}

function NameForm({ defaultName, onCancel, onSubmit }) {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setPending(true);
    try {
      await onSubmit(name);
    } catch (err) {
      setError(err);
      setPending(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <p className={styles.hint}>{t('save.hint')}</p>
      <TextField
        label={t('save.name')}
        value={name}
        maxLength={80}
        autoFocus
        required
        onChange={(e) => setName(e.target.value)}
        error={error && t(error.code === 'BINDER_LIMIT' ? 'save.limit' : 'save.invalidName')}
      />
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={!name.trim() || pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
