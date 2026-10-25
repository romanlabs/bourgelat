import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatShortDate,
  getCurrentMonthRange,
} from '@/features/dashboard/dashboardUtils'
import { useAuthStore } from '@/store/authStore'
import { invalidarDominios } from '@/lib/queryKeys'
import { finanzasApi } from './finanzasApi'
import { formatDateTime, imprimirTirilla } from './reciboTermico'
import { mensajeDeError } from '@/lib/errores'

export const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'emitida', label: 'Por cobrar' },
  { value: 'parcial', label: 'Con abono parcial' },
  { value: 'pagada', label: 'Pagadas' },
  { value: 'anulada', label: 'Anuladas' },
  { value: 'borrador', label: 'Borradores' },
]

export const PAYMENT_FORM_OPTIONS = [
  { value: '1', label: 'Contado' },
  { value: '2', label: 'Credito' },
]

export const ESTADO_LABELS = {
  borrador: 'Borrador',
  // Solo el crédito queda emitida: de contado la venta nace pagada.
  emitida: 'Por cobrar',
  parcial: 'Abono parcial',
  pagada: 'Pagada',
  anulada: 'Anulada',
}

export const ESTADO_ELECTRONICO_LABELS = {
  no_aplica: 'No aplica',
  pendiente: 'Pendiente',
  enviada: 'Enviada',
  validada: 'Validada',
  rechazada: 'Rechazada',
  error: 'Error',
}

export const getEstadoTone = (estado) => {
  if (estado === 'pagada') return 'border-success/30 bg-success-soft text-success'
  if (estado === 'anulada') return 'border-danger/30 bg-danger-soft text-danger'
  if (estado === 'borrador') return 'border-border bg-muted text-foreground'
  if (estado === 'emitida' || estado === 'parcial') return 'border-warning/30 bg-warning-soft text-warning'
  return 'border-primary/30 bg-primary/10 text-primary'
}

export const getEstadoElectronicoTone = (estado) => {
  if (estado === 'validada') return 'border-success/30 bg-success-soft text-success'
  if (estado === 'rechazada' || estado === 'error') return 'border-danger/30 bg-danger-soft text-danger'
  if (estado === 'pendiente' || estado === 'enviada') return 'border-warning/30 bg-warning-soft text-warning'
  return 'border-border bg-muted text-foreground'
}

const getErrorMessage = mensajeDeError

// Reexportado: varios componentes del historial lo importan desde este hook.
export { formatDateTime }

