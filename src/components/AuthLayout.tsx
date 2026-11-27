import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <Link to="/login" className="wordmark" aria-label="Reservas, inicio">
          reservas<span>.</span>
        </Link>

        <div className="brand-copy">
          <p className="eyebrow">Canchas en Colombia</p>
          <h1>Tu próxima cancha, sin llamadas.</h1>
          <p className="brand-lede">
            Disponibilidad real, precios claros y confirmación inmediata. Menos
            fricción para jugar, más tiempo en la cancha.
          </p>
        </div>

        <ul className="brand-points">
          <li>
            <span aria-hidden="true">✓</span> Una agenda para jugadores y sedes
          </li>
          <li>
            <span aria-hidden="true">✓</span> Reserva y pago en menos de dos
            minutos
          </li>
          <li>
            <span aria-hidden="true">✓</span> Políticas y cancelaciones claras
          </li>
        </ul>

        <p className="brand-note">Producto en construcción · Fase de validación</p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">{children}</div>
        <p className="auth-legal">
          Al crear una cuenta aceptas las políticas de tratamiento de datos.
          Nunca compartimos tu contraseña.
        </p>
      </main>
    </div>
  );
}
