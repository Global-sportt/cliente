import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Alert } from '../components/Alert';
import { AuthLayout } from '../components/AuthLayout';
import { Field } from '../components/Field';
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '../lib/schemas';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { logout } = useAuth();
  const [problem, setProblem] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return;
    setProblem(null);
    try {
      await resetPassword(token, values.password);
      await logout().catch(() => undefined);
      setDone(true);
    } catch (error) {
      setProblem(error);
    }
  });

  if (done) {
    return (
      <AuthLayout>
        <div className="success-panel">
          <span className="success-icon" aria-hidden="true">
            ✓
          </span>
          <h2>Contraseña actualizada</h2>
          <p>
            Por seguridad cerramos todas tus sesiones. Ya puedes entrar con tu
            nueva contraseña.
          </p>
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
        <p className="eyebrow eyebrow-dark">Nueva contraseña</p>
        <h2>Crea una contraseña nueva</h2>
        <p>Usa una frase larga que no reutilices en otros servicios.</p>
      </div>

      {!token && (
        <div className="alert" role="alert">
          <p>
            El enlace no incluye un token válido. Solicita uno nuevo desde
            “¿Olvidaste tu contraseña?”.
          </p>
        </div>
      )}

      <Alert error={problem} />

      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 12 caracteres"
          error={errors.password?.message}
          {...register('password')}
        />
        <Field
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <button
          className="button button-primary"
          type="submit"
          disabled={isSubmitting || !token}
        >
          {isSubmitting ? 'Actualizando…' : 'Cambiar contraseña'}
        </button>
      </form>

      <p className="auth-switch">
        <Link to="/recuperar">Solicitar otro enlace</Link>
      </p>
    </AuthLayout>
  );
}
