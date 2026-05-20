import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inventarioApi } from './inventarioApi'
import { formatNumber } from '@/features/dashboard/dashboardUtils'
import { getErrorMessage, invalidateInventarioQueries } from './inventarioUtils'

export const MOVEMENT_TYPE_OPTIONS = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'ajuste', label: 'Ajuste' },
]

export const MOVEMENT_REASON_OPTIONS = {
  entrada: [
    { value: 'compra', label: 'Compra' },
    { value: 'devolucion', label: 'Devolucion' },
    { value: 'otro', label: 'Otro' },
  ],
  salida: [
    { value: 'venta', label: 'Venta' },
    { value: 'uso_clinico', label: 'Uso clinico' },
    { value: 'vencimiento', label: 'Vencimiento' },
    { value: 'otro', label: 'Otro' },
  ],
  ajuste: [
    { value: 'ajuste_inventario', label: 'Ajuste de inventario' },
    { value: 'otro', label: 'Otro' },
  ],
}

const DEFAULT_MOVEMENT_FORM = {
  productoId: '',
  tipo: 'entrada',
  cantidad: '',
  motivo: 'compra',
  observaciones: '',
  precioUnitario: '',
}

export function useInventarioMovimientos({ enabled }) {
  const queryClient = useQueryClient()

  const [movementForm, setMovementForm] = useState(DEFAULT_MOVEMENT_FORM)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [pagina, setPagina] = useState(1)

  const motivosDisponibles = MOVEMENT_REASON_OPTIONS[movementForm.tipo] || MOVEMENT_REASON_OPTIONS.entrada

  const movimientosQuery = useQuery({
    queryKey: ['inventario-movimientos', pagina],
    queryFn: () => inventarioApi.obtenerMovimientos({ pagina, limite: 10 }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const productoDetalleQuery = useQuery({
    queryKey: ['inventario-producto-detalle', selectedProduct?.id],
    queryFn: () => inventarioApi.obtenerProducto(selectedProduct.id),
    enabled: enabled && Boolean(selectedProduct?.id),
  })

  const registrarMovimientoMutation = useMutation({
    mutationFn: ({ productoId, payload }) => inventarioApi.registrarMovimiento(productoId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Movimiento registrado exitosamente')
      setMovementForm(DEFAULT_MOVEMENT_FORM)
      setSelectedProduct(null)
      invalidateInventarioQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ['inventario-movimientos'] })
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible registrar el movimiento.')),
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
        producto: m.producto?.nombre || 'Producto',
        tipo: m.tipo,
        motivo: m.motivo,
        cambio: `${m.stockAnterior} → ${m.stockNuevo}`,
      })),
    [movimientosQuery.data?.movimientos]
  )

  const detalleProducto = productoDetalleQuery.data?.producto || selectedProduct

  const detalleMovimientosRows = useMemo(
    () =>
      (productoDetalleQuery.data?.producto?.movimientos || []).map((m) => ({
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
        cambio: `${m.stockAnterior} → ${m.stockNuevo}`,
      })),
    [productoDetalleQuery.data?.producto?.movimientos]
  )

  function selectProduct(producto) {
    setSelectedProduct(producto)
    setMovementForm((current) => ({
      ...DEFAULT_MOVEMENT_FORM,
      tipo: current.tipo,
      motivo: (MOVEMENT_REASON_OPTIONS[current.tipo] || MOVEMENT_REASON_OPTIONS.entrada)[0].value,
      productoId: producto.id,
    }))
  }

  function clearSelection() {
    setSelectedProduct(null)
    setMovementForm(DEFAULT_MOVEMENT_FORM)
  }

  function submitMovementForm(event) {
    event.preventDefault()
    if (!movementForm.productoId) {
      toast.error('Selecciona un producto antes de registrar el movimiento.')
      return
    }
    if (!movementForm.cantidad || Number(movementForm.cantidad) <= 0) {
      toast.error('La cantidad del movimiento debe ser mayor a 0.')
      return
    }
    registrarMovimientoMutation.mutate({
      productoId: movementForm.productoId,
      payload: {
        tipo: movementForm.tipo,
        cantidad: Number(movementForm.cantidad),
        motivo: movementForm.motivo,
        observaciones: movementForm.observaciones.trim() || undefined,
        precioUnitario: movementForm.precioUnitario ? Number(movementForm.precioUnitario) : 0,
      },
    })
  }

  return {
    movimientosQuery,
    productoDetalleQuery,
    movimientosRows,
    detalleProducto,
    detalleMovimientosRows,
    motivosDisponibles,
    movementForm, setMovementForm,
    selectedProduct,
    pagina, setPagina,
    isPendingMovement: registrarMovimientoMutation.isPending,
    selectProduct,
    clearSelection,
    submitMovementForm,
  }
}
