import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RoleGate({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) {
    return (
      <div className="card p-8 text-center text-stone-500">
        You don't have permission to view this page.
      </div>
    );
  }
  return <>{children}</>;
}
