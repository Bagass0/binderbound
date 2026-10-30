import { Router } from 'express';
import { computeLayout } from '../layout/computeLayout.js';
import { toLayoutOptions } from '../layout/binderOptions.js';
import { HttpError } from '../middleware/errorHandler.js';
import { requireUser } from '../middleware/session.js';
import {
  binderCreateSchema,
  binderUpdateSchema,
  idParamSchema,
} from '../schemas/account.schema.js';

const MAX_BINDERS = 100;

export function bindersRouter(repo, { binders, collections }) {
  const router = Router();
  router.use(requireUser);

  const checkSet = (params) => {
    if (!repo.get(params.setId))
      throw new HttpError(404, 'SET_NOT_FOUND', `Set "${params.setId}" introuvable`);
  };

  const findOwn = async (req) => {
    const binder = await binders.get(req.user.id, idParamSchema.parse(req.params.id));
    if (!binder) throw new HttpError(404, 'BINDER_NOT_FOUND', 'Classeur introuvable');
    return binder;
  };

  /**
   * Avancement de chaque classeur : cartes placées selon ses réglages, et combien sont possédées.
   * Le placement est recalculé ici (fonction pure, rapide) plutôt que stocké.
   */
  const withProgress = async (userId, list) => {
    const owned = await collections.bySet(userId, [...new Set(list.map((b) => b.setId))]);
    return list.map((binder) => {
      const set = repo.get(binder.setId);
      if (!set) return { ...binder, progress: null };
      const cardIds = Object.keys(computeLayout(set.cards, toLayoutOptions(binder.params)).index);
      const have = owned.get(binder.setId);
      return {
        ...binder,
        progress: { owned: cardIds.filter((id) => have.has(id)).length, total: cardIds.length },
      };
    });
  };

  router.get('/', async (req, res) => {
    res.json(await withProgress(req.user.id, await binders.list(req.user.id)));
  });

  router.get('/:id', async (req, res) => {
    const [binder] = await withProgress(req.user.id, [await findOwn(req)]);
    res.json(binder);
  });

  router.post('/', async (req, res) => {
    const body = binderCreateSchema.parse(req.body ?? {});
    checkSet(body.params);
    if ((await binders.count(req.user.id)) >= MAX_BINDERS)
      throw new HttpError(409, 'BINDER_LIMIT', `Limite de ${MAX_BINDERS} classeurs atteinte`);
    const [binder] = await withProgress(req.user.id, [await binders.create(req.user.id, body)]);
    res.status(201).json(binder);
  });

  router.patch('/:id', async (req, res) => {
    const { id } = await findOwn(req);
    const body = binderUpdateSchema.parse(req.body ?? {});
    if (body.params) checkSet(body.params);
    const [binder] = await withProgress(req.user.id, [await binders.update(req.user.id, id, body)]);
    res.json(binder);
  });

  router.delete('/:id', async (req, res) => {
    const { id } = await findOwn(req);
    await binders.remove(req.user.id, id);
    res.status(204).end();
  });

  return router;
}