const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`

const RESET_EMISION = { formaPagoCodigo: '1', enviarEmail: false, fechaVencimientoPago: '' }

export function useFinanzasHistorial({ enabled, puedeAnular, puedeEmitirElectronica }) {
  const queryClient = useQueryClient()
  const clinica = useAuthStore((state) => state.clinica)
  const rangoMes = useMemo(() => getCurrentMonthRange(), [])

  // Rango editable: por defecto el mes en curso.
  const [fechaInicio, setFechaInicio] = useState(rangoMes.fechaInicio)
  const [fechaFin, setFechaFin] = useState(rangoMes.fechaFin)
  const [estado, setEstado] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [buscarInput, setBuscarInput] = useState('')
  const [buscar, setBuscar] = useState('')
  const [selectedFacturaId, setSelectedFacturaId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  // facturaItemId → razón, para los productos que no vuelven a la bodega.
  const [noVuelven, setNoVuelven] = useState({})
  const [emisionForm, setEmisionForm] = useState(RESET_EMISION)

  const resetSeleccion = () => {
    setSelectedFacturaId(null)
    setMotivoAnulacion('')
    setNoVuelven({})
    setEmisionForm(RESET_EMISION)
  }

  const seleccionarFactura = (id) => {
    setSelectedFacturaId(id)
    setMotivoAnulacion('')
    setNoVuelven({})
    setEmisionForm(RESET_EMISION)
  }

  const facturasQuery = useQuery({
    queryKey: ['finanzas-facturas', estado, buscar, pagina, fechaInicio, fechaFin],
    queryFn: () =>
      finanzasApi.obtenerFacturas({
        fechaInicio,
        fechaFin,
        estado: estado !== 'todos' ? estado : undefined,
        buscar: buscar || undefined,
        pagina,
        limite: 12,
      }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const cambiarRango = (inicio, fin) => {
    if (inicio) setFechaInicio(inicio)
    if (fin) setFechaFin(fin)
    setPagina(1)
    resetSeleccion()
  }

  // Sin fallback a la primera factura: el detalle vive en un modal y solo debe
  // abrirse con una seleccion explicita. Si la factura sale del listado filtrado
  // (p. ej. tras anularla), la seleccion cae a null y el modal se cierra solo.
  const currentFacturaId = useMemo(() => {
    const disponibles = facturasQuery.data?.facturas || []
    if (selectedFacturaId && disponibles.some((f) => f.id === selectedFacturaId)) {
      return selectedFacturaId
    }
    return null
  }, [facturasQuery.data?.facturas, selectedFacturaId])

  const facturaDetalleQuery = useQuery({
    queryKey: ['finanzas-factura-detalle', currentFacturaId],
    queryFn: () => finanzasApi.obtenerFactura(currentFacturaId),
    enabled: enabled && Boolean(currentFacturaId),
    placeholderData: (prev) => prev,
  })

  const emitirFacturaMutation = useMutation({
    mutationFn: ({ facturaId, payload }) => finanzasApi.emitirFacturaElectronica(facturaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Factura emitida electrónicamente')
      invalidarDominios(queryClient, 'facturacion')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible emitir la factura electrónicamente.'))
    },
  })

  const anularFacturaMutation = useMutation({
    mutationFn: ({ facturaId, motivo, sinReingreso }) => finanzasApi.anularFactura(facturaId, motivo, sinReingreso),
    onSuccess: (data) => {
      toast.success(data?.message || 'Factura anulada exitosamente')
      setMotivoAnulacion('')
      setNoVuelven({})
      // La anulacion revierte el efectivo del turno de caja abierto y devuelve
      // el stock de los items de producto (ver facturaController.anularFactura).
      // También suelta la consulta o el servicio de estilos que cobraba.
      invalidarDominios(queryClient, 'facturacion', 'caja', 'productos', 'historias')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible anular la factura.'))
    },
  })

  const facturaSeleccionada = facturaDetalleQuery.data?.factura || null

  const facturasRows = useMemo(
    () =>
      (facturasQuery.data?.facturas || []).map((factura) => ({
        id: factura.id,
        numero: factura.numero,
        fecha: formatShortDate(factura.fecha),
        cliente: factura.propietario?.nombre || 'Sin propietario',
        usuario: factura.usuario?.nombre || 'Sin usuario',
        estado: factura.estado,
        total: formatCurrency(factura.total),
      })),
    [facturasQuery.data?.facturas]
  )

  const handleBuscar = (event) => {
    event.preventDefault()
    setPagina(1)
    resetSeleccion()
    setBuscar(buscarInput.trim())
  }

  const handleEmitirFactura = () => {
    if (!facturaSeleccionada) return
    if (emisionForm.formaPagoCodigo === '2' && !emisionForm.fechaVencimientoPago) {
      toast.error('La fecha de vencimiento es obligatoria para facturas a crédito.')
      return
    }
    emitirFacturaMutation.mutate({
      facturaId: facturaSeleccionada.id,
      payload: {
        formaPagoCodigo: emisionForm.formaPagoCodigo,
        enviarEmail: emisionForm.enviarEmail,
        fechaVencimientoPago:
          emisionForm.formaPagoCodigo === '2' ? emisionForm.fechaVencimientoPago : undefined,
      },
    })
  }

  const handleAnularFactura = () => {
    if (!facturaSeleccionada) return
    if (motivoAnulacion.trim().length < 8) {
      toast.error('Escribe un motivo claro de anulación para dejar trazabilidad.')
      return
    }
    anularFacturaMutation.mutate({
      facturaId: facturaSeleccionada.id,
      motivo: motivoAnulacion.trim(),
      sinReingreso: Object.entries(noVuelven).map(([facturaItemId, razon]) => ({ facturaItemId, razon })),
    })
  }

  const handlePrintReceipt = () => {
    if (!facturaSeleccionada) {
      toast.error('Selecciona una factura para imprimir la tirilla.')
      return
    }
    imprimirTirilla({ factura: facturaSeleccionada, clinica })
  }

  const exportCurrentCut = () => {
    const rows = facturasQuery.data?.facturas || []
    if (!rows.length) {
      toast.error('No hay facturas para exportar con el filtro actual.')
      return
    }
    const csvRows = [
      ['Factura', 'Fecha', 'Cliente', 'Responsable', 'Estado', 'Total'],
      ...rows.map((f) => [
        f.numero,
        f.fecha,
        f.propietario?.nombre || '',
        f.usuario?.nombre || '',
        f.estado,
        f.total,
      ]),
    ]
    const csvContent = csvRows.map((row) => row.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `finanzas-${fechaInicio}-${fechaFin}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const canEmitInvoice =
    puedeEmitirElectronica &&
    facturaSeleccionada &&
    ['emitida', 'pagada'].includes(facturaSeleccionada.estado) &&
    facturaSeleccionada.estadoElectronico !== 'validada' &&
    facturaSeleccionada.estado !== 'anulada'

  // Solo las ventas a crédito con saldo se cobran desde el historial.
  const canAbonar =
    Boolean(facturaSeleccionada) &&
    ['emitida', 'parcial'].includes(facturaSeleccionada.estado) &&
    Number(facturaSeleccionada.saldoPendiente) > 0

  const canVoidInvoice =
    puedeAnular &&
    facturaSeleccionada &&
    facturaSeleccionada.estado !== 'anulada' &&
    !(facturaSeleccionada.estadoElectronico === 'validada' && facturaSeleccionada.cufe)

  return {
    rangoMes,
    fechaInicio,
    fechaFin,
    cambiarRango,
    estado,
    setEstado,
    pagina,
    setPagina,
    buscarInput,
    setBuscarInput,
    motivoAnulacion,
    setMotivoAnulacion,
    noVuelven,
    setNoVuelven,
    emisionForm,
    setEmisionForm,
    currentFacturaId,
    facturaSeleccionada,
    facturasRows,
    facturasQuery,
    facturaDetalleQuery,
    emitirFacturaMutation,
    anularFacturaMutation,
    canEmitInvoice,
    canVoidInvoice,
    canAbonar,
    ESTADO_LABELS,
    ESTADO_ELECTRONICO_LABELS,
    handleBuscar,
    handleEmitirFactura,
    handleAnularFactura,
    handlePrintReceipt,
    exportCurrentCut,
    seleccionarFactura,
    resetSeleccion,
  }
}
