import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute'
import ModuleAccessRoute from './ModuleAccessRoute'
import RouteErrorPage from '@/components/shared/RouteErrorPage'
import { APP_HOSTS } from '@/content/seo'
import { aplicarSeo } from '@/lib/seo'

// Página de la app que se puede descargar por adelantado. Ya descargada se
// pinta directo, sin pasar por <Suspense>: así entrar a un módulo no muestra
// la pantalla de carga.
const PAGINAS_APP = []
function paginaApp(importar) {
  let Componente = null
  const cargar = () => importar().then((modulo) => { Componente = modulo.default; return modulo })
  const Diferida = lazy(cargar)
  function Pagina(props) {
    return Componente ? <Componente {...props} /> : <Diferida {...props} />
  }
  Pagina.precargar = () => (Componente ? Promise.resolve() : cargar())
  PAGINAS_APP.push(Pagina)
  return Pagina
}

// Con sesión abierta, cuando el navegador queda libre, se bajan los módulos de
// a uno para no competir con la pantalla actual.
const PrecargaModulos = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  useEffect(() => {
    if (!isAuthenticated) return undefined
    let cancelado = false
    const enReposo = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 1200))
    const id = enReposo(async () => {
      for (const pagina of PAGINAS_APP) {
        if (cancelado) return
        try {
          await pagina.precargar()
        } catch {
          // Sin red no pasa nada: la página se descarga al entrar, como antes.
        }
      }
    })
    return () => {
      cancelado = true
      ;(window.cancelIdleCallback || window.clearTimeout)(id)
    }
  }, [isAuthenticated])
  return null
}

const LoginPage     = lazy(() => import('@/pages/LoginPage'))
const CompletarRegistroPage = lazy(() => import('@/pages/CompletarRegistroPage'))
const RecuperarPasswordPage = lazy(() => import('@/pages/RecuperarPasswordPage'))
const RestablecerPasswordPage = lazy(() => import('@/pages/RestablecerPasswordPage'))
const VerificarEmailPage = lazy(() => import('@/pages/VerificarEmailPage'))
const OAuthPopupCallbackPage = lazy(() => import('@/pages/OAuthPopupCallbackPage'))
const PerfilPage = paginaApp(() => import('@/pages/PerfilPage'))
const OnboardingWizardPage = paginaApp(() => import('@/pages/OnboardingWizardPage'))
const DashboardPage = paginaApp(() => import('@/pages/DashboardPage'))
const AgendaPage = paginaApp(() => import('@/pages/AgendaPage'))
const PacientesPage = paginaApp(() => import('@/pages/PacientesPage'))
const PacienteHistorialPage = paginaApp(() => import('@/pages/PacienteHistorialPage'))
const HistoriasPage = paginaApp(() => import('@/pages/HistoriasPage'))
const AntecedentesPage = paginaApp(() => import('@/pages/AntecedentesPage'))
const ConfiguracionPage = paginaApp(() => import('@/pages/ConfiguracionPage'))
const UsuariosPage = paginaApp(() => import('@/pages/UsuariosPage'))
const AuditoriaPage = paginaApp(() => import('@/pages/AuditoriaPage'))
const SoportePage = paginaApp(() => import('@/pages/SoportePage'))
const MiPlanPage = paginaApp(() => import('@/pages/MiPlanPage'))
const InventarioPage = paginaApp(() => import('@/pages/InventarioPage'))
const FinanzasPage = paginaApp(() => import('@/pages/FinanzasPage'))
const LandingPage   = lazy(() => import('@/pages/LandingPage'))
const PlanesPage    = lazy(() => import('@/pages/PlanesPage'))
const PagarPage     = lazy(() => import('@/pages/PagarPage'))
const NosotrosPage  = lazy(() => import('@/pages/NosotrosPage'))
const PrivacidadPage = lazy(() => import('@/pages/PrivacidadPage'))
const TerminosPage   = lazy(() => import('@/pages/TerminosPage'))
const CookiesPage    = lazy(() => import('@/pages/CookiesPage'))
const NoEncontradaPage = lazy(() => import('@/pages/NoEncontradaPage'))

const Loader = () => (
  <div className="min-h-screen bg-[var(--color-sidebar)] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-info border-t-transparent animate-spin" />
  </div>
)

