import { HttpError } from './errorHandler.js';
import { SESSION_DAYS } from '../services/sessions.js';

export const SESSION_COOKIE = 'bb_session';

/** Cookie httpOnly (inaccessible au JavaScript) et SameSite=Lax (pas envoyé par un autre site). */
export const cookieOptions = (secure) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure,
  path: '/',
  maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
});

/** Renseigne `req.user` (ligne de la table users) si le cookie de session est valide. */
export function loadSession(sessions) {
  return async (req, _res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    req.user = token ? await sessions.findUser(token) : null;
    next();
  };
}

export function requireUser(req, _res, next) {
  if (!req.user) throw new HttpError(401, 'UNAUTHENTICATED', 'Connexion requise');
  next();
}

/**
 * Protection CSRF en complément de SameSite : une requête qui modifie des données doit venir
 * de notre propre origine quand le navigateur l'indique.
 */
export function sameOrigin(req, _res, next) {
  const { origin } = req.headers;
  if (req.method === 'GET' || req.method === 'HEAD' || !origin) return next();
  if (URL.parse(origin)?.host !== req.headers.host)
    throw new HttpError(403, 'FORBIDDEN_ORIGIN', 'Origine non autorisée');
  next();
}
