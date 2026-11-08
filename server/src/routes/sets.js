import { Router } from 'express';
import { HttpError } from '../middleware/errorHandler.js';
import { FINGERPRINT_PARAMS } from '../import/fingerprint.js';

/**
 * `prices` (services/prices.js) et `fingerprints` (services/fingerprints.js) sont facultatifs :
 * sans eux, les routes correspondantes répondent 404 et le client masque prix et scan.
 */
export function setsRouter(repo, { prices, fingerprints } = {}) {
  const router = Router();

  const findSet = (id) => {
    const set = repo.get(id);
    if (!set) throw new HttpError(404, 'SET_NOT_FOUND', `Set "${id}" introuvable`);
    return set;
  };

  router.get('/', (_req, res) => res.json(repo.list()));

  router.get('/:id', (req, res) => res.json(findSet(req.params.id)));

  router.get('/:id/prices', async (req, res) => {
    const set = findSet(req.params.id);
    if (!prices) throw new HttpError(404, 'PRICES_DISABLED', 'Prix indisponibles');
    const result = await prices.forCards(set.cards).catch((err) => {
      console.error(err);
      throw new HttpError(503, 'PRICES_UNAVAILABLE', 'Prix momentanément indisponibles');
    });
    res.set('Cache-Control', 'public, max-age=3600').json(result);
  });

  router.get('/:id/fingerprints', async (req, res) => {
    const set = findSet(req.params.id);
    const cards = fingerprints && (await fingerprints.get(set.id));
    if (!cards) throw new HttpError(404, 'SCAN_UNAVAILABLE', `Scan indisponible pour "${set.id}"`);
    // Paramètres de l'empreinte joints aux données : le client calcule exactement la même.
    res.set('Cache-Control', 'public, max-age=86400').json({ ...FINGERPRINT_PARAMS, cards });
  });

  return router;
}
