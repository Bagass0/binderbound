import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useAsync } from '../hooks/useAsync.js';
import { notifyChanged } from '../hooks/useNotifications.js';
import { Avatar } from '../components/common/Avatar.jsx';
import { PageHeading } from '../components/common/PageHeading.jsx';
import { ErrorMessage, Loading } from '../components/common/StatusMessage.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { Toggle } from '../components/ui/controls.jsx';
import { TextField } from '../components/ui/TextField.jsx';
import { Check, Copy, Plus, Search, Trade, Trash, Users } from '../components/icons/Icons.jsx';
import styles from './FriendsPage.module.css';

const initialOf = (user) => user.name.slice(0, 1).toLocaleUpperCase();

/** Taille d'une page de la liste des joueurs (fixée par le serveur). */
const PLAYERS_PAGE = 50;

/** « ABCD-EFGH » : plus lisible à dicter ou recopier. */
const formatCode = (code) => (code ? `${code.slice(0, 4)}-${code.slice(4)}` : '');

/**
 * Amis : la liste d'abord (demandes reçues, amis, demandes envoyées), le code ami à côté,
 * puis la recherche parmi tous les joueurs qui acceptent d'apparaître.
 */
export default function FriendsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Une seule version pour les deux listes : un ajout dans l'une se voit dans l'autre.
  const [version, setVersion] = useState(0);
  const refresh = () => {
    setVersion((v) => v + 1);
    notifyChanged();
  };
  const friends = useAsync(`friends:${user.id}:${version}`, (signal) => api.friends.list(signal));

  return (
    <>
      <PageHeading eyebrow={t('friends.eyebrow')} title={t('friends.title')}>
        {t('friends.lead')}
      </PageHeading>

      <div className={styles.layout}>
        <FriendLists state={friends} onChange={refresh} />
        <CodePanel state={friends} onChange={refresh} />
      </div>

      <Players version={version} onChange={refresh} />
    </>
  );
}

