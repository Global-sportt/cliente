import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

/**
 * Shared chrome for the venue operator pages. Authentication screens keep
 * their own layout.
 */
export function AppHeader() {
  const { user } = useAuth();
  const displayName = user?.displayName ?? user?.email ?? '';

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link to="/" className="wordmark wordmark-dark">
          reservas<span>.</span>
        </Link>
        <nav className="app-nav" aria-label="Navegación del panel">
          <NavLink
            to="/panel"
            className={({ isActive }) =>
              isActive ? 'header-link header-link-active' : 'header-link'
            }
          >
            Panel
          </NavLink>
          <Link to="/" className="header-link">
            Mi cuenta
          </Link>
        </nav>
        <div className="app-header-actions">
          {displayName && (
            <span className="header-user" title={displayName}>
              {displayName}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
