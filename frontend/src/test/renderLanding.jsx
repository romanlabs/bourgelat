import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LandingPage from '@/pages/LandingPage'

// La landing monta RegistroDialog, que usa useMutation, así que necesita un
// QueryClientProvider además del router. Sin él los tests fallan al renderizar
// y no llegan a verificar nada.
//
// Cada test recibe un QueryClient nuevo: compartir uno filtra caché entre casos
// y los fallos se vuelven dependientes del orden de ejecución.
export function renderLanding() {
  const queryClient = new QueryClient({
    defaultOptions: {
      // Sin reintentos: un test que falla debe fallar de una, no después de
      // tres intentos y un timeout.
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}
