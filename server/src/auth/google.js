import { OAuth2Client } from 'google-auth-library';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * Vérifie le jeton d'identité (JWT) renvoyé par le bouton « Se connecter avec Google » :
 * signature de Google, expiration et audience (notre Client ID).
 */
export function createGoogleVerifier(clientId) {
  const client = new OAuth2Client(clientId);
  return async (credential) => {
    let payload;
    try {
      payload = (
        await client.verifyIdToken({ idToken: credential, audience: clientId })
      ).getPayload();
    } catch {
      throw new HttpError(401, 'GOOGLE_INVALID', 'Jeton Google invalide');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? payload.email?.split('@')[0],
      picture: payload.picture ?? null,
    };
  };
}
