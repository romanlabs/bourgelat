import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom'
import { lazy, Suspense, useLayoutEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute'

const LoginPage     = lazy(() => import('@/pages/LoginPage'))
const RegistroPage  = lazy(() => import('@/pages/RegistroPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const SuperadminPage = lazy(() => import('@/pages/SuperadminPage'))
const AgendaPage = lazy(() => import('@/pages/AgendaPage'))
const PacientesPage = lazy(() => import('@/pages/PacientesPage'))
const HistoriasPage = lazy(() => import('@/pages/HistoriasPage'))
const AntecedentesPage = lazy(() => import('@/pages/AntecedentesPage'))
const ConfiguracionPage = lazy(() => import('@/pages/ConfiguracionPage'))
const UsuariosPage = lazy(() => import('@/pages/UsuariosPage'))
const AuditoriaPage = lazy(() => import('@/pages/AuditoriaPage'))
const InventarioPage = lazy(() => import('@/pages/InventarioPage'))
const FinanzasPage = lazy(() => import('@/pages/FinanzasPage'))
const LandingPage   = lazy(() => import('@/pages/LandingPage'))
const PlanesPage    = lazy(() => import('@/pages/PlanesPage'))
const NosotrosPage  = lazy(() => import('@/pages/NosotrosPage'))
const PrivacidadPage = lazy(() => import('@/pages/PrivacidadPage'))
const TerminosPage   = lazy(() => import('@/pages/TerminosPage'))
const CookiesPage    = lazy(() => import('@/pages/CookiesPage'))

const Loader = () => (
  <div className="min-h-screen bg-[var(--color-sidebar)] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
  </div>
)

const ScrollManager = () => {
  const location = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return <Outlet />
}

const APP_HOSTS = new Set(['app.bourgelat.co', 'staging.bourgelat.co'])

const HostAwareHome = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const usuario = useAuthStore((state) => state.usuario)
  const hostname = window.location.hostname.toLowerCase()

  if (APP_HOSTS.has(hostname)) {
    if (isAuthenticated) {
      return <Navigate to={usuario?.rol === 'superadmin' ? '/superadmin' : '/dashboard'} replace />
    }

    return <Navigate to="/login" replace />
  }

  return (
    <Suspense fallback={<Loader />}>
      <LandingPage />
    </Suspense>
  )
}

const router = createBrowserRouter([
  {
    element: <ScrollManager />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login',    element: <Suspense fallback={<Loader />}><LoginPage /></Suspense> },
          { path: '/registro', element: <Suspense fallback={<Loader />}><RegistroPage /></Suspense> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/dashboard', element: <Suspense fallback={<Loader />}><DashboardPage /></Suspense> },
          { path: '/superadmin', element: <Suspense fallback={<Loader />}><SuperadminPage /></Suspense> },
          { path: '/agenda', element: <Suspense fallback={<Loader />}><AgendaPage /></Suspense> },
          { path: '/pacientes', element: <Suspense fallback={<Loader />}><PacientesPage /></Suspense> },
          { path: '/historias', element: <Suspense fallback={<Loader />}><HistoriasPage /></Suspense> },
          { path: '/antecedentes', element: <Suspense fallback={<Loader />}><AntecedentesPage /></Suspense> },
          { path: '/configuracion', element: <Suspense fallback={<Loader />}><ConfiguracionPage /></Suspense> },
          { path: '/usuarios', element: <Suspense fallback={<Loader />}><UsuariosPage /></Suspense> },
          { path: '/auditoria', element: <Suspense fallback={<Loader />}><AuditoriaPage /></Suspense> },
          { path: '/inventario', element: <Suspense fallback={<Loader />}><InventarioPage /></Suspense> },
          { path: '/finanzas', element: <Suspense fallback={<Loader />}><FinanzasPage /></Suspense> },
        ],
      },
      { path: '/',       element: <HostAwareHome /> },
      { path: '/planes', element: <Suspense fallback={<Loader />}><PlanesPage /></Suspense> },
      { path: '/nosotros', element: <Suspense fallback={<Loader />}><NosotrosPage /></Suspense> },
      { path: '/privacidad', element: <Suspense fallback={<Loader />}><PrivacidadPage /></Suspense> },
      { path: '/terminos', element: <Suspense fallback={<Loader />}><TerminosPage /></Suspense> },
      { path: '/cookies', element: <Suspense fallback={<Loader />}><CookiesPage /></Suspense> },
      { path: '*',       element: <Navigate to="/" replace /> },
    ],
  },
])

export const AppRouter = () => <RouterProvider router={router} />
