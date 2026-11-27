import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="not-found">
      <p className="eyebrow">404</p>
      <h1>Esta página no existe</h1>
      <p>El enlace puede estar roto o la página se movió.</p>
      <Link className="button button-primary" to="/">
        Volver al inicio
      </Link>
    </div>
  );
}
