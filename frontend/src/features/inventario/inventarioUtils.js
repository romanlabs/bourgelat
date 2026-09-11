import { invalidarDominios } from '@/lib/queryKeys'

export const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

export function invalidateInventarioQueries(queryClient) {
  invalidarDominios(queryClient, 'productos')
}
