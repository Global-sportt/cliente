import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchMe } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Alert } from '../components/Alert';

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function HomePage() {
  const { status, user, logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<'logout' | 'all' | null>(null);
  const [problem, setProblem] = useState<unknown>(null);

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: status === 'authenticated',
    initialData: user ?? undefined,
    staleTime: 60_000,
    retry: 0,
  });

  const current = profile ?? user;
  if (!current) return null;

  const displayName = current.displayName ?? current.email.split('@')[0];
  const firstName = displayName.split(/\s+/)[0];

  const handleLogout = async () => {
    setBusy('logout');
    setProblem(null);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setProblem(error);
    } finally {
      setBusy(null);
    }
  };

  const handleLogoutAll = async () => {
    if (
      !window.confirm(
        '¿Cerrar todas tus sesiones? Tendrás que iniciar sesión de nuevo en todos tus dispositivos.',
      )
    ) {
      return;
    }
    setBusy('all');
    setProblem(null);
    try {
      await logoutAll();
      navigate('/login', { replace: true });
    } catch (error) {
      setProblem(error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="wordmark wordmark-dark">
            reservas<span>.</span>
          </Link>
          <div className="app-header-actions">
            <Link className="header-link" to="/panel">
              Panel
            </Link>
            <a
              className="header-link"
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noreferrer"
            >
              API
            </a>
            <div className="user-chip">
              {current.avatarUrl ? (
                <img
                  className="avatar"
                  src={current.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="avatar avatar-fallback" aria-hidden="true">
                  {initials(displayName, current.email)}
                </span>
              )}
              <span className="user-chip-name">{displayName}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="app-hero">
          <div>
            <p className="eyebrow">Tu cuenta</p>
            <h1>Hola, {firstName}.</h1>
            <p className="app-hero-lede">
              La autenticación ya está lista. Ahora seguimos con sedes,
              disponibilidad y reservas.
            </p>
          </div>
          <div className="session-badge">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <strong>Sesión protegida</strong>
              <span>Access token de 15 min + refresh rotatorio</span>
            </div>
          </div>
        </section>

        <Alert error={problem} />

        <div className="app-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>Tu perfil</h2>
            </div>

            <dl className="detail-list">
              <div>
                <dt>Correo</dt>
                <dd>
                  {current.email}{' '}
                  {current.emailVerified ? (
                    <span className="badge badge-ok">Verificado</span>
                  ) : (
                    <span className="badge badge-warn">Sin verificar</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Nombre</dt>
                <dd>{current.displayName ?? 'Sin nombre'}</dd>
              </div>
              <div>
                <dt>Miembro desde</dt>
                <dd>
                  <time dateTime={current.createdAt}>
                    {new Date(current.createdAt).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </time>
                </dd>
              </div>
              <div>
                <dt>Idioma</dt>
                <dd>{current.locale}</dd>
              </div>
            </dl>

            <div className="button-row">
              <button
                className="button button-ghost"
                type="button"
                onClick={handleLogout}
                disabled={busy !== null}
              >
                {busy === 'logout' ? 'Cerrando…' : 'Cerrar sesión'}
              </button>
              <button
                className="button button-danger-ghost"
                type="button"
                onClick={handleLogoutAll}
                disabled={busy !== null}
              >
                {busy === 'all' ? 'Cerrando…' : 'Cerrar todas las sesiones'}
              </button>
            </div>
          </section>

          <section className="panel panel-security">
            <div className="panel-heading">
              <h2>Seguridad</h2>
            </div>
            <ul className="security-list">
              <li>
                <span aria-hidden="true">01</span>
                <div>
                  <strong>Contraseñas con Argon2id</strong>
                  <p>Salt individual y hash resistente a GPU; nunca se cifran reversiblemente.</p>
                </div>
              </li>
              <li>
                <span aria-hidden="true">02</span>
                <div>
                  <strong>Refresh con detección de reuso</strong>
                  <p>Si un token viejo reaparece, se revoca la sesión completa.</p>
                </div>
              </li>
              <li>
                <span aria-hidden="true">03</span>
                <div>
                  <strong>Cookies httpOnly + CSRF</strong>
                  <p>El navegador nunca guarda tokens en localStorage.</p>
                </div>
              </li>
            </ul>
          </section>

          <section className="panel panel-wide">
            <div className="panel-heading">
              <h2>Qué sigue</h2>
              <span className="pill pill-muted">Roadmap MVP</span>
            </div>
            <div className="roadmap">
              <article>
                <span className="roadmap-index">01</span>
                <h3>Sedes y canchas</h3>
                <p>Catálogo, fotos, servicios y políticas por sede.</p>
                <span className="pill pill-muted">Siguiente</span>
              </article>
              <article>
                <span className="roadmap-index">02</span>
                <h3>Disponibilidad</h3>
                <p>Horarios, excepciones, franjas y precios claros.</p>
                <span className="pill pill-muted">Pendiente</span>
              </article>
              <article>
                <span className="roadmap-index">03</span>
                <h3>Reservas y pagos</h3>
                <p>Hold, confirmación, checkout alojado y webhooks.</p>
                <span className="pill pill-muted">Pendiente</span>
              </article>
            </div>
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <span>Reservas deportivas · Fase de validación</span>
        <a
          className="text-link"
          href={`${API_BASE_URL}/docs`}
          target="_blank"
          rel="noreferrer"
        >
          Documentación OpenAPI
        </a>
      </footer>
    </div>
  );
}
