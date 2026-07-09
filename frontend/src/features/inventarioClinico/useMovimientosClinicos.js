import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventarioClinicoApi } from './inventarioClinicoApi'
import { formatNumber } from '@/features/dashboard/dashboardUtils'

export function useMovimientosClinicos({ enabled }) {
  const [pagina, setPagina] = useState(1)
  const [selectedInsumo, setSelectedInsumo] = useState(null)

  const movimientosQuery = useQuery({
    queryKey: ['inventario-clinico-movimientos', pagina],
    queryFn: () => inventarioClinicoApi.obtenerMovimientos({ pagina, limite: 10 }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const insumoDetalleQuery = useQuery({
    queryKey: ['inventario-clinico-insumo-detalle', selectedInsumo?.id],
    queryFn: () => inventarioClinicoApi.obtenerInsumo(selectedInsumo.id),
    enabled: enabled && Boolean(selectedInsumo?.id),
  })

  const movimientosRows = useMemo(
    () =>
      (movimientosQuery.data?.movimientos || []).map((m) => ({
        id: m.id,
        fecha: new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(m.createdAt)),
        insumo: m.insumo?.nombre || 'Insumo',
        tipo: m.tipo,
        motivo: m.motivo,
        cambio: `${formatNumber(m.stockNuevo)} ${m.insumo?.unidadBase || ''}`.trim(),
      })),
    [movimientosQuery.data?.movimientos]
  )

  const detalleInsumo = insumoDetalleQuery.data?.insumo || selectedInsumo

  const detalleMovimientosRows = useMemo(
    () =>
      (insumoDetalleQuery.data?.insumo?.movimientos || []).map((m) => ({
        id: m.id,
        fecha: new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(m.createdAt)),
        tipo: m.tipo,
        motivo: m.motivo.replaceAll('_', ' '),
        cantidad: formatNumber(m.cantidad),
        cambio: formatNumber(m.stockNuevo),
      })),
    [insumoDetalleQuery.data?.insumo?.movimientos]
  )

  function selectInsumo(insumo) {
    setSelectedInsumo(insumo)
  }

  function clearSelection() {
    setSelectedInsumo(null)
  }

  return {
    movimientosQuery,
    insumoDetalleQuery,
    movimientosRows,
    detalleInsumo,
    detalleMovimientosRows,
    selectedInsumo,
    pagina, setPagina,
    selectInsumo,
    clearSelection,
  }
}
