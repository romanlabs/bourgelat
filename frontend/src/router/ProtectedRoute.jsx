import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export const ProtectedRoute = () => {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const usuario = useAuthStore((s) => s.usuario)

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const esSuperadmin = usuario?.rol === 'superadmin'

  if (esSuperadmin && !location.pathname.startsWith('/superadmin')) {
    return <Navigate to="/superadmin" replace />
  }

  if (!esSuperadmin && location.pathname.startsWith('/superadmin')) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export const PublicOnlyRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const usuario = useAuthStore((s) => s.usuario)

  if (isAuthenticated) {
    return <Navigate to={usuario?.rol === 'superadmin' ? '/superadmin' : '/dashboard'} replace />
  }

  return <Outlet />
}
