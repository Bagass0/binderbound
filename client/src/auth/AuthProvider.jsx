import { useCallback, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { useConfig } from '../hooks/useConfig.js';
import { localCollection } from '../hooks/localCollection.js';
import { AuthContext } from './useAuth.js';

/**
 * La session vit dans un cookie httpOnly : le client ne voit jamais le jeton, il demande
 * simplement au serveur qui est connecté (`/api/auth/me`).
 */
export function AuthProvider({ children }) {
  const { data: config } = useConfig();
  const enabled = Boolean(config?.accounts?.enabled);
  const me = useAsync(config ? `me:${enabled}` : 'me:pending', (signal) =>
    enabled ? api.auth.me(signal) : { user: null },
  );
  // Après une connexion ou une déconnexion, la réponse de l'action remplace celle de /me.
  const [override, setOverride] = useState();
  const user = override !== undefined ? override : (me.data?.user ?? null);
  const status = config && (override !== undefined || !me.loading) ? 'ready' : 'loading';

  const signIn = useCallback(async (promise) => {
    const { user: signedIn } = await promise;
    // Les cartes cochées en invité rejoignent le compte (fusion, rien n'est perdu).
    const local = localCollection.all();
    if (Object.keys(local).length) {
      await api.collection.import(local);
      localCollection.clear();
    }
    setOverride(signedIn);
    return signedIn;
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      googleClientId: config?.accounts?.googleClientId ?? null,
      status,
      user,
      login: (email, password) => signIn(api.auth.login({ email, password })),
      register: (body) => signIn(api.auth.register(body)),
      loginWithGoogle: (credential) => signIn(api.auth.google(credential)),
      logout: async () => {
        await api.auth.logout();
        window.google?.accounts.id.disableAutoSelect();
        setOverride(null);
      },
    }),
    [enabled, config, status, user, signIn],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
