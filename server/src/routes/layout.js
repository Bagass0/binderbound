import { Router } from 'express';
import { computeLayout } from '../layout/computeLayout.js';
import { layoutRequestSchema } from '../schemas/layout.schema.js';
import { HttpError } from '../middleware/errorHandler.js';

export function layoutRouter(repo) {
  const router = Router();

  router.post('/', (req, res) => {
    // parse() lève une ZodError, transformée en 400 par le middleware d'erreur.
    const { setId, ...options } = layoutRequestSchema.parse(req.body ?? {});
    const set = repo.get(setId);
    if (!set) throw new HttpError(404, 'SET_NOT_FOUND', `Set "${setId}" introuvable`);
    res.json(computeLayout(set.cards, options));
  });

  return router;
}
