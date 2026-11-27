import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="page-loader" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>Cargando tu sesión…</span>
      </div>
    );
  }

  if (status === 'anonymous') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
