/** Classeurs sauvegardés (table `binders`), toujours filtrés par propriétaire. */
export function createBinderStore(db) {
  const toBinder = (row) => ({
    id: row.id,
    name: row.name,
    setId: row.set_id,
    params: row.params,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  return {
    async list(userId) {
      const [rows] = await db.query(
        'SELECT * FROM binders WHERE user_id = ? ORDER BY updated_at DESC, id DESC',
        [userId],
      );
      return rows.map(toBinder);
    },

    async count(userId) {
      const [[row]] = await db.query('SELECT COUNT(*) AS n FROM binders WHERE user_id = ?', [
        userId,
      ]);
      return row.n;
    },

    async get(userId, id) {
      const [rows] = await db.query('SELECT * FROM binders WHERE user_id = ? AND id = ?', [
        userId,
        id,
      ]);
      return rows[0] ? toBinder(rows[0]) : null;
    },

    async create(userId, { name, params }) {
      const [result] = await db.query(
        'INSERT INTO binders (user_id, name, set_id, params) VALUES (?, ?, ?, ?)',
        [userId, name, params.setId, JSON.stringify(params)],
      );
      return this.get(userId, result.insertId);
    },

    async update(userId, id, { name, params }) {
      const changes = {};
      if (name !== undefined) changes.name = name;
      if (params !== undefined) {
        changes.set_id = params.setId;
        changes.params = JSON.stringify(params);
      }
      if (Object.keys(changes).length)
        await db.query('UPDATE binders SET ? WHERE user_id = ? AND id = ?', [changes, userId, id]);
      return this.get(userId, id);
    },

    async remove(userId, id) {
      const [result] = await db.query('DELETE FROM binders WHERE user_id = ? AND id = ?', [
        userId,
        id,
      ]);
      return result.affectedRows > 0;
    },
  };
}
