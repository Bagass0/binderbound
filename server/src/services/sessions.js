import { createHash, randomBytes } from 'node:crypto';

export const SESSION_DAYS = 30;

const digest = (token) => createHash('sha256').update(token).digest('hex');

/**
 * Sessions opaques : le navigateur garde un jeton aléatoire, la base n'en garde que l'empreinte.
 * Une fuite de la table ne permet donc pas d'usurper une session.
 */
export function createSessionStore(db) {
  return {
    async create(userId) {
      const token = randomBytes(32).toString('base64url');
      await db.query(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, UTC_TIMESTAMP() + INTERVAL ? DAY)',
        [digest(token), userId, SESSION_DAYS],
      );
      return token;
    },

    /** Utilisateur de la session, ou null si elle est inconnue ou expirée. */
    async findUser(token) {
      const [rows] = await db.query(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id = ? AND s.expires_at > UTC_TIMESTAMP()`,
        [digest(token)],
      );
      return rows[0] ?? null;
    },

    destroy: (token) => db.query('DELETE FROM sessions WHERE id = ?', [digest(token)]),

    purgeExpired: () => db.query('DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP()'),
  };
}
