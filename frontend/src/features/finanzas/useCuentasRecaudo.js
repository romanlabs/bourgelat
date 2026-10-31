import { useQuery } from '@tanstack/react-query'
import { cuentasRecaudoApi } from './cuentasRecaudoApi'

// Todas las cuentas (Configuración) o solo las activas (al cobrar). Cambian
// poco: se guardan un rato y Configuración las invalida al editarlas.
export function useCuentasRecaudo({ soloActivas = false, enabled = true } = {}) {
  return useQuery({
    queryKey: ['cuentas-recaudo', soloActivas ? 'activas' : 'todas'],
    queryFn: () => cuentasRecaudoApi.listar(soloActivas ? { activo: true } : {}),
    select: (data) => data?.cuentas || [],
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}
