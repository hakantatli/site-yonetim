import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ResidentDashboard } from './pages/resident/ResidentDashboard';

import { SiteDetailPage } from './pages/owner/SiteDetailPage';
import { ToastContainer } from './components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'owner') return <Navigate to="/owner/sites" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/resident/dashboard" replace />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Owner Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
            <Route path="/owner/sites" element={<OwnerDashboard />} />
            <Route path="/owner/sites/:id" element={<SiteDetailPage />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Resident Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['resident']} />}>
            <Route path="/resident/dashboard" element={<ResidentDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