const ScrollManager = () => {
  const location = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    aplicarSeo(location.pathname)
  }, [location.pathname])

  return <Outlet />
}

const HostAwareHome = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hostname = window.location.hostname.toLowerCase()

  if (APP_HOSTS.includes(hostname)) {
    if (isAuthenticated) {
      return <Navigate to="/dashboard" replace />
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
    errorElement: <RouteErrorPage />,
    children: [
      // Fuera de PublicOnlyRoute: el popup de OAuth llega aquí ya con sesión
      // iniciada, y la redirección a /dashboard le ganaba al aviso y al cierre.
      { path: '/oauth/popup-callback', element: <Suspense fallback={<Loader />}><OAuthPopupCallbackPage /></Suspense> },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login',    element: <Suspense fallback={<Loader />}><LoginPage /></Suspense> },
          { path: '/completar-registro', element: <Suspense fallback={<Loader />}><CompletarRegistroPage /></Suspense> },
          { path: '/recuperar-password', element: <Suspense fallback={<Loader />}><RecuperarPasswordPage /></Suspense> },
          { path: '/restablecer-password', element: <Suspense fallback={<Loader />}><RestablecerPasswordPage /></Suspense> },
        ],
      },
      {
        element: (
          <>
            <PrecargaModulos />
            <ProtectedRoute />
          </>
        ),
        children: [{
        element: <ModuleAccessRoute />,
        children: [
          { path: '/dashboard', element: <Suspense fallback={<Loader />}><DashboardPage /></Suspense> },
          { path: '/agenda', element: <Suspense fallback={<Loader />}><AgendaPage /></Suspense> },
          { path: '/pacientes', element: <Suspense fallback={<Loader />}><PacientesPage /></Suspense> },
          { path: '/pacientes/:mascotaId/historial', element: <Suspense fallback={<Loader />}><PacienteHistorialPage /></Suspense> },
          { path: '/historias', element: <Suspense fallback={<Loader />}><HistoriasPage /></Suspense> },
          { path: '/antecedentes', element: <Suspense fallback={<Loader />}><AntecedentesPage /></Suspense> },
          { path: '/configuracion', element: <Suspense fallback={<Loader />}><ConfiguracionPage /></Suspense> },
          { path: '/usuarios', element: <Suspense fallback={<Loader />}><UsuariosPage /></Suspense> },
          { path: '/auditoria', element: <Suspense fallback={<Loader />}><AuditoriaPage /></Suspense> },
          { path: '/soporte', element: <Suspense fallback={<Loader />}><SoportePage /></Suspense> },
          { path: '/plan', element: <Suspense fallback={<Loader />}><MiPlanPage /></Suspense> },
          { path: '/inventario', element: <Suspense fallback={<Loader />}><InventarioPage /></Suspense> },
          { path: '/caja', element: <Suspense fallback={<Loader />}><FinanzasPage modo="caja" /></Suspense> },
          { path: '/finanzas', element: <Suspense fallback={<Loader />}><FinanzasPage modo="finanzas" /></Suspense> },
          { path: '/perfil', element: <Suspense fallback={<Loader />}><PerfilPage /></Suspense> },
          { path: '/onboarding', element: <Suspense fallback={<Loader />}><OnboardingWizardPage /></Suspense> },
        ],
        }],
      },
      { path: '/',       element: <HostAwareHome /> },
      { path: '/registro', element: <Navigate to="/login?registro=1" replace /> },
      { path: '/verificar-email', element: <Suspense fallback={<Loader />}><VerificarEmailPage /></Suspense> },
      { path: '/planes', element: <Suspense fallback={<Loader />}><PlanesPage /></Suspense> },
      { path: '/pagar', element: <Suspense fallback={<Loader />}><PagarPage /></Suspense> },
      { path: '/nosotros', element: <Suspense fallback={<Loader />}><NosotrosPage /></Suspense> },
      { path: '/privacidad', element: <Suspense fallback={<Loader />}><PrivacidadPage /></Suspense> },
      { path: '/terminos', element: <Suspense fallback={<Loader />}><TerminosPage /></Suspense> },
      { path: '/cookies', element: <Suspense fallback={<Loader />}><CookiesPage /></Suspense> },
      { path: '*',       element: <Suspense fallback={<Loader />}><NoEncontradaPage /></Suspense> },
    ],
  },
])

export const AppRouter = () => <RouterProvider router={router} />
