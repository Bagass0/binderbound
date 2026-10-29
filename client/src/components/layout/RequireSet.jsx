import { Navigate, Outlet } from 'react-router';
import { useLayoutParams } from '../../hooks/useLayoutParams.js';

/** Les étapes 2 à 4 nécessitent un set : sinon, retour au choix du set. */
export function RequireSet() {
  const { params } = useLayoutParams();
  return params.setId ? <Outlet /> : <Navigate to="/" replace />;
}
