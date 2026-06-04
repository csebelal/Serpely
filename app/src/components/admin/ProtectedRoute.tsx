import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('serpely_token');
  if (!token) return <Navigate to="/sp-super-admin/login" replace />;
  return <>{children}</>;
}
