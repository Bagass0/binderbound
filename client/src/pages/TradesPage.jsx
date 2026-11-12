import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import { useAsync } from '../hooks/useAsync.js';
import { usePrices, useSet } from '../hooks/useConfig.js';
import { notifyChanged } from '../hooks/useNotifications.js';
import { itemMotion } from '../lib/motion.js';
import { localizedName } from '../lib/format.js';
import { Avatar } from '../components/common/Avatar.jsx';
import { PageHeading } from '../components/common/PageHeading.jsx';
import { ErrorMessage, Loading } from '../components/common/StatusMessage.jsx';
import { TotalValue, TradeCards } from '../components/trade/TradeCards.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Plus, Trade, Users } from '../components/icons/Icons.jsx';
import styles from './TradesPage.module.css';

/** Propositions d'échange reçues, envoyées et passées (les amis ont leur propre page). */
export default function TradesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const refresh = () => {
    setVersion((v) => v + 1);
    notifyChanged();
  };
  const trades = useAsync(`trades:${user.id}:${version}`, (signal) => api.trades.list(signal));

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

      <div className={styles.toolbar}>
        <Button variant="primary" icon={<Plus />} onClick={() => navigate('/echanges/nouveau')}>
          {t('trades.new')}
        </Button>
        <Link to="/amis" className={styles.friendsLink}>
          <Users /> {t('trades.manageFriends')}
        </Link>
      </div>

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
    </>
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
