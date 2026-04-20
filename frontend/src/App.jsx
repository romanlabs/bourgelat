import { QueryClientProvider } from '@tanstack/react-query'
import { QueryClient } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppRouter } from '@/router'
import { useEffect, useState } from 'react'
import { authApi } from '@/features/auth/authApi'
import { useAuthStore } from '@/store/authStore'
import AppErrorBoundary from '@/components/shared/AppErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error) => {
        const status = error?.response?.status
        if (status && status >= 400 && status < 500) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

const APP_HOSTS = new Set(['app.bourgelat.co', 'staging.bourgelat.co'])
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/agenda',
  '/pacientes',
  '/historias',
  '/antecedentes',
  '/configuracion',
  '/usuarios',
  '/auditoria',
  '/inventario',
  '/finanzas',
  '/superadmin',
]

const shouldBootstrapSession = () => {
  const hostname = window.location.hostname.toLowerCase()
  return APP_HOSTS.has(hostname) || PROTECTED_PREFIXES.some((path) => window.location.pathname.startsWith(path))
}

function AuthBootstrap({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const [checking, setChecking] = useState(() => shouldBootstrapSession() || useAuthStore.getState().isAuthenticated)

  useEffect(() => {
    const needsSessionCheck = shouldBootstrapSession() || isAuthenticated

    if (!needsSessionCheck) {
      return undefined
    }

    let active = true

    authApi.me()
      .then((data) => {
        if (!active) return
        setAuth({
          usuario: data.usuario,
          clinica: data.clinica,
          suscripcion: data.suscripcion || null,
        })
      })
      .catch(() => {
        if (!active) return
        clearAuth()
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => {
      active = false
    }
  }, [clearAuth, isAuthenticated, setAuth])

  if (checking) {
    return (
      <div className="min-h-screen bg-[var(--color-sidebar)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <AppRouter />
        </AuthBootstrap>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          theme="dark"
        />
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}
