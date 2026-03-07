import { lazy, Suspense, type PropsWithChildren, type ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AuthLayout from '../components/layout/AuthLayout';
import AdminLayout from '../components/layout/AdminLayout';
import { useAuth } from '../hooks/useAuth';

const LoginPage = lazy(() => import('../pages/Login/LoginPage'));
const AdminDashboardPage = lazy(() => import('../pages/admin/DashboardPage'));
const TripPage = lazy(() => import('../pages/admin/TripPage'));
const TripDetailPage = lazy(() => import('../pages/admin/TripDetail'));
const BusManagementPage = lazy(() => import('../pages/admin/BusManagementPage'));
const AttendancePage = lazy(() => import('../pages/admin/AttendancePage'));
const StaffPage = lazy(() => import('../pages/admin/StaffPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

function PrivateRoute({ children }: PropsWithChildren): ReactElement {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: PropsWithChildren): ReactElement {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

export default function AppRoutes(): ReactElement {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <AuthLayout>
                  <LoginPage />
                </AuthLayout>
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="trips" element={<TripPage />} />
            <Route path="trips/:tripId" element={<TripDetailPage />} />
            <Route path="buses" element={<BusManagementPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="staff" element={<StaffPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route
            path="/trip-management"
            element={
              <PrivateRoute>
                <Navigate to="/admin/trips" replace />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
