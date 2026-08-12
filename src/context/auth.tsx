import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, post, setToken, getToken } from '@/lib/api';
import type { Me } from '@/lib/types';

interface AuthValue {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (current: string, next: string) => Promise<void>;
  refresh: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

interface Bootstrap {
  me: Me;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      // /admin/bootstrap valida el rol además del token: si un jugador normal
      // intenta entrar, responde 403 y lo tratamos como sesión inválida.
      const data = await api<Bootstrap>('/admin/bootstrap');
      setMe(data.me);
    } catch {
      setToken(null);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await post<{ access_token: string }>('/auth/login', {
        email,
        password,
      });
      setToken(res.access_token);
      try {
        const data = await api<Bootstrap>('/admin/bootstrap');
        setMe(data.me);
      } catch (e) {
        // Credenciales válidas pero sin permisos de panel.
        setToken(null);
        setMe(null);
        throw new Error('Esta cuenta no tiene acceso al panel.');
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setMe(null);
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await post('/auth/change-password', { currentPassword, newPassword });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<AuthValue>(
    () => ({
      me,
      loading,
      login,
      logout,
      changePassword,
      refresh,
      isAdmin: me?.role === 'admin',
    }),
    [me, loading, login, logout, changePassword, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
