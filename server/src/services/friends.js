import { randomInt } from 'node:crypto';

/** Sans caractères ambigus (0/O, 1/I/L) : un code se recopie sans erreur. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;
const newCode = () =>
  Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(
    '',
  );

/** Ce qu'un ami voit d'un autre utilisateur : ni e-mail, ni identifiants de connexion. */
export const friendView = (row) => ({ id: row.id, name: row.name, avatarUrl: row.avatar_url });

/** Amitiés (table `friendships`) et codes ami (`users.friend_code`). */
export function createFriendStore(db) {
  return {
    /** Code ami de l'utilisateur, créé à la première demande. */
    async codeOf(userId) {
      for (let attempt = 0; ; attempt++) {
        const [[row]] = await db.query('SELECT friend_code FROM users WHERE id = ?', [userId]);
        if (row?.friend_code) return row.friend_code;
        try {
          await db.query('UPDATE users SET friend_code = ? WHERE id = ? AND friend_code IS NULL', [
            newCode(),
            userId,
          ]);
        } catch (err) {
          // Collision (code déjà attribué) : on en tire un autre.
          if (err.code !== 'ER_DUP_ENTRY' || attempt > 5) throw err;
        }
      }
    },

    async findByCode(code) {
      const [[row]] = await db.query('SELECT * FROM users WHERE friend_code = ?', [code]);
      return row ?? null;
    },

    /** Amis et demandes en cours : { friends, incoming, outgoing }. */
    async list(userId) {
      const [rows] = await db.query(
        `SELECT u.id, u.name, u.avatar_url, f.status, f.requester_id, f.created_at
         FROM friendships f
         JOIN users u ON u.id = IF(f.requester_id = ?, f.addressee_id, f.requester_id)
         WHERE f.requester_id = ? OR f.addressee_id = ?
         ORDER BY u.name`,
        [userId, userId, userId],
      );
      const result = { friends: [], incoming: [], outgoing: [] };
      for (const row of rows) {
        const list =
          row.status === 'accepted'
            ? result.friends
            : row.requester_id === userId
              ? result.outgoing
              : result.incoming;
        list.push({ ...friendView(row), since: row.created_at });
      }
      return result;
    },

    async areFriends(a, b) {
      const [[row]] = await db.query(
        `SELECT 1 AS ok FROM friendships WHERE status = 'accepted'
         AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`,
        [a, b, b, a],
      );
      return Boolean(row);
    },

    /**
     * Demande d'ami de `fromId` à `toId`. Si l'autre avait déjà demandé, l'amitié est conclue.
     * Renvoie 'requested', 'accepted', 'pending' (déjà demandé) ou 'friends' (déjà amis).
     */
    async request(fromId, toId) {
      const [rows] = await db.query(
        `SELECT requester_id, status FROM friendships
         WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
        [fromId, toId, toId, fromId],
      );
      const existing = rows[0];
      if (existing?.status === 'accepted') return 'friends';
      if (existing?.requester_id === fromId) return 'pending';
      if (existing) {
        await this.accept(fromId, toId);
        return 'accepted';
      }
      await db.query('INSERT INTO friendships (requester_id, addressee_id) VALUES (?, ?)', [
        fromId,
        toId,
      ]);
      return 'requested';
    },

    /** Accepte la demande de `requesterId` ; false s'il n'y en avait pas. */
    async accept(userId, requesterId) {
      const [result] = await db.query(
        `UPDATE friendships SET status = 'accepted'
         WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`,
        [requesterId, userId],
      );
      return result.affectedRows > 0;
    },

    /**
     * Retire un ami, refuse ou annule une demande. Les échanges en attente entre les deux
     * sont annulés. Renvoie false si aucun lien n'existait.
     */
    async remove(userId, otherId) {
      const [result] = await db.query(
        `DELETE FROM friendships
         WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
        [userId, otherId, otherId, userId],
      );
      await db.query(
        `UPDATE trades SET status = 'cancelled' WHERE status = 'pending'
         AND ((proposer_id = ? AND recipient_id = ?) OR (proposer_id = ? AND recipient_id = ?))`,
        [userId, otherId, otherId, userId],
      );
      return result.affectedRows > 0;
    },

    /** Nombre de demandes d'ami reçues en attente. */
    async incomingCount(userId) {
      const [[row]] = await db.query(
        "SELECT COUNT(*) AS n FROM friendships WHERE addressee_id = ? AND status = 'pending'",
        [userId],
      );
      return row.n;
    },
  };
}
