import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { clientGetMe, clientLogout, type ClientUserData } from '../lib/api';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClientUserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Drop the pre-cookie-era token if one is still lying around — sessions
    // are now carried by the httpOnly cookie, so no token should be in here.
    try { localStorage.removeItem('serpely_client_token'); } catch { /* private mode */ }
    try { localStorage.removeItem('serpely_token'); } catch { /* private mode */ }
    // Cookie presence decides everything: /me succeeds → signed in.
    clientGetMe()
      .then(r => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  function login(userData: ClientUserData) {
    // The server set the httpOnly cookie as part of the login response.
    setUser(userData);
  }

  function logout() {
    // Fire-and-forget: the cookie clears server-side even if the tab closes.
    void clientLogout().catch(() => {});
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
