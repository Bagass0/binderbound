import { HttpError } from '../middleware/errorHandler.js';
import { friendView } from './friends.js';

/** Au-delà, un utilisateur doit attendre des réponses avant de proposer d'autres échanges. */
export const MAX_PENDING_TRADES = 20;

const stale = () =>
  new HttpError(409, 'TRADE_STALE', "Certaines cartes de l'échange ne sont plus disponibles");

/** Doubles encore disponibles parmi `cardIds`, verrouillés jusqu'à la fin de la transaction. */
async function lockDoubles(conn, userId, setId, cardIds) {
  if (!cardIds.length) return new Set();
  const [rows] = await conn.query(
    `SELECT card_id FROM double_cards
     WHERE user_id = ? AND set_id = ? AND card_id IN (?) FOR UPDATE`,
    [userId, setId, cardIds],
  );
  return new Set(rows.map((r) => r.card_id));
}

/**
 * Propositions d'échange (tables `trades`, `trade_items`). Seuls des doubles s'échangent :
 * celui qui donne garde son exemplaire, celui qui reçoit gagne la carte (ou un double s'il
 * l'avait déjà).
 */
export function createTradeStore(db) {
  async function transaction(work) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const result = await work(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /** `giver` donne `cardIds` à `receiver` (doubles déjà verrouillés). */
  async function transfer(conn, setId, giver, receiver, cardIds) {
    if (!cardIds.length) return;
    const [owned] = await conn.query(
      'SELECT card_id FROM owned_cards WHERE user_id = ? AND set_id = ? AND card_id IN (?)',
      [receiver, setId, cardIds],
    );
    const already = new Set(owned.map((r) => r.card_id));
    await conn.query(
      'DELETE FROM double_cards WHERE user_id = ? AND set_id = ? AND card_id IN (?)',
      [giver, setId, cardIds],
    );
    await conn.query('INSERT IGNORE INTO owned_cards (user_id, set_id, card_id) VALUES ?', [
      cardIds.map((id) => [receiver, setId, id]),
    ]);
    const doubles = cardIds.filter((id) => already.has(id));
    if (doubles.length)
      await conn.query('INSERT IGNORE INTO double_cards (user_id, set_id, card_id) VALUES ?', [
        doubles.map((id) => [receiver, setId, id]),
      ]);
  }

  return {
    /**
     * Crée une proposition : `give` (doubles du proposant) contre `receive` (doubles du
     * destinataire). Lève TRADE_STALE si une carte n'est pas (ou plus) un double.
     */
    create({ proposerId, recipientId, setId, give, receive, message }) {
      return transaction(async (conn) => {
        const [[{ n }]] = await conn.query(
          "SELECT COUNT(*) AS n FROM trades WHERE proposer_id = ? AND status = 'pending'",
          [proposerId],
        );
        if (n >= MAX_PENDING_TRADES)
          throw new HttpError(429, 'TOO_MANY_TRADES', "Trop d'échanges en attente de réponse");
        const mine = await lockDoubles(conn, proposerId, setId, give);
        const theirs = await lockDoubles(conn, recipientId, setId, receive);
        if (mine.size !== give.length || theirs.size !== receive.length) throw stale();

        const [result] = await conn.query(
          'INSERT INTO trades (proposer_id, recipient_id, set_id, message) VALUES (?, ?, ?, ?)',
          [proposerId, recipientId, setId, message || null],
        );
        const items = [
          ...give.map((id) => [result.insertId, proposerId, id]),
          ...receive.map((id) => [result.insertId, recipientId, id]),
        ];
        await conn.query('INSERT INTO trade_items (trade_id, giver_id, card_id) VALUES ?', [items]);
        return result.insertId;
      });
    },

    /** Échanges de l'utilisateur, en attente d'abord, puis du plus récent au plus ancien. */
    async list(userId, { limit = 100 } = {}) {
      const [rows] = await db.query(
        `SELECT t.*, p.name AS p_name, p.avatar_url AS p_avatar, r.name AS r_name,
                r.avatar_url AS r_avatar
         FROM trades t
         JOIN users p ON p.id = t.proposer_id
         JOIN users r ON r.id = t.recipient_id
         WHERE t.proposer_id = ? OR t.recipient_id = ?
         ORDER BY t.status = 'pending' DESC, t.updated_at DESC, t.id DESC
         LIMIT ?`,
        [userId, userId, limit],
      );
      if (!rows.length) return [];
      // Une carte est « disponible » tant que celui qui la donne l'a encore en double.
      const [items] = await db.query(
        `SELECT i.trade_id, i.giver_id, i.card_id, d.card_id IS NOT NULL AS available
         FROM trade_items i
         JOIN trades t ON t.id = i.trade_id
         LEFT JOIN double_cards d
           ON d.user_id = i.giver_id AND d.set_id = t.set_id AND d.card_id = i.card_id
         WHERE i.trade_id IN (?)
         ORDER BY i.card_id`,
        [rows.map((r) => r.id)],
      );
      return rows.map((row) => {
        const of = (giver) =>
          items
            .filter((i) => i.trade_id === row.id && i.giver_id === giver)
            .map((i) => ({ cardId: i.card_id, available: Boolean(i.available) }));
        return {
          id: row.id,
          setId: row.set_id,
          status: row.status,
          message: row.message,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          proposer: friendView({ id: row.proposer_id, name: row.p_name, avatar_url: row.p_avatar }),
          recipient: friendView({
            id: row.recipient_id,
            name: row.r_name,
            avatar_url: row.r_avatar,
          }),
          give: of(row.proposer_id),
          receive: of(row.recipient_id),
        };
      });
    },

    /** Le destinataire accepte : les cartes changent de collection, en une transaction. */
    accept(tradeId, userId) {
      return transaction(async (conn) => {
        const [[trade]] = await conn.query('SELECT * FROM trades WHERE id = ? FOR UPDATE', [
          tradeId,
        ]);
        if (!trade || trade.recipient_id !== userId)
          throw new HttpError(404, 'TRADE_NOT_FOUND', 'Échange introuvable');
        if (trade.status !== 'pending')
          throw new HttpError(409, 'TRADE_CLOSED', 'Cet échange est déjà terminé');

        const [items] = await conn.query(
          'SELECT giver_id, card_id FROM trade_items WHERE trade_id = ?',
          [tradeId],
        );
        const from = (giver) => items.filter((i) => i.giver_id === giver).map((i) => i.card_id);
        const give = from(trade.proposer_id);
        const receive = from(trade.recipient_id);
        const mine = await lockDoubles(conn, trade.proposer_id, trade.set_id, give);
        const theirs = await lockDoubles(conn, trade.recipient_id, trade.set_id, receive);
        if (mine.size !== give.length || theirs.size !== receive.length) throw stale();

        await transfer(conn, trade.set_id, trade.proposer_id, trade.recipient_id, give);
        await transfer(conn, trade.set_id, trade.recipient_id, trade.proposer_id, receive);
        await conn.query("UPDATE trades SET status = 'accepted' WHERE id = ?", [tradeId]);
      });
    },

    /**
     * Clôt un échange en attente : refus (par le destinataire) ou annulation (par le proposant).
     * Renvoie false si l'utilisateur n'a pas ce droit ou si l'échange n'est plus en attente.
     */
    async close(tradeId, userId, status) {
      const column = status === 'declined' ? 'recipient_id' : 'proposer_id';
      const [result] = await db.query(
        `UPDATE trades SET status = ? WHERE id = ? AND ${column} = ? AND status = 'pending'`,
        [status, tradeId, userId],
      );
      return result.affectedRows > 0;
    },

    /** Propositions reçues qui attendent une réponse. */
    async incomingCount(userId) {
      const [[row]] = await db.query(
        "SELECT COUNT(*) AS n FROM trades WHERE recipient_id = ? AND status = 'pending'",
        [userId],
      );
      return row.n;
    },
  };
}
