import { Router } from 'express';
import { HttpError } from '../middleware/errorHandler.js';
import { requireUser } from '../middleware/session.js';
import { idParamSchema, tradeCreateSchema } from '../schemas/account.schema.js';

/** Propositions d'échange entre amis, sur un set à la fois. */
export function tradesRouter(repo, { friends, trades }) {
  const router = Router();
  router.use(requireUser);

  router.get('/', async (req, res) => {
    res.json({ trades: await trades.list(req.user.id) });
  });

  /** Ce qui attend une réponse : pastille de la navigation. */
  router.get('/summary', async (req, res) => {
    const [friendRequests, incoming] = await Promise.all([
      friends.incomingCount(req.user.id),
      trades.incomingCount(req.user.id),
    ]);
    res.json({ friendRequests, trades: incoming });
  });

  router.post('/', async (req, res) => {
    const body = tradeCreateSchema.parse(req.body ?? {});
    const set = repo.get(body.setId);
    if (!set) throw new HttpError(404, 'SET_NOT_FOUND', `Set "${body.setId}" introuvable`);
    const known = new Set(set.cards.map((c) => c.id));
    const unknown = [...body.give, ...body.receive].find((id) => !known.has(id));
    if (unknown) throw new HttpError(400, 'CARD_NOT_FOUND', `Carte "${unknown}" absente du set`);
    if (!(await friends.areFriends(req.user.id, body.friendId)))
      throw new HttpError(404, 'FRIEND_NOT_FOUND', 'Ami introuvable');

    const id = await trades.create({
      ...body,
      proposerId: req.user.id,
      recipientId: body.friendId,
    });
    res.status(201).json({ id });
  });

  router.post('/:id/accept', async (req, res) => {
    await trades.accept(idParamSchema.parse(req.params.id), req.user.id);
    res.status(204).end();
  });

  for (const [action, status] of [
    ['decline', 'declined'],
    ['cancel', 'cancelled'],
  ]) {
    router.post(`/:id/${action}`, async (req, res) => {
      if (!(await trades.close(idParamSchema.parse(req.params.id), req.user.id, status)))
        throw new HttpError(404, 'TRADE_NOT_FOUND', 'Échange introuvable ou déjà terminé');
      res.status(204).end();
    });
  }

  return router;
}
