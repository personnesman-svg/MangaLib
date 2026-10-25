import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, csrf } from '../api/client';

export type User = { id: number; name: string; email: string; role: 'user' | 'author' | 'admin' };
type AuthContextValue = {
  user: User | null; loading: boolean;
  login: (credentials: { email: string; password: string; remember?: boolean }) => Promise<void>;
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { const { data } = await api.get<{ user: User }>('/auth/me'); setUser(data.user); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const login = useCallback(async (credentials: { email: string; password: string; remember?: boolean }) => {
    await csrf(); const { data } = await api.post<{ user: User }>('/auth/login', credentials); setUser(data.user);
  }, []);
  const register = useCallback(async (values: { name: string; email: string; password: string; password_confirmation: string }) => {
    await csrf(); const { data } = await api.post<{ user: User }>('/auth/register', values); setUser(data.user);
  }, []);
  const logout = useCallback(async () => {
    await csrf(); await api.post('/auth/logout'); setUser(null);
  }, []);
  const value = useMemo(() => ({ user, loading, login, register, logout, refresh }), [user, loading, login, register, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
