import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from './store/hooks'
import LoginPage from './features/auth/LoginPage'
import HomePage from './features/home/HomePage'
import AttendancePage from './features/attendance/AttendancePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route
        path="/trips/:tripId/rounds/:roundId/buses/:busId/attendance"
        element={<ProtectedRoute><AttendancePage /></ProtectedRoute>}
      />
    </Routes>
  )
}
