import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ApiError, shouldRetry } from '../api/client';
import {
  accessErrorMessage,
  createSpace,
  establishmentKeys,
  fetchEstablishment,
  fetchMyEstablishments,
  fetchSpaceAvailability,
  fetchSpaces,
  updateSpace,
  type SpaceAvailability,
  type SpaceInput,
  type SpaceStatus,
  type SpaceSummary,
} from '../api/establishments';
import { Alert } from '../components/Alert';
import { AppHeader } from '../components/AppHeader';
import { Field } from '../components/Field';
import { FullPageLoader } from '../components/FullPageLoader';

const SPACE_STATUS_LABELS: Record<SpaceStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  maintenance: 'Mantenimiento',
};

const SPACE_STATUS_BADGES: Record<SpaceStatus, string> = {
  active: 'badge-ok',
  inactive: 'badge-muted',
  maintenance: 'badge-warn',
};

const STATUS_OPTIONS: SpaceStatus[] = ['active', 'maintenance', 'inactive'];

interface SpaceFormValues {
  name: string;
  sport: string;
  slotMinutes: string;
  bufferMinutes: string;
  basePrice: string;
  status: SpaceStatus;
}

type SpaceFormField = keyof SpaceFormValues;
type SpaceFormErrors = Partial<Record<SpaceFormField, string>>;

function initialValues(space: SpaceSummary | null): SpaceFormValues {
  return {
    name: space?.name ?? '',
    sport: space?.sport ?? '',
    slotMinutes: String(space?.slotMinutes ?? 60),
    bufferMinutes: String(space?.bufferMinutes ?? 0),
    basePrice:
      space?.basePriceMinor !== null && space?.basePriceMinor !== undefined
        ? (Number(space.basePriceMinor) / 100).toFixed(2)
        : '',
    status: space?.status ?? 'active',
  };
}

/**
 * The API stores money in minor units. The form works in major units so the
 * operator types `45000`, not `4500000`.
 */
function toMinorUnits(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

function buildSpaceInput(values: SpaceFormValues): {
  errors: SpaceFormErrors;
  input: SpaceInput | null;
} {
  const errors: SpaceFormErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = 'El nombre de la cancha es obligatorio.';
  } else if (name.length > 80) {
    errors.name = 'El nombre no puede superar 80 caracteres.';
  }

  const sport = values.sport.trim();
  if (!sport) {
    errors.sport = 'El deporte es obligatorio.';
  } else if (sport.length > 40) {
    errors.sport = 'El deporte no puede superar 40 caracteres.';
  }

  const slotMinutes = Number(values.slotMinutes);
  if (!Number.isInteger(slotMinutes) || slotMinutes < 15 || slotMinutes > 240) {
    errors.slotMinutes = 'Debe ser un entero entre 15 y 240 minutos.';
  }

  const bufferMinutes = Number(values.bufferMinutes);
  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 120) {
    errors.bufferMinutes = 'Debe ser un entero entre 0 y 120 minutos.';
  }

  const rawPrice = values.basePrice.trim();
  let basePriceMinor: number | undefined;
  if (rawPrice) {
    const parsed = toMinorUnits(rawPrice);
    if (parsed === null) {
      errors.basePrice =
        'Ingresa un monto mayor que cero, con máximo dos decimales.';
    } else {
      basePriceMinor = parsed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, input: null };
  }

  const input: SpaceInput = {
    name,
    sport,
    slotMinutes,
    bufferMinutes,
    status: values.status,
  };
  if (basePriceMinor !== undefined) input.basePriceMinor = basePriceMinor;

  return { errors, input };
}

function serverFieldErrors(error: unknown): SpaceFormErrors {
  if (!(error instanceof ApiError) || !Array.isArray(error.problem.details)) {
    return {};
  }

  const fieldByApiName: Record<string, SpaceFormField> = {
    name: 'name',
    sport: 'sport',
    slotMinutes: 'slotMinutes',
    bufferMinutes: 'bufferMinutes',
    basePriceMinor: 'basePrice',
    status: 'status',
  };

  const errors: SpaceFormErrors = {};
  for (const entry of error.problem.details) {
    if (!entry || typeof entry !== 'object') continue;
    const issue = entry as { field?: unknown };
    if (typeof issue.field !== 'string') continue;
    const field = fieldByApiName[issue.field];
    if (!field || errors[field]) continue;
    errors[field] = 'Revisa este campo.';
  }
  return errors;
}

