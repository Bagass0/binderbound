import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useCollection } from '../hooks/useCollection.js';
import { usePrices, useSet, useSets } from '../hooks/useConfig.js';
import { notifyChanged } from '../hooks/useNotifications.js';
import { localizedName } from '../lib/format.js';
import { PageHeading } from '../components/common/PageHeading.jsx';
import { ErrorMessage, Loading } from '../components/common/StatusMessage.jsx';
import { TotalValue, TradeCards } from '../components/trade/TradeCards.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Toggle } from '../components/ui/controls.jsx';
import { ChevronLeft, Trade } from '../components/icons/Icons.jsx';
import styles from './TradeComposerPage.module.css';

const byNumber = new Intl.Collator('en', { numeric: true }).compare;
const sortCards = (cards) => cards.toSorted((a, b) => a.number - b.number || byNumber(a.id, b.id));

/**
 * Nouvelle proposition d'échange : un ami, un set, puis des doubles de chaque côté.
 * Par défaut, seuls les doubles qui manquent à l'autre sont proposés.
 */
export default function TradeComposerPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const friendId = Number(params.get('ami')) || null;
  const setId = params.get('set') || '';
  const { data: friendsData, error } = useAsync('friends', (signal) => api.friends.list(signal));
  const { data: sets } = useSets();

  const choose = (key, value) =>
    setParams(
      (p) => {
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );

  const friends = friendsData?.friends ?? [];
  const friend = friends.find((f) => f.id === friendId);

  return (
    <>
      <Link to="/echanges" className={styles.back}>
        <ChevronLeft /> {t('trades.title')}
      </Link>
      <PageHeading eyebrow={t('compose.eyebrow')} title={t('compose.title')}>
        {t('compose.lead')}
      </PageHeading>

      {error && <ErrorMessage error={error} />}
      {!friendsData && !error && <Loading />}

      {friendsData && friends.length === 0 && (
        <p className={styles.notice}>
          {t('compose.noFriends')} <Link to="/echanges">{t('compose.addFriends')}</Link>
        </p>
      )}

      {friends.length > 0 && (
        <div className={styles.pickers}>
          <label>
            {t('compose.friend')}
            <select value={friendId ?? ''} onChange={(e) => choose('ami', e.target.value)}>
              <option value="" disabled>
                {t('compose.chooseFriend')}
              </option>
              {friends.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('compose.set')}
            <select value={setId} onChange={(e) => choose('set', e.target.value)}>
              <option value="" disabled>
                {t('compose.chooseSet')}
              </option>
              {sets?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {localizedName(s, i18n.language)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {friend && setId && <Composer key={`${friend.id}:${setId}`} friend={friend} setId={setId} />}
    </>
  );
}

function Composer({ friend, setId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: set, error: loadError } = useSet(setId);
  const { data: prices } = usePrices(setId);
  const mine = useCollection(setId);
  const theirs = useAsync(`friend:${friend.id}:${setId}`, (signal) =>
    api.friends.collection(friend.id, setId, signal),
  );
  const [onlyUseful, setOnlyUseful] = useState(true);
  const [give, setGive] = useState(() => new Set());
  const [receive, setReceive] = useState(() => new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const their = useMemo(
    () => ({
      owned: new Set(theirs.data?.cardIds),
      doubles: new Set(theirs.data?.doubleIds),
    }),
    [theirs.data],
  );
  const cards = useMemo(() => (set ? sortCards(set.cards) : []), [set]);

  if (loadError || theirs.error) return <ErrorMessage error={loadError ?? theirs.error} />;
  if (!set || !theirs.data) return <Loading />;

  // Mes doubles qui lui manquent / ses doubles qui me manquent (ce que l'échange apporte).
  const myDoubles = cards.filter((c) => mine.doubles.has(c.id));
  const theirDoubles = cards.filter((c) => their.doubles.has(c.id));
  const visible = (list, useful) => (onlyUseful ? list.filter(useful) : list);
  const giveList = visible(myDoubles, (c) => !their.owned.has(c.id) || give.has(c.id));
  const receiveList = visible(theirDoubles, (c) => !mine.owned.has(c.id) || receive.has(c.id));

  const toggle = (setter) => (cardId) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  const picked = (ids) => cards.filter((c) => ids.has(c.id));

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await api.trades.create({
        friendId: friend.id,
        setId,
        give: [...give],
        receive: [...receive],
        message: message.trim() || undefined,
      });
      notifyChanged();
      navigate('/echanges');
    } catch (err) {
      setError(err.code === 'TRADE_STALE' ? t('trades.stale') : t('compose.failed'));
      setSending(false);
    }
  };

  return (
    <>
      <div className={styles.options}>
        <Toggle
          checked={onlyUseful}
          onChange={setOnlyUseful}
          label={t('compose.onlyUseful')}
          description={t('compose.onlyUsefulHint')}
        />
      </div>

      <div className={styles.columns}>
        <section className={styles.column}>
          <h2>
            {t('compose.yourDoubles')}
            <span>{t('compose.selected', { count: give.size })}</span>
          </h2>
          <TradeCards
            cards={giveList}
            prices={prices}
            selected={give}
            onToggle={toggle(setGive)}
            tag={(c) => !their.owned.has(c.id) && t('compose.theyNeed')}
            empty={
              myDoubles.length ? (
                t('compose.nothingUseful', { name: friend.name })
              ) : (
                <>
                  {t('compose.noDoubles')}{' '}
                  <Link to={`/collection/${setId}`}>{t('compose.markDoubles')}</Link>
                </>
              )
            }
          />
        </section>

        <section className={styles.column}>
          <h2>
            {t('compose.theirDoubles', { name: friend.name })}
            <span>{t('compose.selected', { count: receive.size })}</span>
          </h2>
          <TradeCards
            cards={receiveList}
            prices={prices}
            selected={receive}
            onToggle={toggle(setReceive)}
            tag={(c) => !mine.owned.has(c.id) && t('compose.youNeed')}
            empty={
              theirDoubles.length
                ? t('compose.nothingForYou')
                : t('compose.noTheirDoubles', { name: friend.name })
            }
          />
        </section>
      </div>

      <div className={styles.summary}>
        <div className={styles.balance}>
          <span>
            {t('compose.give', { count: give.size })}
            <strong>
              <TotalValue prices={prices} cards={picked(give)} />
            </strong>
          </span>
          <Trade className={styles.arrows} />
          <span>
            {t('compose.get', { count: receive.size })}
            <strong>
              <TotalValue prices={prices} cards={picked(receive)} />
            </strong>
          </span>
        </div>
        <input
          className={styles.message}
          type="text"
          value={message}
          maxLength={280}
          placeholder={t('compose.message')}
          aria-label={t('compose.message')}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button
          variant="primary"
          disabled={sending || give.size + receive.size === 0}
          onClick={send}
        >
          {t('compose.send', { name: friend.name })}
        </Button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </>
  );
}
