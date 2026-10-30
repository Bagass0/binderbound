/** Utilisateurs (table `users`). Les e-mails sont normalisés en minuscules avant d'arriver ici. */
export function createUserStore(db) {
  const one = async (sql, params) => (await db.query(sql, params))[0][0] ?? null;

  return {
    findById: (id) => one('SELECT * FROM users WHERE id = ?', [id]),
    findByEmail: (email) => one('SELECT * FROM users WHERE email = ?', [email]),
    findByGoogleSub: (sub) => one('SELECT * FROM users WHERE google_sub = ?', [sub]),

    async create({ email, name, passwordHash = null, googleSub = null, avatarUrl = null }) {
      const [result] = await db.query(
        'INSERT INTO users (email, name, password_hash, google_sub, avatar_url) VALUES (?, ?, ?, ?, ?)',
        [email, name, passwordHash, googleSub, avatarUrl],
      );
      return this.findById(result.insertId);
    },

    /** Rattache un compte Google à un compte existant (même e-mail vérifié). */
    async linkGoogle(id, { googleSub, avatarUrl }) {
      await db.query(
        'UPDATE users SET google_sub = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?',
        [googleSub, avatarUrl, id],
      );
      return this.findById(id);
    },
  };
}

/** Ce que le client a le droit de voir d'un utilisateur. */
export const publicUser = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  avatarUrl: row.avatar_url,
  hasPassword: row.password_hash !== null,
  hasGoogle: row.google_sub !== null,
});
