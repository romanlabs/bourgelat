import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatNumber,
  formatShortDate,
  getCurrentMonthRange,
} from '@/features/dashboard/dashboardUtils'
import { useAuthStore } from '@/store/authStore'
import { finanzasApi } from './finanzasApi'

export const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'emitida', label: 'Emitidas' },
  { value: 'pagada', label: 'Pagadas' },
  { value: 'anulada', label: 'Anuladas' },
  { value: 'borrador', label: 'Borradores' },
]

export const PAYMENT_FORM_OPTIONS = [
  { value: '1', label: 'Contado' },
  { value: '2', label: 'Credito' },
]

const ESTADO_LABELS = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  pagada: 'Pagada',
  anulada: 'Anulada',
}

const ESTADO_ELECTRONICO_LABELS = {
  no_aplica: 'No aplica',
  pendiente: 'Pendiente',
  enviada: 'Enviada',
  validada: 'Validada',
  rechazada: 'Rechazada',
  error: 'Error',
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback

const formatDateTime = (value) => {
  if (!value) return 'Sin fecha'
  try {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value)
    )
  } catch {
    return 'Sin fecha'
  }
}

const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`

const buildThermalReceiptHtml = ({ factura, clinica }) => {
  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'Bourgelat'
  const identificacion = clinica?.nit ? `NIT ${clinica.nit}` : ''
  const ubicacion = [clinica?.ciudad, clinica?.departamento].filter(Boolean).join(', ')
  const lineas = (factura?.items || [])
    .map((item) => {
      const cantidad = formatNumber(item.cantidad || 0)
      const unitario = formatCurrency(item.precioUnitario || 0)
      const subtotal = formatCurrency(item.subtotal || 0)
      return `
        <div class="item">
          <div class="item-name">${item.descripcion || 'Item'}</div>
          <div class="item-meta">${cantidad} x ${unitario}</div>
          <div class="item-total">${subtotal}</div>
        </div>
      `
    })
    .join('')

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Tirilla ${factura?.numero || ''}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body {
            font-family: "Courier New", monospace;
            width: 72mm;
            margin: 0 auto;
            color: #111827;
            font-size: 12px;
            line-height: 1.45;
          }
          .center { text-align: center; }
          .muted { color: #4b5563; }
          .section { margin-top: 10px; }
          .divider { border-top: 1px dashed #94a3b8; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .row strong:last-child, .row span:last-child { text-align: right; }
          .item { margin-bottom: 8px; }
          .item-name { font-weight: 700; }
          .item-meta, .item-total { color: #374151; }
          .footer { margin-top: 14px; text-align: center; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div><strong>${nombreClinica}</strong></div>
          ${identificacion ? `<div class="muted">${identificacion}</div>` : ''}
          ${ubicacion ? `<div class="muted">${ubicacion}</div>` : ''}
        </div>
        <div class="divider"></div>
        <div class="section">
          <div class="row"><span>Factura</span><strong>${factura?.numero || '-'}</strong></div>
          <div class="row"><span>Fecha</span><span>${formatDateTime(factura?.createdAt || factura?.fecha)}</span></div>
          <div class="row"><span>Tutor</span><span>${factura?.propietario?.nombre || 'Consumidor final'}</span></div>
          <div class="row"><span>Pago</span><span>${PAYMENT_METHOD_LABELS[factura?.metodoPago] || factura?.metodoPago || '-'}</span></div>
        </div>
        <div class="divider"></div>
        <div class="section">
          ${lineas || '<div class="muted">Sin items registrados.</div>'}
        </div>
        <div class="divider"></div>
        <div class="section">
          <div class="row"><span>Subtotal</span><strong>${formatCurrency(factura?.subtotal || 0)}</strong></div>
          <div class="row"><span>Descuento</span><strong>${formatCurrency(factura?.descuento || 0)}</strong></div>
          <div class="row"><span>Total</span><strong>${formatCurrency(factura?.total || 0)}</strong></div>
        </div>
        <div class="section">
          <div class="row"><span>Estado</span><span>${ESTADO_LABELS[factura?.estado] || factura?.estado || '-'}</span></div>
          <div class="row"><span>Electronica</span><span>${ESTADO_ELECTRONICO_LABELS[factura?.estadoElectronico] || factura?.estadoElectronico || '-'}</span></div>
        </div>
        <div class="footer">
          <div>Gracias por tu compra</div>
          <div class="muted">Documento generado desde Bourgelat</div>
        </div>
      </body>
    </html>
  `
}

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
  const [emisionForm, setEmisionForm] = useState(RESET_EMISION)
  const [pagoMetodo, setPagoMetodo] = useState('')

  const resetSeleccion = () => {
    setSelectedFacturaId(null)
    setMotivoAnulacion('')
    setEmisionForm(RESET_EMISION)
  }

  const seleccionarFactura = (id) => {
    setSelectedFacturaId(id)
    setMotivoAnulacion('')
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

  const currentFacturaId = useMemo(() => {
    const disponibles = facturasQuery.data?.facturas || []
    if (selectedFacturaId && disponibles.some((f) => f.id === selectedFacturaId)) {
      return selectedFacturaId
    }
    return disponibles[0]?.id || null
  }, [facturasQuery.data?.facturas, selectedFacturaId])

  const facturaDetalleQuery = useQuery({
    queryKey: ['finanzas-factura-detalle', currentFacturaId],
    queryFn: () => finanzasApi.obtenerFactura(currentFacturaId),
    enabled: enabled && Boolean(currentFacturaId),
    placeholderData: (prev) => prev,
  })

  const emitirFacturaMutation = useMutation({
    mutationFn: ({ facturaId, payload }) => finanzasApi.emitirFacturaElectronica(facturaId, payload),
    onSuccess: (data, variables) => {
      toast.success(data?.message || 'Factura emitida electronicamente')
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-factura-detalle', variables.facturaId] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-ingresos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-ingresos'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible emitir la factura electronicamente.'))
    },
  })

  const registrarPagoMutation = useMutation({
    mutationFn: ({ facturaId, metodoPago }) => finanzasApi.registrarPago(facturaId, { metodoPago }),
    onSuccess: (data, variables) => {
      toast.success(data?.message || 'Pago registrado exitosamente')
      setPagoMetodo('')
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-factura-detalle', variables.facturaId] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-ingresos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-ingresos'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible registrar el pago.'))
    },
  })

  const anularFacturaMutation = useMutation({
    mutationFn: ({ facturaId, motivo }) => finanzasApi.anularFactura(facturaId, motivo),
    onSuccess: (data, variables) => {
      toast.success(data?.message || 'Factura anulada exitosamente')
      setMotivoAnulacion('')
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-factura-detalle', variables.facturaId] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-ingresos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-ingresos'] })
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
      toast.error('La fecha de vencimiento es obligatoria para facturas a credito.')
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

  const handleRegistrarPago = () => {
    if (!facturaSeleccionada) return
    registrarPagoMutation.mutate({
      facturaId: facturaSeleccionada.id,
      metodoPago: pagoMetodo || undefined,
    })
  }

  const handleAnularFactura = () => {
    if (!facturaSeleccionada) return
    if (motivoAnulacion.trim().length < 8) {
      toast.error('Escribe un motivo claro de anulacion para dejar trazabilidad.')
      return
    }
    anularFacturaMutation.mutate({
      facturaId: facturaSeleccionada.id,
      motivo: motivoAnulacion.trim(),
    })
  }

  const handlePrintReceipt = () => {
    if (!facturaSeleccionada) {
      toast.error('Selecciona una factura para imprimir la tirilla.')
      return
    }
    const html = buildThermalReceiptHtml({ factura: facturaSeleccionada, clinica })
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) {
      document.body.removeChild(iframe)
      toast.error('No se pudo preparar la tirilla para impresion.')
      return
    }
    doc.open()
    doc.write(html)
    doc.close()
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
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

  const canRegisterPayment =
    facturaSeleccionada &&
    facturaSeleccionada.estado === 'emitida'

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
    emisionForm,
    setEmisionForm,
    pagoMetodo,
    setPagoMetodo,
    currentFacturaId,
    facturaSeleccionada,
    facturasRows,
    facturasQuery,
    facturaDetalleQuery,
    emitirFacturaMutation,
    anularFacturaMutation,
    registrarPagoMutation,
    canEmitInvoice,
    canVoidInvoice,
    canRegisterPayment,
    ESTADO_LABELS,
    ESTADO_ELECTRONICO_LABELS,
    handleBuscar,
    handleEmitirFactura,
    handleAnularFactura,
    handleRegistrarPago,
    handlePrintReceipt,
    exportCurrentCut,
    seleccionarFactura,
    resetSeleccion,
  }
}
