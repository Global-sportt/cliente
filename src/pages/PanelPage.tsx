import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { shouldRetry } from '../api/client';
import {
  accessErrorMessage,
  establishmentKeys,
  fetchMyEstablishments,
  type MembershipStatus,
  type MyEstablishment,
} from '../api/establishments';
import { Alert } from '../components/Alert';
import { AppHeader } from '../components/AppHeader';
import { FullPageLoader } from '../components/FullPageLoader';

const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: 'Activa',
  invited: 'Invitada',
  suspended: 'Suspendida',
  removed: 'Retirada',
};

function roleLabel(groups: string[]): string {
  if (groups.includes('owner')) return 'Dueño';
  if (groups.includes('staff')) return 'Staff';
  return 'Miembro';
}

function PendingMemberships({
  memberships,
}: {
  memberships: MyEstablishment[];
}) {
  if (memberships.length === 0) return null;

  return (
    <section className="panel pending-memberships" aria-labelledby="pending-title">
      <div className="panel-heading">
        <h2 id="pending-title">Membresías sin activar</h2>
        <span className="pill pill-muted">{memberships.length}</span>
      </div>
      <ul className="pending-list">
        {memberships.map((membership) => (
          <li key={membership.id}>
            <span>{membership.name}</span>
            <span className="badge badge-warn">
              {MEMBERSHIP_STATUS_LABELS[membership.status]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PanelPage() {
  const query = useQuery({
    queryKey: establishmentKeys.mine,
    queryFn: fetchMyEstablishments,
    retry: shouldRetry,
  });

  if (query.isPending) {
    return <FullPageLoader label="Cargando tus sedes…" />;
  }

  if (query.error) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="app-main">
          <section className="app-hero">
            <div>
              <p className="eyebrow">Panel del establecimiento</p>
              <h1>Tus sedes</h1>
            </div>
          </section>
          <Alert error={accessErrorMessage(query.error) ?? query.error} />
          <div className="inline-actions">
            <button
              className="button button-ghost button-compact"
              type="button"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              {query.isFetching ? 'Reintentando…' : 'Reintentar'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  const memberships = query.data ?? [];
  const active = memberships.filter((membership) => membership.status === 'active');
  const pending = memberships.filter(
    (membership) => membership.status !== 'active',
  );

  // With a single active venue the selector adds a click without adding a
  // decision, so the operator lands directly on its spaces.
  if (active.length === 1) {
    return <Navigate to={`/panel/${active[0].id}/espacios`} replace />;
  }

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <section className="app-hero">
          <div>
            <p className="eyebrow">Panel del establecimiento</p>
            <h1>Tus sedes</h1>
            <p className="app-hero-lede">
              Elige la sede que quieres operar para gestionar sus espacios y
              consultar la disponibilidad por fecha.
            </p>
          </div>
          <div className="session-badge">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <strong>Acceso por membresía</strong>
              <span>
                Solo verás las sedes donde tu membresía esté activa.
              </span>
            </div>
          </div>
        </section>

        {active.length === 0 ? (
          <section className="panel empty-state" aria-labelledby="empty-title">
            <p className="eyebrow">Sin sedes activas</p>
            <h2 id="empty-title">Tu cuenta todavía no tiene una sede asignada</h2>
            <p>
              Cuando un dueño o un administrador de la plataforma active tu
              membresía, la sede aparecerá en este panel.
            </p>
            <Link className="button button-ghost button-compact" to="/">
              Volver a mi cuenta
            </Link>
          </section>
        ) : (
          <section aria-labelledby="venues-title">
            <div className="section-heading">
              <div>
                <h2 id="venues-title">Elige una sede</h2>
                <p>Tienes acceso activo a más de un establecimiento.</p>
              </div>
              <span className="pill pill-muted">
                {active.length} {active.length === 1 ? 'sede' : 'sedes'}
              </span>
            </div>
            <div className="venue-grid">
              {active.map((membership) => (
                <article className="venue-card" key={membership.id}>
                  <div className="venue-card-heading">
                    <div>
                      <h3>{membership.name}</h3>
                      <p className="venue-slug">/{membership.slug}</p>
                    </div>
                    <span className="pill">{roleLabel(membership.groups)}</span>
                  </div>
                  <Link
                    className="button button-primary button-compact"
                    to={`/panel/${membership.id}/espacios`}
                  >
                    Gestionar espacios
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="stack">
          <PendingMemberships memberships={pending} />
        </div>
      </main>

      <footer className="app-footer">
        <span>Panel del establecimiento · Fase de validación</span>
        <Link className="text-link" to="/">
          Mi cuenta
        </Link>
      </footer>
    </div>
  );
}
