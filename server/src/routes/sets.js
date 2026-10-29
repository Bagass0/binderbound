import { Router } from 'express';
import { HttpError } from '../middleware/errorHandler.js';

export function setsRouter(repo) {
  const router = Router();

  router.get('/', (_req, res) => res.json(repo.list()));

  router.get('/:id', (req, res) => {
    const set = repo.get(req.params.id);
    if (!set) throw new HttpError(404, 'SET_NOT_FOUND', `Set "${req.params.id}" introuvable`);
    res.json(set);
  });

  return router;
}
