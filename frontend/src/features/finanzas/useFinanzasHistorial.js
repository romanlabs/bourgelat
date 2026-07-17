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

export const ESTADO_LABELS = {
  borrador: 'Borrador',
  emitida: 'Emitida',
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
  if (estado === 'pagada') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (estado === 'anulada') return 'border-red-200 bg-red-50 text-red-700'
  if (estado === 'borrador') return 'border-border bg-muted text-foreground'
  return 'border-primary/30 bg-primary/10 text-primary'
}

export const getEstadoElectronicoTone = (estado) => {
  if (estado === 'validada') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (estado === 'rechazada' || estado === 'error') return 'border-red-200 bg-red-50 text-red-700'
  if (estado === 'pendiente' || estado === 'enviada') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-border bg-muted text-foreground'
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback

export const formatDateTime = (value) => {
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
  const descuento = Number(factura?.descuento || 0)
  const anulada = factura?.estado === 'anulada'
  const lineas = (factura?.items || [])
    .map((item) => {
      const cantidad = formatNumber(item.cantidad || 0)
      const unitario = formatCurrency(item.precioUnitario || 0)
      const subtotal = formatCurrency(item.subtotal || 0)
      return `
        <div class="item">
          <div class="item-name">${item.descripcion || 'Item'}</div>
          <div class="row"><span class="muted">${cantidad} x ${unitario}</span><span class="num">${subtotal}</span></div>
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
          .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
          .clinic-name {
            font-size: 15px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .doc-number { font-size: 13px; font-weight: 700; letter-spacing: 1px; }
          .section { margin-top: 10px; }
          .divider { border-top: 1px dashed #94a3b8; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .row span:last-child { text-align: right; }
          .item { margin-bottom: 7px; }
          .item-name { font-weight: 700; }
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-top: 2px solid #111827;
            margin-top: 8px;
            padding-top: 6px;
            font-weight: 700;
          }
          .total-row .amount { font-size: 16px; }
          .stamp {
            border: 2px solid #111827;
            text-align: center;
            font-weight: 700;
            letter-spacing: 4px;
            padding: 4px 0;
            margin: 10px 0;
          }
          .footer { margin-top: 14px; text-align: center; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="clinic-name">${nombreClinica}</div>
          ${identificacion ? `<div class="muted">${identificacion}</div>` : ''}
          ${ubicacion ? `<div class="muted">${ubicacion}</div>` : ''}
        </div>
        <div class="divider"></div>
        ${anulada ? '<div class="stamp">ANULADA</div>' : ''}
        <div class="center doc-number">FACTURA ${factura?.numero || '-'}</div>
        <div class="section">
          <div class="row"><span class="muted">Fecha</span><span>${formatDateTime(factura?.createdAt || factura?.fecha)}</span></div>
          <div class="row"><span class="muted">Cliente</span><span>${factura?.propietario?.nombre || 'Consumidor final'}</span></div>
          <div class="row"><span class="muted">Pago</span><span>${PAYMENT_METHOD_LABELS[factura?.metodoPago] || factura?.metodoPago || '-'}</span></div>
          <div class="row"><span class="muted">Atendio</span><span>${factura?.usuario?.nombre || '-'}</span></div>
        </div>
        <div class="divider"></div>
        <div class="section">
          ${lineas || '<div class="muted">Sin items registrados.</div>'}
        </div>
        <div class="section">
          <div class="row"><span class="muted">Subtotal</span><span class="num">${formatCurrency(factura?.subtotal || 0)}</span></div>
          ${descuento > 0 ? `<div class="row"><span class="muted">Descuento</span><span class="num">-${formatCurrency(descuento)}</span></div>` : ''}
          <div class="total-row"><span>TOTAL</span><span class="amount num">${formatCurrency(factura?.total || 0)}</span></div>
        </div>
        ${factura?.estadoElectronico === 'validada' && factura?.cufe
          ? `<div class="section"><div class="muted" style="word-break: break-all; font-size: 10px;">CUFE: ${factura.cufe}</div></div>`
          : ''}
        <div class="footer">
          <div>Gracias por confiar en nosotros</div>
          <div class="muted">${nombreClinica} · Bourgelat</div>
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
      // La anulacion revierte el efectivo del turno de caja abierto.
      queryClient.invalidateQueries({ queryKey: ['caja-turno-activo'] })
      queryClient.invalidateQueries({ queryKey: ['caja-movimientos'] })
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
