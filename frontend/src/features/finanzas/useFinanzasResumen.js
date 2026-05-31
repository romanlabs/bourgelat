import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PAYMENT_METHOD_LABELS,
  getCurrentMonthRange,
  mapIngresosPorDia,
  objectToChartData,
} from '@/features/dashboard/dashboardUtils'
import { finanzasApi } from './finanzasApi'

export function useFinanzasResumen({ enabled }) {
  const rangoMes = useMemo(() => getCurrentMonthRange(), [])

  const ingresosQuery = useQuery({
    queryKey: ['finanzas-ingresos', rangoMes.fechaInicio, rangoMes.fechaFin],
    queryFn: () => finanzasApi.obtenerReporteIngresos(rangoMes),
    enabled,
    placeholderData: (prev) => prev,
  })

  const resumenQuery = useQuery({
    queryKey: ['finanzas-facturas-resumen', rangoMes.fechaInicio, rangoMes.fechaFin],
    queryFn: () =>
      finanzasApi.obtenerFacturas({
        fechaInicio: rangoMes.fechaInicio,
        fechaFin: rangoMes.fechaFin,
        pagina: 1,
        limite: 1,
      }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const metodosPago = useMemo(
    () => objectToChartData(ingresosQuery.data?.ingresosPorMetodoPago, PAYMENT_METHOD_LABELS),
    [ingresosQuery.data?.ingresosPorMetodoPago]
  )

  const ingresosPorDia = useMemo(
    () => mapIngresosPorDia(ingresosQuery.data?.ingresosPorDia),
    [ingresosQuery.data?.ingresosPorDia]
  )

  const resumenEstados = resumenQuery.data?.resumenEstados || {}
  const resumenElectronico = resumenQuery.data?.resumenElectronico || {}
  const pendientesElectronicos =
    Number(resumenElectronico.pendiente || 0) +
    Number(resumenElectronico.enviada || 0) +
    Number(resumenElectronico.rechazada || 0) +
    Number(resumenElectronico.error || 0)

  return {
    rangoMes,
    ingresosQuery,
    resumenQuery,
    totalIngresos: ingresosQuery.data?.totalIngresos || 0,
    resumenEstados,
    pendientesElectronicos,
    metodosPago,
    ingresosPorDia,
  }
}
