import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  login as apiLogin,
  logout as apiLogout,
  logoutAll as apiLogoutAll,
  fetchMe,
  restoreSession,
  setSessionListener,
} from '../api/client';
import type { AuthSession, PublicUser } from '../api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  login: (email: string, password: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<PublicUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<PublicUser | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const removeListener = setSessionListener((session) => {
      setUser(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
    });

    let cancelled = false;
    void (async () => {
      const session = await restoreSession();
      if (cancelled) return;
      setUser(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
    })();

    return () => {
      cancelled = true;
      removeListener();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiLogin(email, password);
    setUser(session.user);
    setStatus('authenticated');
    return session;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setStatus('anonymous');
      queryClient.clear();
    }
  }, [queryClient]);

  const logoutAll = useCallback(async () => {
    try {
      await apiLogoutAll();
    } finally {
      setUser(null);
      setStatus('anonymous');
      queryClient.clear();
    }
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
    return me;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout, logoutAll, refreshUser }),
    [status, user, login, logout, logoutAll, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
