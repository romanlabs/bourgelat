import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import { inventarioApi } from './inventarioApi'
import { formatLongDate } from '@/features/dashboard/dashboardUtils'

const DONUT_COLORS = ['#0f4c81', '#0f766e', '#f59e0b', '#7c3aed', '#dc2626', '#64748b']

export function useInventarioResumen({ enabled }) {
  const reporteQuery = useQuery({
    queryKey: ['inventario-reporte-completo'],
    queryFn: dashboardApi.obtenerReporteInventario,
    enabled,
    placeholderData: (prev) => prev,
  })

  const alertasQuery = useQuery({
    queryKey: ['inventario-alertas'],
    queryFn: inventarioApi.obtenerAlertas,
    enabled,
    placeholderData: (prev) => prev,
  })

  const resumen = reporteQuery.data?.resumen || {}

  const categoriasData = useMemo(
    () =>
      Object.entries(reporteQuery.data?.porCategoria || {}).map(([key, value], index) => ({
        key,
        name: key,
        value: Number(value?.total || 0),
        valor: Number(value?.valor || 0),
        color: DONUT_COLORS[index % DONUT_COLORS.length],
      })),
    [reporteQuery.data?.porCategoria]
  )

  const alertsRows = useMemo(() => {
    const rows = []
    ;(alertasQuery.data?.vencidos?.productos || []).forEach((p) => {
      rows.push({ id: `vencido-${p.id}`, tipo: 'Vencido', nombre: p.nombre, categoria: p.categoria, detalle: formatLongDate(p.fechaVencimiento) })
    })
    ;(alertasQuery.data?.proximosVencer?.productos || []).forEach((p) => {
      rows.push({ id: `proximo-${p.id}`, tipo: 'Proximo a vencer', nombre: p.nombre, categoria: p.categoria, detalle: formatLongDate(p.fechaVencimiento) })
    })
    ;(alertasQuery.data?.bajoStock?.productos || []).forEach((p) => {
      rows.push({ id: `stock-${p.id}`, tipo: 'Bajo stock', nombre: p.nombre, categoria: p.categoria, detalle: `${p.stock}/${p.stockMinimo}` })
    })
    return rows
  }, [alertasQuery.data])

  return { reporteQuery, alertasQuery, resumen, categoriasData, alertsRows }
}
