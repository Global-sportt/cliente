import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';
import { Field } from '../components/Field';
import { FullPageLoader } from '../components/FullPageLoader';
import { GoogleButton } from '../components/GoogleButton';
import { ProviderDivider } from '../components/ProviderDivider';
import { loginSchema, type LoginValues } from '../lib/schemas';

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [problem, setProblem] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setProblem(null);
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? error
          : new Error('No pudimos iniciar sesión. Intenta de nuevo.'),
      );
    }
  });

  return (
    <AuthLayout>
      <div className="card-heading">
        <p className="eyebrow eyebrow-dark">Bienvenido de nuevo</p>
        <h2>Entra a jugar</h2>
        <p>Gestiona tus reservas y encuentra tu próxima cancha.</p>
      </div>

      <GoogleButton />

      <ProviderDivider />

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
        <Field
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="form-row form-row-end">
          <Link className="text-link" to="/recuperar">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          className="button button-primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="auth-switch">
        ¿Aún no tienes cuenta? <Link to="/registro">Créala gratis</Link>
      </p>
    </AuthLayout>
  );
}
