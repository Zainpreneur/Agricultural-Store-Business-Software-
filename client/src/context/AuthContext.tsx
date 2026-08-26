import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api } from '../api/client';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('agri_token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('agri_user');
    return raw ? (JSON.parse(raw) as User) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('agri_token', newToken);
    localStorage.setItem('agri_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('agri_token');
    localStorage.removeItem('agri_user');
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles: string[]) => !!user && roles.includes(user.role), [user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
