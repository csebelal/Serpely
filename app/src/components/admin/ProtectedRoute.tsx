import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getMe, type AdminMe } from '@/lib/api';
import { AdminRoleContext } from '@/context/adminRole';

/**
 * Admin session is an httpOnly cookie, so the client cannot inspect it. Ask the
 * API who we are instead of decoding a token from localStorage.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'in' | 'out'>('checking');
  const [role, setRole] = useState<AdminMe['role'] | null>(null);

  useEffect(() => {
    let alive = true;
    getMe()
      .then((res) => {
        if (!alive) return;
        setRole(res.data.role ?? 'admin');
        setState('in');
      })
      .catch(() => { if (alive) setState('out'); });
    return () => { alive = false; };
  }, []);

  if (state === 'checking') {
    return (
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Satoshi, system-ui, sans-serif',
          color: '#475569',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className="w-4 h-4 rounded-full border-2 border-current animate-spin"
            style={{ borderTopColor: 'transparent', opacity: 0.65 }}
          />
          Verifying admin session…
        </div>
      </div>
    );
  }
  if (state === 'out') {
    return <Navigate to="/sp-super-admin/login" replace />;
  }
  return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}
