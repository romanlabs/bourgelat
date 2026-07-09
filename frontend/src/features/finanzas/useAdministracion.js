import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { administracionApi } from './administracionApi'

const KEYS = {
  gastos: (filtros) => ['administracion', 'gastos', filtros],
  cuentasPorCobrar: ['administracion', 'cuentas-por-cobrar'],
  rentabilidad: (periodo) => ['administracion', 'rentabilidad', periodo],
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
      queryClient.invalidateQueries({ queryKey: ['administracion'] })
      // El abono cambia estado/saldo de la factura y puede tocar la caja.
      queryClient.invalidateQueries({ queryKey: ['finanzas'] })
      queryClient.invalidateQueries({ queryKey: ['caja'] })
    },
  })
}

export function useRentabilidad(periodo) {
  return useQuery({
    queryKey: KEYS.rentabilidad(periodo),
    queryFn: () => administracionApi.obtenerRentabilidad(periodo),
    enabled: Boolean(periodo?.fechaInicio && periodo?.fechaFin),
  })
}
