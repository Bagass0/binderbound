import { friendView } from './friends.js';

/** Au-delà, les plus anciennes notifications ne sont plus affichées. */
const LIMIT = 30;

/**
 * Notifications (table `notifications`) : demandes d'ami, amitiés acceptées, échanges reçus,
 * acceptés, refusés ou annulés. `add` accepte une connexion pour écrire dans une transaction.
 */
export function createNotificationStore(db) {
  return {
    add: (userId, type, actorId, { tradeId = null, conn = db } = {}) =>
      conn.query(
        'INSERT INTO notifications (user_id, type, actor_id, trade_id) VALUES (?, ?, ?, ?)',
        [userId, type, actorId, tradeId],
      ),

    /**
     * Notifications récentes. Pour une demande d'ami, `pending` indique si elle attend encore
     * une réponse (on peut alors l'accepter depuis la notification) ; sinon elle a été acceptée
     * (une demande refusée ou annulée est supprimée).
     */
    async list(userId) {
      const [rows] = await db.query(
        `SELECT n.*, u.name, u.avatar_url, t.set_id,
                f.status = 'pending' AS pending
         FROM notifications n
         JOIN users u ON u.id = n.actor_id
         LEFT JOIN trades t ON t.id = n.trade_id
         LEFT JOIN friendships f ON n.type = 'friend_request'
           AND f.requester_id = n.actor_id AND f.addressee_id = n.user_id
         WHERE n.user_id = ?
         ORDER BY n.created_at DESC, n.id DESC
         LIMIT ?`,
        [userId, LIMIT],
      );
      return rows.map((row) => ({
        id: row.id,
        type: row.type,
        createdAt: row.created_at,
        read: row.read_at !== null,
        actor: friendView({ id: row.actor_id, name: row.name, avatar_url: row.avatar_url }),
        trade: row.trade_id ? { id: row.trade_id, setId: row.set_id } : null,
        pending: row.type === 'friend_request' ? Boolean(row.pending) : undefined,
      }));
    },

    async unreadCount(userId) {
      const [[row]] = await db.query(
        'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL',
        [userId],
      );
      return row.n;
    },

    markAllRead: (userId) =>
      db.query(
        'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL',
        [userId],
      ),

    /** Une demande d'ami annulée ou refusée n'a plus lieu d'être signalée. */
    removeFriendRequest: (userId, actorId) =>
      db.query(
        "DELETE FROM notifications WHERE type = 'friend_request' AND user_id = ? AND actor_id = ?",
        [userId, actorId],
      ),
  };
}
