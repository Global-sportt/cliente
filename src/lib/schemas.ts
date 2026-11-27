import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Ingresa tu correo.')
  .email('Ingresa un correo válido.')
  .max(254, 'El correo es demasiado largo.');

export const passwordSchema = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres.')
  .max(128, 'La contraseña no puede superar 128 caracteres.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Ingresa tu contraseña.')
    .max(128, 'La contraseña no puede superar 128 caracteres.'),
});

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .max(80, 'El nombre no puede superar 80 caracteres.')
      .optional(),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repite la contraseña.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repite la contraseña.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
