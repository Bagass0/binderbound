import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/**
 * Compte connecté et actions associées.
 * `enabled` : comptes disponibles (base configurée côté serveur) ; `status` : loading | ready.
 */
export const useAuth = () => useContext(AuthContext);
