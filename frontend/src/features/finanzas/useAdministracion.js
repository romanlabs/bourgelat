import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidarDominios } from '@/lib/queryKeys'
import { administracionApi } from './administracionApi'

const KEYS = {
  gastos: (filtros) => ['administracion', 'gastos', filtros],
  cuentasPorCobrar: ['administracion', 'cuentas-por-cobrar'],
  rentabilidad: (periodo) => ['administracion', 'rentabilidad', periodo],
  analisisPeriodo: (periodo) => ['administracion', 'analisis-periodo', periodo],
}

export function useGastos(filtros = {}) {
  return useQuery({
    queryKey: KEYS.gastos(filtros),
    queryFn: () => administracionApi.obtenerGastos(filtros),
    keepPreviousData: true,
  })
}

export function useCrearGasto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: administracionApi.crearGasto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['administracion'] })
    },
  })
}

export function useAnularGasto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ gastoId, motivoAnulacion }) =>
      administracionApi.anularGasto(gastoId, motivoAnulacion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['administracion'] })
    },
  })
}

export function useCuentasPorCobrar() {
  return useQuery({
    queryKey: KEYS.cuentasPorCobrar,
    queryFn: administracionApi.obtenerCuentasPorCobrar,
  })
}

export function useRegistrarAbono() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ facturaId, ...payload }) =>
      administracionApi.registrarAbono(facturaId, payload),
    onSuccess: () => {
      // El abono cambia estado/saldo de la factura y puede tocar la caja.
      invalidarDominios(queryClient, 'facturacion', 'caja')
    },
  })
}

export function useRentabilidad(periodo, { enabled = true } = {}) {
  return useQuery({
    queryKey: KEYS.rentabilidad(periodo),
    queryFn: () => administracionApi.obtenerRentabilidad(periodo),
    enabled: enabled && Boolean(periodo?.fechaInicio && periodo?.fechaFin),
  })
}

// Cuelga de la raíz 'administracion': la refrescan las mutaciones de gastos y
// todo el dominio 'facturacion' (ventas, abonos, anulaciones).
export function useAnalisisPeriodo(periodo, { enabled = true } = {}) {
  return useQuery({
    queryKey: KEYS.analisisPeriodo(periodo),
    queryFn: () => administracionApi.obtenerAnalisisPeriodo(periodo),
    enabled: enabled && Boolean(periodo?.fechaInicio && periodo?.fechaFin),
    placeholderData: (previousData) => previousData,
  })
}
