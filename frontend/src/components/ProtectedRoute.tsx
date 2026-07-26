import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FullScreenLoader from './FullScreenLoader'

function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <FullScreenLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
