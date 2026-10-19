import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getMe } from '@/lib/api';

/**
 * Admin session is an httpOnly cookie, so the client cannot inspect it. Ask the
 * API who we are instead of decoding a token from localStorage.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'in' | 'out'>('checking');

  useEffect(() => {
    let alive = true;
    getMe()
      .then(() => { if (alive) setState('in'); })
      .catch(() => { if (alive) setState('out'); });
    return () => { alive = false; };
  }, []);

  if (state === 'checking') {
    return <div style={{ minHeight: '100vh', background: '#f8fafc' }} />;
  }
  if (state === 'out') {
    return <Navigate to="/sp-super-admin/login" replace />;
  }
  return <>{children}</>;
}
