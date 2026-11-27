import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { forgotPassword } from '../api/client';
import type { ForgotPasswordResult } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';
import { Field } from '../components/Field';
import { FullPageLoader } from '../components/FullPageLoader';
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '../lib/schemas';

export function ForgotPasswordPage() {
  const { status } = useAuth();
  const [problem, setProblem] = useState<unknown>(null);
  const [result, setResult] = useState<ForgotPasswordResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setProblem(null);
    try {
      const response = await forgotPassword(values.email);
      setResult(response);
    } catch (error) {
      setProblem(error);
    }
  });

  if (result) {
    return (
      <AuthLayout>
        <div className="success-panel">
          <span className="success-icon" aria-hidden="true">
            ✉
          </span>
          <h2>Revisa tu correo</h2>
          <p>{result.message}</p>
          {result.dev?.resetToken && (
            <div className="dev-box">
              <p>Entorno de desarrollo</p>
              <a
                className="text-link"
                href={`/reset-password?token=${encodeURIComponent(
                  result.dev.resetToken,
                )}`}
              >
                Restablecer la contraseña ahora
              </a>
            </div>
          )}
          <Link className="button button-primary" to="/login">
            Volver a iniciar sesión
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="card-heading">
        <p className="eyebrow eyebrow-dark">Recuperar acceso</p>
        <h2>¿Olvidaste tu contraseña?</h2>
        <p>
          Escribe tu correo y te enviaremos un enlace para crear una nueva. Por
          seguridad, no confirmamos si la cuenta existe.
        </p>
      </div>

      <Alert error={problem} />

      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Correo"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <button
          className="button button-primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
        </button>
      </form>

      <p className="auth-switch">
        <Link to="/login">Volver a iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}
