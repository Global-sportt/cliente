import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthLayout } from '../components/AuthLayout';
import { FullPageLoader } from '../components/FullPageLoader';

const REASON_MESSAGES: Record<string, string> = {
  access_denied: 'Cancelaste el inicio de sesión con Google.',
  invalid_state:
    'El intento de inicio de sesión expiró o no es válido. Intenta de nuevo.',
  invalid_response: 'Google devolvió una respuesta incompleta.',
  oauth_failed: 'No pudimos completar el inicio de sesión con Google.',
  account_suspended: 'La cuenta está inactiva. Contacta a soporte.',
  email_unverified: 'Google no confirmó el correo de tu cuenta.',
  oauth_not_configured: 'El inicio de sesión con Google no está configurado.',
};

export function AuthCallbackPage() {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();
  const oauth = searchParams.get('oauth');
  const reason = searchParams.get('reason');

  if (oauth === 'error') {
    return (
      <AuthLayout>
        <div className="card-heading">
          <p className="eyebrow eyebrow-dark">Google</p>
          <h2>No pudimos iniciar sesión</h2>
          <p>
            {REASON_MESSAGES[reason ?? ''] ??
              'Ocurrió un error al autenticar con Google.'}
          </p>
        </div>
        <div className="stack">
          <Link className="button button-primary" to="/login">
            Volver a intentar
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'loading') {
    return <FullPageLoader label="Entrando con Google…" />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthLayout>
      <div className="card-heading">
        <p className="eyebrow eyebrow-dark">Sesión</p>
        <h2>No encontramos una sesión activa</h2>
        <p>
          El enlace pudo expirar o las cookies del navegador están bloqueadas.
          Intenta de nuevo.
        </p>
      </div>
      <div className="stack">
        <Link className="button button-primary" to="/login">
          Ir a iniciar sesión
        </Link>
      </div>
    </AuthLayout>
  );
}
