import { Navigate, Outlet, useLocation } from 'react-router';
import { useIsPresent } from 'motion/react';
import { useAuth } from '../../auth/useAuth.js';
import { Loading } from '../common/StatusMessage.jsx';

/** Pages réservées aux comptes connectés : sinon, connexion puis retour ici. */
export function RequireUser() {
  const { enabled, status, user } = useAuth();
  const { pathname, search } = useLocation();
  // Page en train de sortir (ex. après une déconnexion) : on ne redirige plus.
  const isPresent = useIsPresent();
  if (status === 'loading') return <Loading />;
  if (user) return <Outlet />;
  if (!isPresent) return null;
  if (!enabled) return <Navigate to="/" replace />;
  return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
}