function formatMoney(minor: string | number, currency: string): string {
  const amount = Number(minor) / 100;
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('es-CO')} ${currency}`;
  }
}

function formatSlotTime(instant: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(new Date(instant));
  } catch {
    return instant.slice(11, 16);
  }
}

function formatDateLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function todayInTimeZone(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const pick = (type: string) =>
      parts.find((part) => part.type === type)?.value;
    const year = pick('year');
    const month = pick('month');
    const day = pick('day');
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Unsupported timezone: fall back to the browser date.
  }
  return new Date().toISOString().slice(0, 10);
}

interface SpaceFormProps {
  establishmentId: string;
  currency: string;
  space: SpaceSummary | null;
  onClose: () => void;
  onSaved: (space: SpaceSummary) => void;
}

function SpaceForm({
  establishmentId,
  currency,
  space,
  onClose,
  onSaved,
}: SpaceFormProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<SpaceFormValues>(() =>
    initialValues(space),
  );
  const [errors, setErrors] = useState<SpaceFormErrors>({});

  const mutation = useMutation({
    mutationFn: (input: SpaceInput) =>
      space
        ? updateSpace(establishmentId, space.id, input)
        : createSpace(establishmentId, input),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({
        queryKey: establishmentKeys.spaces(establishmentId),
      });
      onSaved(saved);
    },
  });

  const serverErrors = useMemo(
    () => serverFieldErrors(mutation.error),
    [mutation.error],
  );

  const fieldError = (field: SpaceFormField) =>
    errors[field] ?? serverErrors[field];

  function update<K extends SpaceFormField>(
    field: K,
    value: SpaceFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (mutation.isError) mutation.reset();
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = buildSpaceInput(values);
    setErrors(result.errors);
    if (!result.input) return;
    mutation.mutate(result.input);
  };

  return (
    <form className="panel space-form" onSubmit={handleSubmit} noValidate>
      <div className="panel-heading">
        <h2>{space ? 'Editar cancha' : 'Nueva cancha'}</h2>
        <button
          className="button button-ghost button-compact"
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Cerrar
        </button>
      </div>

      <Alert error={mutation.error} />

      <div className="form-grid">
        <Field
          label="Nombre de la cancha"
          name="space-name"
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          error={fieldError('name')}
          maxLength={80}
          autoComplete="off"
          placeholder="Cancha Norte"
        />
        <Field
          label="Deporte"
          name="space-sport"
          value={values.sport}
          onChange={(event) => update('sport', event.target.value)}
          error={fieldError('sport')}
          maxLength={40}
          autoComplete="off"
          placeholder="Fútbol, pádel, tenis…"
        />
        <Field
          label="Duración de la franja (min)"
          name="space-slot-minutes"
          type="number"
          min={15}
          max={240}
          step={5}
          value={values.slotMinutes}
          onChange={(event) => update('slotMinutes', event.target.value)}
          error={fieldError('slotMinutes')}
          hint="Entre 15 y 240 minutos."
        />
        <Field
          label="Buffer entre franjas (min)"
          name="space-buffer-minutes"
          type="number"
          min={0}
          max={120}
          step={5}
          value={values.bufferMinutes}
          onChange={(event) => update('bufferMinutes', event.target.value)}
          error={fieldError('bufferMinutes')}
          hint="Tiempo de limpieza entre reservas."
        />
        <Field
          label={`Tarifa base por hora (${currency})`}
          name="space-base-price"
          inputMode="decimal"
          value={values.basePrice}
          onChange={(event) => update('basePrice', event.target.value)}
          error={fieldError('basePrice')}
          hint={
            space
              ? 'Déjala vacía para conservar la tarifa actual.'
              : 'Opcional. Se guarda en unidades menores.'
          }
          placeholder="45000"
        />
        <div className="field">
          <label htmlFor="space-status">Estado</label>
          <select
            id="space-status"
            name="space-status"
            value={values.status}
            onChange={(event) =>
              update('status', event.target.value as SpaceStatus)
            }
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {SPACE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <span className="field-hint">
            Mantenimiento e inactiva no eliminan reservas existentes.
          </span>
        </div>
      </div>

      <div className="button-row">
        <button
          className="button button-primary"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? 'Guardando…'
            : space
              ? 'Guardar cambios'
              : 'Crear cancha'}
        </button>
        <button
          className="button button-ghost"
          type="button"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

interface SpaceCardProps {
  space: SpaceSummary;
  currency: string;
  canManage: boolean;
  onEdit: (space: SpaceSummary) => void;
  onShowAvailability: (space: SpaceSummary) => void;
}

function SpaceCard({
  space,
  currency,
  canManage,
  onEdit,
  onShowAvailability,
}: SpaceCardProps) {
  return (
    <article className="space-card">
      <div className="space-card-heading">
        <div>
          <h3>{space.name}</h3>
          <p className="venue-slug">/{space.slug}</p>
        </div>
        <span className={`badge ${SPACE_STATUS_BADGES[space.status]}`}>
          {SPACE_STATUS_LABELS[space.status]}
        </span>
      </div>

      <dl className="space-facts">
        <div>
          <dt>Deporte</dt>
          <dd>{space.sport ?? 'Sin definir'}</dd>
        </div>
        <div>
          <dt>Franja</dt>
          <dd>{space.slotMinutes} min</dd>
        </div>
        <div>
          <dt>Buffer</dt>
          <dd>{space.bufferMinutes} min</dd>
        </div>
        <div>
          <dt>Tarifa base</dt>
          <dd>
            {space.basePriceMinor
              ? formatMoney(space.basePriceMinor, currency)
              : 'Sin definir'}
          </dd>
        </div>
      </dl>

      <div className="space-card-actions">
        <button
          className="button button-ghost button-compact"
          type="button"
          onClick={() => onShowAvailability(space)}
        >
          Ver disponibilidad
        </button>
        {canManage && (
          <button
            className="button button-primary button-compact"
            type="button"
            onClick={() => onEdit(space)}
          >
            Editar
          </button>
        )}
      </div>
    </article>
  );
}

function AvailabilityResult({
  availability,
}: {
  availability: SpaceAvailability;
}) {
  return (
    <div className="availability-result">
      <p className="availability-meta">
        {formatDateLabel(availability.date)} · Zona horaria{' '}
        {availability.timezone}
      </p>

      {availability.slots.length === 0 ? (
        <div className="empty-state empty-state-inline">
          <p>
            No hay franjas disponibles para esta fecha. Puede que la cancha no
            tenga horario configurado, esté cerrada ese día o todas las franjas
            estén reservadas.
          </p>
        </div>
      ) : (
        <>
          <ul className="slot-grid">
            {availability.slots.map((slot) => (
              <li className="slot-card" key={slot.startsAt}>
                <span className="slot-time">
                  {formatSlotTime(slot.startsAt, availability.timezone)} –{' '}
                  {formatSlotTime(slot.endsAt, availability.timezone)}
                </span>
                <span className="slot-price">
                  {slot.priceMinor === '0'
                    ? 'Sin tarifa configurada'
                    : formatMoney(slot.priceMinor, slot.currency)}
                </span>
                <span
                  className={
                    slot.available ? 'badge badge-ok' : 'badge badge-muted'
                  }
                >
                  {slot.available ? 'Disponible' : 'No disponible'}
                </span>
              </li>
            ))}
          </ul>
          <p className="inline-meta">
            Solo se muestran las franjas libres; las reservadas no aparecen.
          </p>
        </>
      )}
    </div>
  );
}

export function SpacesPage() {
  const { establishmentId = '' } = useParams<{ establishmentId: string }>();

  const mineQuery = useQuery({
    queryKey: establishmentKeys.mine,
    queryFn: fetchMyEstablishments,
    retry: shouldRetry,
  });

  const membership = mineQuery.data?.find(
    (item) => item.id === establishmentId && item.status === 'active',
  );

  const detailQuery = useQuery({
    queryKey: establishmentKeys.detail(establishmentId),
    queryFn: () => fetchEstablishment(establishmentId),
    enabled: Boolean(membership),
    retry: shouldRetry,
  });

  const spacesQuery = useQuery({
    queryKey: establishmentKeys.spaces(establishmentId),
    queryFn: () => fetchSpaces(establishmentId),
    enabled: Boolean(membership),
    retry: shouldRetry,
  });

  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>(
    'closed',
  );
  const [editingSpace, setEditingSpace] = useState<SpaceSummary | null>(null);

  const spaces = spacesQuery.data ?? [];
  const establishment = detailQuery.data;
  const canManage = membership?.groups.includes('owner') ?? false;

  const effectiveSpaceId =
    selectedSpaceId && spaces.some((space) => space.id === selectedSpaceId)
      ? selectedSpaceId
      : (spaces[0]?.id ?? '');

  const effectiveDate =
    date || (establishment ? todayInTimeZone(establishment.timezone) : '');

  const availabilityQuery = useQuery({
    queryKey: establishmentKeys.availability(
      establishmentId,
      effectiveSpaceId,
      effectiveDate,
    ),
    queryFn: () =>
      fetchSpaceAvailability(establishmentId, effectiveSpaceId, effectiveDate),
    enabled: Boolean(
      membership && effectiveSpaceId && effectiveDate && !detailQuery.error,
    ),
    retry: shouldRetry,
  });

  if (mineQuery.isPending) {
    return <FullPageLoader label="Cargando tus sedes…" />;
  }

  if (mineQuery.error) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="app-main">
          <Alert error={accessErrorMessage(mineQuery.error) ?? mineQuery.error} />
          <div className="inline-actions">
            <button
              className="button button-ghost button-compact"
              type="button"
              onClick={() => void mineQuery.refetch()}
              disabled={mineQuery.isFetching}
            >
              {mineQuery.isFetching ? 'Reintentando…' : 'Reintentar'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="app-main">
          <section className="panel empty-state" aria-labelledby="denied-title">
            <p className="eyebrow">Acceso restringido</p>
            <h1 id="denied-title">No puedes ver esta sede</h1>
            <p>
              Tu cuenta no tiene una membresía activa en este establecimiento.
              Si crees que es un error, pide a un dueño que revise tu acceso.
            </p>
            <Link className="button button-ghost button-compact" to="/panel">
              Volver a mis sedes
            </Link>
          </section>
        </main>
      </div>
    );
  }

  if (detailQuery.isPending || spacesQuery.isPending) {
    return <FullPageLoader label="Cargando la sede…" />;
  }

  const openCreate = () => {
    setEditingSpace(null);
    setFormMode('create');
  };

  const openEdit = (space: SpaceSummary) => {
    setEditingSpace(space);
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode('closed');
    setEditingSpace(null);
  };

  const showAvailability = (space: SpaceSummary) => {
    setSelectedSpaceId(space.id);
    document
      .getElementById('disponibilidad')
      ?.scrollIntoView({ block: 'start' });
  };

  const venueName = establishment?.name ?? membership.name;

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <Link to="/panel">Panel</Link>
          <span aria-hidden="true">/</span>
          <span>{venueName}</span>
        </nav>

        <section className="app-hero">
          <div>
            <p className="eyebrow">Espacios de la sede</p>
            <h1>{venueName}</h1>
            <p className="app-hero-lede">
              Administra las canchas y consulta las franjas libres por fecha.
            </p>
          </div>
          {canManage && (
            <button
              className="button button-primary button-compact"
              type="button"
              onClick={openCreate}
            >
              Nueva cancha
            </button>
          )}
        </section>

        {establishment && establishment.status !== 'active' && (
          <div className="notice notice-warn" role="status">
            Esta sede está {establishment.status === 'pending'
              ? 'pendiente de activación'
              : 'suspendida'}
            . Algunas acciones pueden fallar hasta que se active.
          </div>
        )}

        {!canManage && (
          <div className="notice" role="status">
            Tu membresía es de solo lectura: puedes consultar espacios y
            disponibilidad, pero no crear ni editar canchas.
          </div>
        )}

        <Alert
          error={
            detailQuery.error
              ? (accessErrorMessage(detailQuery.error) ?? detailQuery.error)
              : spacesQuery.error
                ? (accessErrorMessage(spacesQuery.error) ?? spacesQuery.error)
                : null
          }
        />
        {Boolean(detailQuery.error || spacesQuery.error) && (
          <div className="inline-actions">
            <button
              className="button button-ghost button-compact"
              type="button"
              onClick={() => {
                void detailQuery.refetch();
                void spacesQuery.refetch();
              }}
              disabled={detailQuery.isFetching || spacesQuery.isFetching}
            >
              {detailQuery.isFetching || spacesQuery.isFetching
                ? 'Reintentando…'
                : 'Reintentar'}
            </button>
          </div>
        )}

        {formMode !== 'closed' && (
          <SpaceForm
            key={formMode === 'edit' ? editingSpace?.id : 'create'}
            establishmentId={establishmentId}
            currency={establishment?.currency ?? 'COP'}
            space={formMode === 'edit' ? editingSpace : null}
            onClose={closeForm}
            onSaved={(saved) => {
              closeForm();
              setSelectedSpaceId(saved.id);
            }}
          />
        )}

        <section className="panel" aria-labelledby="spaces-title">
          <div className="panel-heading">
            <h2 id="spaces-title">Canchas</h2>
            <span className="pill pill-muted">{spaces.length}</span>
          </div>

          {spacesQuery.isFetching && !spacesQuery.isPending && (
            <p className="inline-meta" role="status">
              Actualizando canchas…
            </p>
          )}

          {spaces.length === 0 ? (
            <div className="empty-state empty-state-inline">
              <p>
                Esta sede todavía no tiene canchas. Crea la primera para
                empezar a recibir reservas.
              </p>
              {canManage && (
                <button
                  className="button button-primary button-compact"
                  type="button"
                  onClick={openCreate}
                >
                  Crear la primera cancha
                </button>
              )}
            </div>
          ) : (
            <div className="space-grid">
              {spaces.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  currency={establishment?.currency ?? 'COP'}
                  canManage={canManage}
                  onEdit={openEdit}
                  onShowAvailability={showAvailability}
                />
              ))}
            </div>
          )}
        </section>

        <section
          className="panel availability-panel"
          id="disponibilidad"
          aria-labelledby="availability-title"
        >
          <div className="panel-heading">
            <h2 id="availability-title">Disponibilidad por fecha</h2>
            {establishment && (
              <span className="pill pill-muted">{establishment.timezone}</span>
            )}
          </div>

          {spaces.length === 0 ? (
            <p className="inline-meta">
              Crea una cancha para consultar su disponibilidad.
            </p>
          ) : (
            <>
              <div className="availability-controls">
                <div className="field">
                  <label htmlFor="availability-space">Cancha</label>
                  <select
                    id="availability-space"
                    value={effectiveSpaceId}
                    onChange={(event) => setSelectedSpaceId(event.target.value)}
                  >
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  label="Fecha"
                  name="availability-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>

              {availabilityQuery.isPending ? (
                <div
                  className="page-loader page-loader-inline"
                  role="status"
                  aria-live="polite"
                >
                  <span className="spinner" aria-hidden="true" />
                  <span>Consultando disponibilidad…</span>
                </div>
              ) : availabilityQuery.error ? (
                <>
                  <Alert
                    error={
                      accessErrorMessage(availabilityQuery.error) ??
                      availabilityQuery.error
                    }
                  />
                  <div className="inline-actions">
                    <button
                      className="button button-ghost button-compact"
                      type="button"
                      onClick={() => void availabilityQuery.refetch()}
                      disabled={availabilityQuery.isFetching}
                    >
                      {availabilityQuery.isFetching
                        ? 'Reintentando…'
                        : 'Reintentar'}
                    </button>
                  </div>
                </>
              ) : availabilityQuery.data ? (
                <AvailabilityResult availability={availabilityQuery.data} />
              ) : null}
            </>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>Panel del establecimiento · Fase de validación</span>
        <Link className="text-link" to="/panel">
          Mis sedes
        </Link>
      </footer>
    </div>
  );
}
