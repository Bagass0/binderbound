import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../middleware/errorHandler.js';
import { requireUser } from '../middleware/session.js';
import {
  directoryQuerySchema,
  discoverableSchema,
  friendRequestSchema,
  idParamSchema,
} from '../schemas/account.schema.js';
import { friendView } from '../services/friends.js';

/** Limite les essais de codes ami (on ne devine pas le code de quelqu'un en boucle). */
const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user.id),
  handler: (_req, _res, next) =>
    next(new HttpError(429, 'RATE_LIMITED', 'Trop de tentatives, réessaie plus tard')),
});

/**
 * Amis : ajout par code ami ou depuis la liste des joueurs, demandes à accepter, collection
 * d'un ami pour préparer un échange.
 */
export function friendsRouter(repo, { friends, collections }) {
  const router = Router();
  router.use(requireUser);

  const otherId = (req) => {
    const id = idParamSchema.parse(req.params.id);
    if (id === req.user.id) throw new HttpError(400, 'SELF', "C'est toi !");
    return id;
  };

  router.get('/', async (req, res) => {
    const [code, lists, discoverable] = await Promise.all([
      friends.codeOf(req.user.id),
      friends.list(req.user.id),
      friends.isDiscoverable(req.user.id),
    ]);
    res.json({ code, discoverable, ...lists });
  });

  /** Liste des joueurs par ordre alphabétique : { users, more }. */
  router.get('/directory', async (req, res) => {
    const { q, offset } = directoryQuerySchema.parse(req.query);
    res.json(await friends.directory(req.user.id, { query: q, offset }));
  });

  /** Apparaître ou non dans la liste des joueurs. */
  router.put('/settings', async (req, res) => {
    const { discoverable } = discoverableSchema.parse(req.body ?? {});
    await friends.setDiscoverable(req.user.id, discoverable);
    res.status(204).end();
  });

  /** Ajoute un joueur de la liste, sans son code. */
  router.post('/users/:id', requestLimiter, async (req, res) => {
    const target = await friends.findDiscoverable(otherId(req));
    if (!target) throw new HttpError(404, 'USER_NOT_FOUND', 'Joueur introuvable');
    const status = await friends.request(req.user.id, target.id);
    res.status(status === 'requested' ? 201 : 200).json({ status, user: friendView(target) });
  });

  /** Ajoute par code : demande envoyée, ou amitié conclue si l'autre avait déjà demandé. */
  router.post('/', requestLimiter, async (req, res) => {
    const { code } = friendRequestSchema.parse(req.body ?? {});
    const target = await friends.findByCode(code);
    if (!target) throw new HttpError(404, 'CODE_NOT_FOUND', 'Aucun joueur avec ce code');
    if (target.id === req.user.id) throw new HttpError(400, 'SELF', "C'est ton propre code");
    const status = await friends.request(req.user.id, target.id);
    res.status(status === 'requested' ? 201 : 200).json({ status, user: friendView(target) });
  });

  router.post('/:id/accept', async (req, res) => {
    if (!(await friends.accept(req.user.id, otherId(req))))
      throw new HttpError(404, 'REQUEST_NOT_FOUND', 'Demande introuvable');
    res.status(204).end();
  });

  /** Retire un ami, refuse une demande reçue ou annule une demande envoyée. */
  router.delete('/:id', async (req, res) => {
    if (!(await friends.remove(req.user.id, otherId(req))))
      throw new HttpError(404, 'FRIEND_NOT_FOUND', 'Ami introuvable');
    res.status(204).end();
  });

  /** Cartes possédées et doubles d'un ami pour un set (visibles des seuls amis). */
  router.get('/:id/collection/:setId', async (req, res) => {
    const id = otherId(req);
    if (!repo.get(req.params.setId))
      throw new HttpError(404, 'SET_NOT_FOUND', `Set "${req.params.setId}" introuvable`);
    if (!(await friends.areFriends(req.user.id, id)))
      throw new HttpError(404, 'FRIEND_NOT_FOUND', 'Ami introuvable');
    const [cardIds, doubleIds] = await Promise.all([
      collections.list(id, req.params.setId),
      collections.doubles(id, req.params.setId),
    ]);
    res.json({ cardIds, doubleIds });
  });

  return router;
}
