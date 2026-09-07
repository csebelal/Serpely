import { Navigate } from 'react-router-dom';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function isValidJWT(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    return parts.every(p => {
      try { atob(p.replace(/-/g, '+').replace(/_/g, '/')); return true; }
      catch { return false; }
    });
  } catch {
    return false;
  }
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('serpely_token');
  if (!token || !isValidJWT(token)) {
    localStorage.removeItem('serpely_token');
    localStorage.removeItem('serpely_login_time');
    return <Navigate to="/sp-super-admin/login" replace />;
  }

  const loginTime = localStorage.getItem('serpely_login_time');
  if (loginTime && Date.now() - Number(loginTime) > SESSION_DURATION) {
    localStorage.removeItem('serpely_token');
    localStorage.removeItem('serpely_login_time');
    return <Navigate to="/sp-super-admin/login" replace />;
  }

  return <>{children}</>;
}
