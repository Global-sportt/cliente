import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, verifyEmail } from '../api/client';
import type { MessageResult } from '../api/types';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';

const VERIFICATION_REQUESTS = new Map<string, Promise<MessageResult>>();

function verifyOnce(token: string): Promise<MessageResult> {
  const existing = VERIFICATION_REQUESTS.get(token);
  if (existing) return existing;

  const request = verifyEmail(token);
  VERIFICATION_REQUESTS.set(token, request);
  return request;
}

type VerificationState = 'working' | 'ok' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerificationState>(
    token ? 'working' : 'error',
  );
  const [problem, setProblem] = useState<unknown>(
    token ? null : new Error('El enlace no incluye un token de verificación.'),
  );

  useEffect(() => {
    if (!token) return;

    void (async () => {
      try {
        await verifyOnce(token);
        setState('ok');
      } catch (error) {
        setProblem(
          error instanceof ApiError
            ? error
            : new Error('No pudimos verificar tu correo. Intenta de nuevo.'),
        );
        setState('error');
      }
    })();
  }, [token]);

  if (state === 'working') {
    return (
      <AuthLayout>
        <div className="page-loader page-loader-inline">
          <span className="spinner" aria-hidden="true" />
          <span>Verificando tu correo…</span>
        </div>
      </AuthLayout>
    );
  }

  if (state === 'ok') {
    return (
      <AuthLayout>
        <div className="success-panel">
          <span className="success-icon" aria-hidden="true">
            ✓
          </span>
          <h2>Correo verificado</h2>
          <p>Tu cuenta está activa. Ya puedes iniciar sesión y reservar.</p>
          <Link className="button button-primary" to="/login">
            Iniciar sesión
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="card-heading">
        <p className="eyebrow eyebrow-dark">Verificación</p>
        <h2>No pudimos verificar el correo</h2>
        <p>
          El enlace puede haber expirado o ya haberse usado. Registrarte de nuevo
          con el mismo correo envía un enlace nuevo.
        </p>
      </div>
      <Alert error={problem} />
      <div className="stack">
        <Link className="button button-primary" to="/registro">
          Reenviar enlace
        </Link>
        <Link className="button button-ghost" to="/login">
          Volver a iniciar sesión
        </Link>
      </div>
    </AuthLayout>
  );
}
