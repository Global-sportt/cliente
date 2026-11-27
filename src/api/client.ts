import type {
  AuthProviders,
  AuthSession,
  ForgotPasswordResult,
  MessageResult,
  ProblemDetails,
  PublicUser,
  RegisterResult,
} from './types';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
).replace(/\/$/, '');

export const API_BASE_URL = API_BASE;

const CSRF_COOKIE = 'reservas_csrf';

let accessToken: string | null = null;
let refreshPromise: Promise<AuthSession | null> | null = null;
let sessionListener: ((session: AuthSession | null) => void) | null = null;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ProblemDetails,
  ) {
    super(problem.message);
    this.name = 'ApiError';
  }

  get code(): string {
    return this.problem.code;
  }
}

export function setSessionListener(
  listener: (session: AuthSession | null) => void,
): () => void {
  sessionListener = listener;
  return () => {
    if (sessionListener === listener) sessionListener = null;
  };
}

function applySession(session: AuthSession): void {
  accessToken = session.accessToken;
  sessionListener?.(session);
}

function clearLocalSession(): void {
  accessToken = null;
  sessionListener?.(null);
}

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const value = part.trim();
    if (value.startsWith(prefix)) {
      return decodeURIComponent(value.slice(prefix.length));
    }
  }
  return undefined;
}

async function parseProblem(response: Response): Promise<ProblemDetails> {
  try {
    const data = (await response.json()) as Partial<ProblemDetails>;
    if (data && typeof data === 'object') {
      return {
        status: data.status ?? response.status,
        code: data.code ?? defaultCode(response.status),
        message: data.message ?? 'Ocurrió un error.',
        details: data.details,
        trace_id: data.trace_id,
      };
    }
  } catch {
    // El proxy o el servidor pueden devolver HTML/texto.
  }

  return {
    status: response.status,
    code: defaultCode(response.status),
    message:
      response.statusText || 'No pudimos completar la solicitud. Intenta de nuevo.',
  };
}

function defaultCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'ERROR';
  }
}

export async function ensureCsrf(force = false): Promise<string | undefined> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing && !force) return existing;

  try {
    const response = await fetch(`${API_BASE}/auth/csrf`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) return existing;
    const data = (await response.json()) as { csrfToken?: string };
    return data.csrfToken ?? readCookie(CSRF_COOKIE) ?? existing;
  } catch {
    return existing;
  }
}

function isRefreshable(path: string): boolean {
  return ![
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/verify-email',
    '/auth/password/forgot',
    '/auth/password/reset',
    '/auth/csrf',
    '/auth/providers',
    '/auth/oauth',
  ].some((prefix) => path.startsWith(prefix));
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
  csrfRetried = false,
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers.set('x-csrf-token', csrf);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, {
      status: 0,
      code: 'NETWORK_ERROR',
      message:
        'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
    });
  }

  if (!response.ok) {
    const problem = await parseProblem(response);

    if (
      response.status === 401 &&
      retry &&
      isRefreshable(path)
    ) {
      const session = await refreshSession();
      if (session) return request<T>(path, init, false, csrfRetried);
    }

    if (
      response.status === 403 &&
      problem.code === 'CSRF_TOKEN_INVALID' &&
      !csrfRetried &&
      !['GET', 'HEAD', 'OPTIONS'].includes(method)
    ) {
      await ensureCsrf(true);
      return request<T>(path, init, retry, true);
    }

    throw new ApiError(response.status, problem);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function refreshSession(): Promise<AuthSession | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const csrf = await ensureCsrf();

      const attempt = () =>
        fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            ...(csrf ? { 'x-csrf-token': csrf } : {}),
          },
          body: '{}',
        });

      let response = await attempt();

      if (response.status === 403) {
        const problem = await parseProblem(response);
        if (problem.code === 'CSRF_TOKEN_INVALID') {
          const freshCsrf = await ensureCsrf(true);
          response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              ...(freshCsrf ? { 'x-csrf-token': freshCsrf } : {}),
            },
            body: '{}',
          });
        }
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearLocalSession();
        }
        return null;
      }

      const session = (await response.json()) as AuthSession;
      applySession(session);
      return session;
    } catch {
      clearLocalSession();
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function restoreSession(): Promise<AuthSession | null> {
  await ensureCsrf();
  return refreshSession();
}

export async function login(
  email: string,
  password: string,
): Promise<AuthSession> {
  const session = await request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  applySession(session);
  return session;
}

export function register(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<RegisterResult> {
  return request<RegisterResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function verifyEmail(token: string): Promise<MessageResult> {
  return request<MessageResult>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  return request<ForgotPasswordResult>('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(
  token: string,
  password: string,
): Promise<MessageResult> {
  return request<MessageResult>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export function fetchMe(): Promise<PublicUser> {
  return request<PublicUser>('/auth/me');
}

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<MessageResult> {
  return request<MessageResult>('/auth/password/change', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getAuthProviders(): Promise<AuthProviders> {
  return request<AuthProviders>('/auth/providers', {}, false);
}

export async function logout(): Promise<void> {
  try {
    await request<void>(
      '/auth/logout',
      {
        method: 'POST',
        body: '{}',
      },
      false,
    );
  } finally {
    clearLocalSession();
  }
}

export async function logoutAll(): Promise<MessageResult> {
  try {
    return await request<MessageResult>('/auth/logout-all', {
      method: 'POST',
      body: '{}',
    });
  } finally {
    clearLocalSession();
  }
}

export function startGoogleOAuth(): void {
  const returnTo = encodeURIComponent('/auth/callback');
  window.location.assign(
    `${API_BASE}/auth/oauth/google/start?return_to=${returnTo}`,
  );
}
