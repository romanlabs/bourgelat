import { QueryClientProvider } from '@tanstack/react-query'
import { QueryClient } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppRouter } from '@/router'

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        theme="dark"
      />
    </QueryClientProvider>
  )
}