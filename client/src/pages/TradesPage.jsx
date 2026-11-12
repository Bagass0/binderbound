import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useAsync } from '../hooks/useAsync.js';
import { usePrices, useSet } from '../hooks/useConfig.js';
import { notifyTradesChanged } from '../hooks/useTradeSummary.js';
import { itemMotion } from '../lib/motion.js';
import { localizedName } from '../lib/format.js';
import { PageHeading } from '../components/common/PageHeading.jsx';
import { ErrorMessage, Loading } from '../components/common/StatusMessage.jsx';
import { TotalValue, TradeCards } from '../components/trade/TradeCards.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { TextField } from '../components/ui/TextField.jsx';
import { Check, Copy, Plus, Trade, Trash } from '../components/icons/Icons.jsx';
import styles from './TradesPage.module.css';

/** « ABCD-EFGH » : plus lisible à dicter ou recopier. */
const formatCode = (code) => (code ? `${code.slice(0, 4)}-${code.slice(4)}` : '');

/** Amis (ajout par code ami) et propositions d'échange reçues, envoyées et passées. */
export default function TradesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const refresh = () => {
    setVersion((v) => v + 1);
    notifyTradesChanged();
  };
  const key = `${user.id}:${version}`;
  const friends = useAsync(`friends:${key}`, (signal) => api.friends.list(signal));
  const trades = useAsync(`trades:${key}`, (signal) => api.trades.list(signal));

  const list = trades.data?.trades ?? [];
  const groups = [
    ['incoming', list.filter((tr) => tr.status === 'pending' && tr.recipient.id === user.id)],
    ['outgoing', list.filter((tr) => tr.status === 'pending' && tr.proposer.id === user.id)],
    ['history', list.filter((tr) => tr.status !== 'pending')],
  ];

  return (
    <>
      <PageHeading eyebrow={t('trades.eyebrow')} title={t('trades.title')}>
        {t('trades.lead')}
      </PageHeading>

      <div className={styles.layout}>
        <FriendsPanel state={friends} onChange={refresh} />

        <div className={styles.trades}>
          {trades.error && <ErrorMessage error={trades.error} />}
          {!trades.data && !trades.error && <Loading />}
          {trades.data && list.length === 0 && (
            <p className={styles.empty}>
              <Trade className={styles.emptyIcon} />
              {t('trades.none')}
            </p>
          )}
          {groups.map(
            ([group, items]) =>
              items.length > 0 && (
                <section key={group} className={styles.group}>
                  <h2 className={styles.groupTitle}>
                    {t(`trades.groups.${group}`)} <span>{items.length}</span>
                  </h2>
                  <ul className={styles.list}>
                    <AnimatePresence initial={false}>
                      {items.map((trade) => (
                        <motion.li
                          key={trade.id}
                          layout
                          variants={itemMotion}
                          initial="hidden"
                          animate="show"
                          exit={{ opacity: 0 }}
                        >
                          <TradeCard trade={trade} me={user.id} onChange={refresh} />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ),
          )}
        </div>
      </div>
    </>
  );
}

function Avatar({ user, size = 'md' }) {
  return user.avatarUrl ? (
    <img
      className={`${styles.avatar} ${styles[size]}`}
      src={user.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
    />
  ) : (
    <span className={`${styles.avatar} ${styles[size]}`} aria-hidden>
      {user.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function FriendsPanel({ state, onChange }) {
  const { t } = useTranslation();
  const { data, error } = state;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard?.writeText(formatCode(data.code)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const act = (fn) => () => fn().then(onChange, console.error);

  return (
    <Panel className={styles.friends} title={t('friends.title')}>
      {error && <ErrorMessage error={error} />}
      {!data && !error && <Loading />}
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

          {data.incoming.length > 0 && (
            <div className={styles.block}>
              <h3>{t('friends.incoming')}</h3>
              <ul className={styles.people}>
                {data.incoming.map((f) => (
                  <li key={f.id}>
                    <Avatar user={f} />
                    <span className={styles.personName}>{f.name}</span>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={act(() => api.friends.accept(f.id))}
                    >
                      {t('friends.accept')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={act(() => api.friends.remove(f.id))}>
                      {t('friends.decline')}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.block}>
            <h3>{t('friends.list', { count: data.friends.length })}</h3>
            {data.friends.length === 0 ? (
              <p className={styles.hint}>{t('friends.none')}</p>
            ) : (
              <ul className={styles.people}>
                {data.friends.map((f) => (
                  <FriendRow key={f.id} friend={f} onRemoved={onChange} />
                ))}
              </ul>
            )}
          </div>

          {data.outgoing.length > 0 && (
            <div className={styles.block}>
              <h3>{t('friends.outgoing')}</h3>
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
            </div>
          )}
        </>
      )}
    </Panel>
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

/** Une proposition, vue du côté de l'utilisateur : ce qu'il donne et ce qu'il reçoit. */
function TradeCard({ trade, me, onChange }) {
  const { t, i18n } = useTranslation();
  const { data: set } = useSet(trade.setId);
  const { data: prices } = usePrices(trade.setId);
  const [error, setError] = useState(null);
  const mine = trade.proposer.id === me;
  const other = mine ? trade.recipient : trade.proposer;
  const [gives, gets] = mine ? [trade.give, trade.receive] : [trade.receive, trade.give];
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
    new Date(trade.updatedAt),
  );

  const byId = new Map(set?.cards.map((c) => [c.id, c]));
  const cardsOf = (items) => items.map((i) => byId.get(i.cardId)).filter(Boolean);
  const unavailable = new Set(
    trade.status === 'pending'
      ? [...trade.give, ...trade.receive].filter((i) => !i.available).map((i) => i.cardId)
      : [],
  );
  const pending = trade.status === 'pending';

  const run = (fn) => async () => {
    setError(null);
    try {
      await fn(trade.id);
      onChange();
    } catch (err) {
      setError(err.code === 'TRADE_STALE' ? t('trades.stale') : t('trades.failed'));
    }
  };

  return (
    <article className={`${styles.trade} ${pending ? '' : styles.closed}`}>
      <header className={styles.tradeHead}>
        <Avatar user={other} size="sm" />
        <span>
          {t(mine ? 'trades.with' : 'trades.from', { name: other.name })}
          <small>
            {set ? `${set.code} · ${localizedName(set, i18n.language)}` : trade.setId} · {date}
          </small>
        </span>
        <span className={`${styles.status} ${styles[trade.status]}`}>
          {t(`trades.status.${trade.status}`)}
        </span>
      </header>

      {trade.message && <blockquote className={styles.message}>{trade.message}</blockquote>}

      {!set ? (
        <Loading />
      ) : (
        <div className={styles.sides}>
          <div>
            <h3>
              {t('trades.youGive')}
              <TotalValue prices={prices} cards={cardsOf(gives)} />
            </h3>
            <TradeCards
              cards={cardsOf(gives)}
              prices={prices}
              unavailable={unavailable}
              empty={t('trades.nothing')}
            />
          </div>
          <Trade className={styles.arrows} />
          <div>
            <h3>
              {t('trades.youGet')}
              <TotalValue prices={prices} cards={cardsOf(gets)} />
            </h3>
            <TradeCards
              cards={cardsOf(gets)}
              prices={prices}
              unavailable={unavailable}
              empty={t('trades.nothing')}
            />
          </div>
        </div>
      )}

      {pending && unavailable.size > 0 && <p className={styles.warning}>{t('trades.stale')}</p>}
      {error && <p className={styles.warning}>{error}</p>}

      {pending && (
        <div className={styles.tradeActions}>
          {mine ? (
            <Button size="sm" variant="ghost" onClick={run(api.trades.cancel)}>
              {t('trades.cancel')}
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={run(api.trades.decline)}>
                {t('trades.decline')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={unavailable.size > 0}
                onClick={run(api.trades.accept)}
              >
                {t('trades.accept')}
              </Button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
