import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { register as apiRegister } from '../api/client';
import type { RegisterResult } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';
import { Field } from '../components/Field';
import { FullPageLoader } from '../components/FullPageLoader';
import { GoogleButton } from '../components/GoogleButton';
import { ProviderDivider } from '../components/ProviderDivider';
import { registerSchema, type RegisterValues } from '../lib/schemas';

export function RegisterPage() {
  const { status } = useAuth();
  const [problem, setProblem] = useState<unknown>(null);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setProblem(null);
    try {
      const response = await apiRegister({
        email: values.email,
        password: values.password,
        displayName: values.displayName?.trim() || undefined,
      });
      setSubmittedEmail(values.email);
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
          <p>
            {result.message} Te enviamos un enlace a{' '}
            <strong>{submittedEmail}</strong>.
          </p>
          {result.dev?.verificationToken && (
            <div className="dev-box">
              <p>Entorno de desarrollo</p>
              <a
                className="text-link"
                href={`/verify-email?token=${encodeURIComponent(
                  result.dev.verificationToken,
                )}`}
              >
                Verificar este correo ahora
              </a>
            </div>
          )}
          <Link className="button button-primary" to="/login">
            Ir a iniciar sesión
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="card-heading">
        <p className="eyebrow eyebrow-dark">Nueva cuenta</p>
        <h2>Crea tu perfil</h2>
        <p>Reserva, paga y guarda tus canchas favoritas en un solo lugar.</p>
      </div>

      <GoogleButton label="Registrarme con Google" />

      <ProviderDivider />

      <Alert error={problem} />

      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Nombre"
          type="text"
          autoComplete="name"
          placeholder="Camila Ríos"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <Field
          label="Correo"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 12 caracteres"
          hint="Una frase larga es más segura que una palabra con símbolos."
          error={errors.password?.message}
          {...register('password')}
        />
        <Field
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <button
          className="button button-primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="auth-switch">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}
