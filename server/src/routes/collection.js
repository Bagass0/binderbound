import { Router } from 'express';
import { HttpError } from '../middleware/errorHandler.js';
import { requireUser } from '../middleware/session.js';
import { collectionImportSchema, collectionReplaceSchema } from '../schemas/account.schema.js';

/** Collection de l'utilisateur connecté : les identifiants sont vérifiés contre le set. */
export function collectionRouter(repo, { collections }) {
  const router = Router();
  router.use(requireUser);

  const findSet = (setId) => {
    const set = repo.get(setId);
    if (!set) throw new HttpError(404, 'SET_NOT_FOUND', `Set "${setId}" introuvable`);
    return set;
  };
  const cardIdsOf = (set) => new Set(set.cards.map((c) => c.id));

  router.get('/:setId', async (req, res) => {
    findSet(req.params.setId);
    res.json({ cardIds: await collections.list(req.user.id, req.params.setId) });
  });

  router.put('/:setId', async (req, res) => {
    const known = cardIdsOf(findSet(req.params.setId));
    const { cardIds } = collectionReplaceSchema.parse(req.body ?? {});
    const unknown = cardIds.find((id) => !known.has(id));
    if (unknown) throw new HttpError(400, 'CARD_NOT_FOUND', `Carte "${unknown}" absente du set`);
    await collections.replace(req.user.id, req.params.setId, [...new Set(cardIds)]);
    res.status(204).end();
  });

  router.put('/:setId/cards/:cardId', async (req, res) => {
    const { setId, cardId } = req.params;
    if (!cardIdsOf(findSet(setId)).has(cardId))
      throw new HttpError(404, 'CARD_NOT_FOUND', `Carte "${cardId}" absente du set`);
    await collections.add(req.user.id, setId, cardId);
    res.status(204).end();
  });

  router.delete('/:setId/cards/:cardId', async (req, res) => {
    findSet(req.params.setId);
    await collections.remove(req.user.id, req.params.setId, req.params.cardId);
    res.status(204).end();
  });

  /** Fusionne la collection gardée dans le navigateur avant la connexion. Ignore l'inconnu. */
  router.post('/import', async (req, res) => {
    const { sets } = collectionImportSchema.parse(req.body ?? {});
    let imported = 0;
    for (const [setId, ids] of Object.entries(sets)) {
      const set = repo.get(setId);
      if (!set) continue;
      const known = cardIdsOf(set);
      const valid = [...new Set(ids)].filter((id) => known.has(id));
      await collections.merge(req.user.id, setId, valid);
      imported += valid.length;
    }
    res.json({ imported });
  });

  return router;
}
