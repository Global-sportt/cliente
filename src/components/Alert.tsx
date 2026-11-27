import { ApiError } from '../api/client';

function reasonsFrom(details: unknown): string[] {
  if (
    details &&
    typeof details === 'object' &&
    'reasons' in details &&
    Array.isArray((details as { reasons?: unknown }).reasons)
  ) {
    return (details as { reasons: unknown[] }).reasons.filter(
      (value): value is string => typeof value === 'string',
    );
  }
  return [];
}

export function Alert({ error }: { error: unknown }) {
  if (!error) return null;

  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Ocurrió un error inesperado. Intenta de nuevo.';

  const reasons =
    error instanceof ApiError ? reasonsFrom(error.problem.details) : [];
  const traceId =
    error instanceof ApiError ? error.problem.trace_id : undefined;

  return (
    <div className="alert" role="alert">
      <p>{message}</p>
      {reasons.length > 0 && (
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {traceId && (
        <p className="alert-trace">
          Si el problema continúa, comparte este código: <code>{traceId}</code>
        </p>
      )}
    </div>
  );
}
