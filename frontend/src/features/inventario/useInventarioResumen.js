import { chartColors } from '@/lib/theme'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import { inventarioApi } from './inventarioApi'
import { inventarioClinicoApi } from '@/features/inventarioClinico/inventarioClinicoApi'
import { formatLongDate } from '@/features/dashboard/dashboardUtils'
import { CATEGORY_OPTIONS } from './useInventarioProductos'
import { CATEGORY_OPTIONS as CLINICO_CATEGORY_OPTIONS } from '@/features/inventarioClinico/useInsumosClinicos'

// El reporte agrupa por la clave guardada ('medicamento'); la grafica muestra la etiqueta.
const etiquetaCategoria = (clave) =>
  [...CATEGORY_OPTIONS, ...CLINICO_CATEGORY_OPTIONS].find((opcion) => opcion.value === clave)?.label || clave

const DONUT_COLORS = chartColors.categorica

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
        name: etiquetaCategoria(key),
        value: Number(value?.total || 0),
        valor: Number(value?.valor || 0),
        color: DONUT_COLORS[index % DONUT_COLORS.length],
      })),
    [reporteQuery.data?.porCategoria]
  )

  const alertasClinicasQuery = useQuery({
    queryKey: ['inventario-clinico-alertas'],
    queryFn: inventarioClinicoApi.obtenerAlertas,
    enabled,
    placeholderData: (prev) => prev,
  })

  // Vencidos primero, luego proximos y al final cantidad baja; dentro de cada
  // tipo van juntos ventas y clinico para no esconder un insumo vencido al final.
  const alertsRows = useMemo(() => {
    const ventas = alertasQuery.data
    const clinico = alertasClinicasQuery.data
    const fila = (tipo, inventario, item, detalle) => ({
      id: `${tipo}-${inventario}-${item.id}`,
      tipo,
      inventario,
      nombre: item.nombre,
      categoria: item.categoria,
      detalle,
      raw: item,
    })
    const porVencimiento = (tipo, clave) => [
      ...(ventas?.[clave]?.productos || []).map((p) => fila(tipo, 'ventas', p, formatLongDate(p.fechaVencimiento))),
      ...(clinico?.[clave]?.insumos || []).map((i) => fila(tipo, 'clinico', i, formatLongDate(i.fechaVencimiento))),
    ]
    return [
      ...porVencimiento('Vencido', 'vencidos'),
      ...porVencimiento('Proximo a vencer', 'proximosVencer'),
      ...(ventas?.bajoStock?.productos || []).map((p) =>
        fila('Cantidad baja', 'ventas', p, `${p.stock}/${p.stockMinimo}`)),
      ...(clinico?.bajoStock?.insumos || []).map((i) =>
        fila('Cantidad baja', 'clinico', i, `${Number(i.stock)}/${Number(i.stockMinimo)} ${i.unidadBase}`)),
    ]
  }, [alertasQuery.data, alertasClinicasQuery.data])

  return { reporteQuery, alertasQuery, resumen, categoriasData, alertsRows }
}
