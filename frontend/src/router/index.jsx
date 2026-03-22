import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute'

const LoginPage     = lazy(() => import('@/pages/LoginPage'))
const RegistroPage  = lazy(() => import('@/pages/RegistroPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const LandingPage   = lazy(() => import('@/pages/LandingPage'))
const PlanesPage    = lazy(() => import('@/pages/PlanesPage'))

const Loader = () => (
  <div className="min-h-screen bg-[var(--color-sidebar)] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
  </div>
)

const router = createBrowserRouter([
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
    ],
  },
  { path: '/',       element: <Suspense fallback={<Loader />}><LandingPage /></Suspense> },
  { path: '/planes', element: <Suspense fallback={<Loader />}><PlanesPage /></Suspense> },
  { path: '*',       element: <Navigate to="/" replace /> },
])

export const AppRouter = () => <RouterProvider router={router} />