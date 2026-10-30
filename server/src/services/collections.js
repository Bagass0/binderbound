/** Cartes possédées (table `owned_cards`), par utilisateur et par set. */
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

    remove: (userId, setId, cardId) =>
      db.query('DELETE FROM owned_cards WHERE user_id = ? AND set_id = ? AND card_id = ?', [
        userId,
        setId,
        cardId,
      ]),

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
  };
}
