export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label ?? 'Cargando…'}</span>
    </div>
  );
}
