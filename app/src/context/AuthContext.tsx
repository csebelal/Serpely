import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { clientGetMe, type ClientUserData } from '../lib/api';

interface AuthContextValue {
  user: ClientUserData | null;
  loading: boolean;
  login: (token: string, user: ClientUserData) => void;
  logout: () => void;
  setUser: (u: ClientUserData) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, loading: true,
  login: () => {}, logout: () => {}, setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClientUserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('serpely_client_token');
    if (!token) { setLoading(false); return; }
    clientGetMe()
      .then(r => setUser(r.data))
      .catch(() => localStorage.removeItem('serpely_client_token'))
      .finally(() => setLoading(false));
  }, []);

  function login(token: string, userData: ClientUserData) {
    localStorage.setItem('serpely_client_token', token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('serpely_client_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
