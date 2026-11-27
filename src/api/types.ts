export interface PublicUser {
  id: string;
  email: string;
  role: 'player' | 'owner' | 'staff' | 'admin';
  status: 'active' | 'suspended' | 'deleted';
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  accessTokenExpiresAt: string;
  refreshToken?: string;
  refreshExpiresAt?: string;
  csrfToken?: string;
  user: PublicUser;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status: number;
  code: string;
  message: string;
  details?: unknown;
  trace_id?: string;
}

export interface RegisterResult {
  message: string;
  dev?: { verificationToken: string };
}

export interface ForgotPasswordResult {
  message: string;
  dev?: { resetToken: string };
}

export interface MessageResult {
  message: string;
}

export interface AuthProviders {
  password: boolean;
  google: boolean;
}
