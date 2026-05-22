import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from './store/hooks'
import LoginPage from './features/auth/LoginPage'
import DashboardLayout from './layouts/DashboardLayout'
import TripListPage from './features/trips/TripListPage'
import BusListPage from './features/buses/BusListPage'
import PassengerListPage from './features/passengers/PassengerListPage'
import TripDetailPage from './features/trips/TripDetailPage'
import LiveDashboardPage from './features/dashboard/LiveDashboardPage'
import SystemAdminPage from './features/system-admin/SystemAdminPage'
import UserManagementPage from './features/users/UserManagementPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function IndexRedirect() {
  const role = useAppSelector((s) => s.auth.role)
  return <Navigate to={role === 'SYSTEM_ADMIN' ? '/system' : '/trips'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<IndexRedirect />} />
        <Route path="trips" element={<TripListPage />} />
        <Route path="trips/:tripId" element={<TripDetailPage />} />
        <Route path="trips/:tripId/dashboard" element={<LiveDashboardPage />} />
        <Route path="trips/:tripId/passengers" element={<PassengerListPage />} />
        <Route path="buses" element={<BusListPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="system" element={<SystemAdminPage />} />
      </Route>
    </Routes>
  )
}