function FriendLists({ state, onChange }) {
  const { t } = useTranslation();
  const { data, error } = state;
  const act = (fn) => () => fn().then(onChange, console.error);

  return (
    <div className={styles.lists}>
      {error && <ErrorMessage error={error} />}
      {!data && !error && <Loading />}
      {data?.incoming.length > 0 && (
        <section className={`${styles.block} ${styles.incoming}`}>
          <h2>
            {t('friends.incoming')} <span>{data.incoming.length}</span>
          </h2>
          <ul className={styles.people}>
            {data.incoming.map((f) => (
              <li key={f.id}>
                <Avatar user={f} />
                <span className={styles.personName}>{f.name}</span>
                <Button size="sm" variant="primary" onClick={act(() => api.friends.accept(f.id))}>
                  {t('friends.accept')}
                </Button>
                <Button size="sm" variant="ghost" onClick={act(() => api.friends.remove(f.id))}>
                  {t('friends.decline')}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && (
        <section className={styles.block}>
          <h2>
            {t('friends.mine')} <span>{data.friends.length}</span>
          </h2>
          {data.friends.length === 0 ? (
            <p className={styles.empty}>
              <Users className={styles.emptyIcon} />
              {t('friends.none')}
            </p>
          ) : (
            <ul className={`${styles.people} ${styles.friendList}`}>
              {data.friends.map((f) => (
                <FriendRow key={f.id} friend={f} onRemoved={onChange} />
              ))}
            </ul>
          )}
        </section>
      )}

      {data?.outgoing.length > 0 && (
        <section className={styles.block}>
          <h2>
            {t('friends.outgoing')} <span>{data.outgoing.length}</span>
          </h2>
          <ul className={styles.people}>
            {data.outgoing.map((f) => (
              <li key={f.id}>
                <Avatar user={f} />
                <span className={styles.personName}>{f.name}</span>
                <Button size="sm" variant="ghost" onClick={act(() => api.friends.remove(f.id))}>
                  {t('common.cancel')}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function FriendRow({ friend, onRemoved }) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  return (
    <li>
      <Avatar user={friend} />
      <span className={styles.personName}>{friend.name}</span>
      {confirming ? (
        <>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className={styles.danger}
            onClick={() => api.friends.remove(friend.id).then(onRemoved, console.error)}
          >
            {t('friends.confirmRemove')}
          </Button>
        </>
      ) : (
        <>
          <Link to={`/echanges/nouveau?ami=${friend.id}`} className={styles.propose}>
            <Trade /> {t('friends.propose')}
          </Link>
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash />}
            aria-label={t('friends.remove', { name: friend.name })}
            onClick={() => setConfirming(true)}
          />
        </>
      )}
    </li>
  );
}

/** Code ami (à copier), ajout par code et visibilité dans la liste des joueurs. */
function CodePanel({ state, onChange }) {
  const { t } = useTranslation();
  const { data } = state;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard?.writeText(formatCode(data.code)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Panel className={styles.side}>
      {data && (
        <>
          <div className={styles.code}>
            <span className={styles.codeLabel}>{t('friends.myCode')}</span>
            <button type="button" className={styles.codeValue} onClick={copy}>
              {formatCode(data.code)}
              {copied ? <Check /> : <Copy />}
            </button>
            <small>{copied ? t('friends.copied') : t('friends.codeHint')}</small>
          </div>
          <AddFriendForm onAdded={onChange} />
          <div className={styles.visibility}>
            <Toggle
              checked={data.discoverable}
              onChange={(value) => api.friends.setDiscoverable(value).then(onChange, console.error)}
              label={t('players.discoverable')}
              description={t('players.discoverableHint')}
            />
          </div>
        </>
      )}
    </Panel>
  );
}

function AddFriendForm({ onAdded }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(null); // { error?, text }

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { status, user } = await api.friends.add(code);
      setCode('');
      setMessage({ text: t(`friends.added.${status}`, { name: user.name }) });
      onAdded();
    } catch (err) {
      const known = ['CODE_NOT_FOUND', 'SELF', 'RATE_LIMITED', 'VALIDATION_ERROR'];
      setMessage({
        error: true,
        text: t(`friends.errors.${known.includes(err.code) ? err.code : 'other'}`),
      });
    }
  };

  return (
    <div className={styles.addBlock}>
      <form className={styles.add} onSubmit={submit}>
        <TextField
          label={t('friends.addLabel')}
          placeholder="ABCD-EFGH"
          value={code}
          maxLength={12}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={message?.error || undefined}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setMessage(null);
          }}
        />
        <Button type="submit" variant="secondary" icon={<Plus />} disabled={code.trim().length < 8}>
          {t('friends.add')}
        </Button>
      </form>
      {message && (
        <p role="status" className={message.error ? styles.addError : styles.hint}>
          {message.text}
        </p>
      )}
    </div>
  );
}

/** Tous les joueurs (qui l'acceptent), par ordre alphabétique, à ajouter sans code. */
function Players({ version, onChange }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [pages, setPages] = useState(1);
  const q = query.trim();
  // Les pages déjà affichées sont rechargées ensemble : liste à jour après un ajout.
  const { data, error, loading } = useAsync(
    `players:${q}:${pages}:${version}`,
    async (signal) => {
      const results = await Promise.all(
        Array.from({ length: pages }, (_, i) =>
          api.friends.directory({ q, offset: i * PLAYERS_PAGE }, signal),
        ),
      );
      return { users: results.flatMap((r) => r.users), more: results.at(-1).more };
    },
    { delay: q ? 250 : 0 },
  );

  const act = (fn) => () => fn().then(onChange, console.error);
  return (
    <section className={styles.players}>
      <div className={styles.playersHead}>
        <h2>{t('players.title')}</h2>
        <p className={styles.hint}>{t('players.lead')}</p>
      </div>
      <div className={styles.search}>
        <Search className={styles.searchIcon} />
        <input
          type="search"
          value={query}
          placeholder={t('players.search')}
          aria-label={t('players.search')}
          onChange={(e) => {
            setQuery(e.target.value);
            setPages(1);
          }}
        />
      </div>
      {error && <ErrorMessage error={error} />}
      {!data && !error && <Loading />}
      {data?.users.length === 0 && (
        <p className={styles.hint}>{q ? t('players.noMatch') : t('players.none')}</p>
      )}
      {data?.users.length > 0 && (
        <ul className={`${styles.people} ${styles.playerList}`} aria-busy={loading}>
          {data.users.map((u, i) => {
            const initial = initialOf(u);
            const header = i === 0 || initialOf(data.users[i - 1]) !== initial;
            return (
              <li key={u.id}>
                <span className={styles.letter} aria-hidden>
                  {header && initial}
                </span>
                <Avatar user={u} />
                <span className={styles.personName}>{u.name}</span>
                {u.relation === null && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Plus />}
                    onClick={act(() => api.friends.addUser(u.id))}
                  >
                    {t('friends.add')}
                  </Button>
                )}
                {u.relation === 'incoming' && (
                  <Button size="sm" variant="primary" onClick={act(() => api.friends.accept(u.id))}>
                    {t('friends.accept')}
                  </Button>
                )}
                {u.relation === 'outgoing' && (
                  <span className={styles.relation}>{t('players.sent')}</span>
                )}
                {u.relation === 'friend' && (
                  <span className={styles.relation}>
                    <Check /> {t('players.friend')}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {data?.more && (
        <Button
          className={styles.more}
          size="sm"
          variant="ghost"
          onClick={() => setPages((p) => p + 1)}
        >
          {t('players.more')}
        </Button>
      )}
    </section>
  );
}
