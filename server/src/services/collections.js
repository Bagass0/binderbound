/**
 * Cartes possédées (table `owned_cards`) et doubles (`double_cards`), par utilisateur et par set.
 * Un double est toujours une carte possédée : retirer une carte retire aussi son double.
 */
export function createCollectionStore(db) {
  const insertMany = (conn, userId, setId, cardIds) =>
    cardIds.length
      ? conn.query('INSERT IGNORE INTO owned_cards (user_id, set_id, card_id) VALUES ?', [
          cardIds.map((cardId) => [userId, setId, cardId]),
        ])
      : null;

  return {
    async list(userId, setId) {
      const [rows] = await db.query(
        'SELECT card_id FROM owned_cards WHERE user_id = ? AND set_id = ? ORDER BY card_id',
        [userId, setId],
      );
      return rows.map((r) => r.card_id);
    },

    /** Toute la collection d'un utilisateur : { setId: [cardId…] } (export des données). */
    async all(userId) {
      const [rows] = await db.query(
        'SELECT set_id, card_id FROM owned_cards WHERE user_id = ? ORDER BY set_id, card_id',
        [userId],
      );
      const result = {};
      for (const row of rows) (result[row.set_id] ??= []).push(row.card_id);
      return result;
    },

    /** Cartes possédées de chaque set demandé : Map setId → Set(cardId). */
    async bySet(userId, setIds) {
      const result = new Map(setIds.map((id) => [id, new Set()]));
      if (!setIds.length) return result;
      const [rows] = await db.query(
        'SELECT set_id, card_id FROM owned_cards WHERE user_id = ? AND set_id IN (?)',
        [userId, setIds],
      );
      for (const row of rows) result.get(row.set_id)?.add(row.card_id);
      return result;
    },

    add: (userId, setId, cardId) => insertMany(db, userId, setId, [cardId]),

    async remove(userId, setId, cardId) {
      const params = [userId, setId, cardId];
      await db.query(
        'DELETE FROM double_cards WHERE user_id = ? AND set_id = ? AND card_id = ?',
        params,
      );
      await db.query(
        'DELETE FROM owned_cards WHERE user_id = ? AND set_id = ? AND card_id = ?',
        params,
      );
    },

    /** Remplace toute la collection d'un set, en une transaction. */
    async replace(userId, setId, cardIds) {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM owned_cards WHERE user_id = ? AND set_id = ?', [
          userId,
          setId,
        ]);
        await insertMany(conn, userId, setId, cardIds);
        // Les doubles des cartes qui ne sont plus possédées disparaissent avec elles.
        await conn.query(
          `DELETE d FROM double_cards d
           LEFT JOIN owned_cards o USING (user_id, set_id, card_id)
           WHERE d.user_id = ? AND d.set_id = ? AND o.card_id IS NULL`,
          [userId, setId],
        );
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    },

    /** Ajoute des cartes sans rien retirer (import de la collection locale du navigateur). */
    merge: (userId, setId, cardIds) => insertMany(db, userId, setId, cardIds),

    async doubles(userId, setId) {
      const [rows] = await db.query(
        'SELECT card_id FROM double_cards WHERE user_id = ? AND set_id = ? ORDER BY card_id',
        [userId, setId],
      );
      return rows.map((r) => r.card_id);
    },

    /** Tous les doubles d'un utilisateur : { setId: [cardId…] }. */
    async allDoubles(userId) {
      const [rows] = await db.query(
        'SELECT set_id, card_id FROM double_cards WHERE user_id = ? ORDER BY set_id, card_id',
        [userId],
      );
      const result = {};
      for (const row of rows) (result[row.set_id] ??= []).push(row.card_id);
      return result;
    },

    /** Marque un double : la carte devient possédée si elle ne l'était pas. */
    async addDouble(userId, setId, cardId) {
      await insertMany(db, userId, setId, [cardId]);
      await db.query(
        'INSERT IGNORE INTO double_cards (user_id, set_id, card_id) VALUES (?, ?, ?)',
        [userId, setId, cardId],
      );
    },

    removeDouble: (userId, setId, cardId) =>
      db.query('DELETE FROM double_cards WHERE user_id = ? AND set_id = ? AND card_id = ?', [
        userId,
        setId,
        cardId,
      ]),
  };
}
