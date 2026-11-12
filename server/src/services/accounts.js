import { createGoogleVerifier } from '../auth/google.js';
import { createBinderStore } from './binders.js';
import { createCollectionStore } from './collections.js';
import { createFriendStore } from './friends.js';
import { createSessionStore } from './sessions.js';
import { createTradeStore } from './trades.js';
import { createUserStore } from './users.js';

/**
 * Tout ce qu'il faut pour les comptes, à partir d'un pool MySQL.
 * `verifyGoogle` peut être remplacé (tests) ; il est absent sans Client ID Google.
 */
export function createAccounts(
  db,
  { googleClientId = null, cookieSecure = false, verifyGoogle } = {},
) {
  return {
    users: createUserStore(db),
    sessions: createSessionStore(db),
    binders: createBinderStore(db),
    collections: createCollectionStore(db),
    friends: createFriendStore(db),
    trades: createTradeStore(db),
    googleClientId,
    cookieSecure,
    verifyGoogle: verifyGoogle ?? (googleClientId ? createGoogleVerifier(googleClientId) : null),
  };
}
