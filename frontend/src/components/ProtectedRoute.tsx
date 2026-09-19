import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface ProtectedRouteProps {
  allowedRoles?: Array<'owner' | 'admin' | 'resident'>;
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Owner has universal access across the platform
  if (user.role === 'owner') {
    return <Outlet />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to respective home dashboard based on role
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === 'resident') {
      return <Navigate to="/resident/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
