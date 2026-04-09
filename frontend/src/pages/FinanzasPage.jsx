import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Ban,
  CircleAlert,
  Download,
  FileText,
  Plus,
  Printer,
  Receipt,
  ScanLine,
  Search,
  SendHorizontal,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import {
  DashboardPanel,
  DataTable,
  DonutCard,
  EmptyModuleState,
  KpiCard,
  LinePanel,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import {
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatLongDate,
  formatNumber,
  formatShortDate,
  getCurrentMonthRange,
  mapIngresosPorDia,
  objectToChartData,
} from '@/features/dashboard/dashboardUtils'
import { finanzasApi } from '@/features/finanzas/finanzasApi'
import { inventarioApi } from '@/features/inventario/inventarioApi'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'emitida', label: 'Emitidas' },
  { value: 'pagada', label: 'Pagadas' },
  { value: 'anulada', label: 'Anuladas' },
  { value: 'borrador', label: 'Borradores' },
]

const PAYMENT_FORM_OPTIONS = [
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

const PAYMENT_METHOD_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta_debito', label: 'Tarjeta debito' },
  { value: 'tarjeta_credito', label: 'Tarjeta credito' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'otro', label: 'Otro' },
]

const createBlankInvoiceItem = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  tipo: 'servicio',
  descripcion: '',
  cantidad: '1',
  precioUnitario: '',
  descuento: '0',
  productoId: '',
})

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback

const formatDateTime = (value) => {
  if (!value) return 'Sin fecha'

  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return 'Sin fecha'
  }
}

const getEstadoTone = (estado) => {
  if (estado === 'pagada') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (estado === 'anulada') return 'border-red-200 bg-red-50 text-red-700'
  if (estado === 'borrador') return 'border-slate-200 bg-slate-100 text-slate-700'
  return 'border-cyan-200 bg-cyan-50 text-cyan-700'
}

const getEstadoElectronicoTone = (estado) => {
  if (estado === 'validada') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (estado === 'rechazada' || estado === 'error') return 'border-red-200 bg-red-50 text-red-700'
  if (estado === 'pendiente' || estado === 'enviada') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

const canEmitInvoice = (factura, canManageElectronic) =>
  canManageElectronic &&
  factura &&
  ['emitida', 'pagada'].includes(factura.estado) &&
  factura.estadoElectronico !== 'validada' &&
  factura.estado !== 'anulada'

const canVoidInvoice = (factura, canVoid) =>
  canVoid &&
  factura &&
  factura.estado !== 'anulada' &&
  !(factura.estadoElectronico === 'validada' && factura.cufe)

const toAmount = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
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
          .row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
          }
          .row strong:last-child,
          .row span:last-child { text-align: right; }
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

function RestrictedFinancePage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Caja y facturacion"
          subtitle="Este modulo se muestra a perfiles operativos y administrativos autorizados."
        >
          <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
            Tu acceso actual no tiene visibilidad financiera completa. Si necesitas revisar ingresos
            o facturas, solicita permisos al administrador principal o al facturador de la clinica.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function FinanzasPage() {
  const queryClient = useQueryClient()
  const clinica = useAuthStore((state) => state.clinica)
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const [estado, setEstado] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [buscarInput, setBuscarInput] = useState('')
  const [buscar, setBuscar] = useState('')
  const [selectedFacturaId, setSelectedFacturaId] = useState(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [emisionForm, setEmisionForm] = useState({
    formaPagoCodigo: '1',
    enviarEmail: false,
    fechaVencimientoPago: '',
  })
  const [invoiceForm, setInvoiceForm] = useState({
    propietarioId: '',
    metodoPago: 'efectivo',
    observaciones: '',
    descuentoGeneral: '0',
    items: [createBlankInvoiceItem()],
  })

  const rangoMes = useMemo(() => getCurrentMonthRange(), [])
  const deferredOwnerSearch = useDeferredValue(ownerSearch)
  const deferredProductSearch = useDeferredValue(productSearch)
  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'facturador', 'recepcionista', 'auxiliar', 'veterinario'])
  const funcionalidades = Array.isArray(suscripcion?.funcionalidades) ? suscripcion.funcionalidades : []
  const puedeVerFinanzas =
    rolPermitido &&
    funcionalidades.includes('facturacion_interna') &&
    funcionalidades.includes('reportes_operativos')
  const puedeConsultarInventario = puedeVerFinanzas && funcionalidades.includes('inventario')
  const puedeEmitirElectronica =
    puedeVerFinanzas &&
    funcionalidades.includes('facturacion_electronica') &&
    hasAnyRole(usuario, ['admin', 'superadmin', 'facturador'])
  const puedeAnular = hasAnyRole(usuario, ['admin', 'superadmin'])
  const emisionAutomaticaActiva = puedeEmitirElectronica

  useEffect(() => {
    document.title = 'Caja y facturacion | Bourgelat'
  }, [])

  const ingresosQuery = useQuery({
    queryKey: ['finanzas-ingresos', rangoMes.fechaInicio, rangoMes.fechaFin],
    queryFn: () => finanzasApi.obtenerReporteIngresos(rangoMes),
    enabled: puedeVerFinanzas,
    placeholderData: (previousData) => previousData,
  })

  const facturasQuery = useQuery({
    queryKey: ['finanzas-facturas', estado, buscar, pagina, rangoMes.fechaInicio, rangoMes.fechaFin],
    queryFn: () =>
      finanzasApi.obtenerFacturas({
        fechaInicio: rangoMes.fechaInicio,
        fechaFin: rangoMes.fechaFin,
        estado: estado !== 'todos' ? estado : undefined,
        buscar: buscar || undefined,
        pagina,
        limite: 12,
      }),
    enabled: puedeVerFinanzas,
    placeholderData: (previousData) => previousData,
  })

  const propietariosQuery = useQuery({
    queryKey: ['finanzas-propietarios', deferredOwnerSearch],
    queryFn: () =>
      pacientesApi.obtenerPropietarios({
        buscar: deferredOwnerSearch || undefined,
        limite: 8,
      }),
    enabled: puedeVerFinanzas,
    placeholderData: (previousData) => previousData,
  })

  const productosQuery = useQuery({
    queryKey: ['finanzas-productos', deferredProductSearch],
    queryFn: () =>
      inventarioApi.obtenerProductos({
        buscar: deferredProductSearch || undefined,
        limite: 8,
      }),
    enabled: puedeConsultarInventario,
    placeholderData: (previousData) => previousData,
  })

  const buscarProductoPorBarcodeMutation = useMutation({
    mutationFn: (codigo) => inventarioApi.obtenerProductoPorBarcode(codigo),
    onSuccess: (data) => {
      if (data?.producto) {
        addProductToInvoice(data.producto)
        setBarcodeInput('')
        toast.success(`Producto agregado: ${data.producto.nombre}`)
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible leer el codigo de barras.'))
    },
  })

  const currentFacturaId = useMemo(() => {
    const facturasDisponibles = facturasQuery.data?.facturas || []

    if (selectedFacturaId && facturasDisponibles.some((item) => item.id === selectedFacturaId)) {
      return selectedFacturaId
    }

    return facturasDisponibles[0]?.id || null
  }, [facturasQuery.data?.facturas, selectedFacturaId])

  const facturaDetalleQuery = useQuery({
    queryKey: ['finanzas-factura-detalle', currentFacturaId],
    queryFn: () => finanzasApi.obtenerFactura(currentFacturaId),
    enabled: puedeVerFinanzas && Boolean(currentFacturaId),
    placeholderData: (previousData) => previousData,
  })

  const emitirFacturaMutation = useMutation({
    mutationFn: ({ facturaId, payload }) => finanzasApi.emitirFacturaElectronica(facturaId, payload),
    onSuccess: (data, variables) => {
      toast.success(data?.message || 'Factura emitida electronicamente')
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-factura-detalle', variables.facturaId] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-ingresos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-ingresos'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible emitir la factura electronicamente.'))
    },
  })

  const crearFacturaMutation = useMutation({
    mutationFn: (payload) => finanzasApi.crearFactura(payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Factura creada exitosamente')
      setInvoiceForm({
        propietarioId: '',
        metodoPago: 'efectivo',
        observaciones: '',
        descuentoGeneral: '0',
        items: [createBlankInvoiceItem()],
      })
      setOwnerSearch('')
      setProductSearch('')
      setBarcodeInput('')
      setBuscar('')
      setBuscarInput('')
      setPagina(1)
      if (data?.factura?.id) {
        setSelectedFacturaId(data.factura.id)
      }
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-ingresos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-ingresos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })

      if (emisionAutomaticaActiva && data?.factura?.id && data?.factura?.estadoElectronico === 'pendiente') {
        emitirFacturaMutation.mutate({
          facturaId: data.factura.id,
          payload: {
            formaPagoCodigo: '1',
            enviarEmail: false,
          },
        })
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear la factura.'))
    },
  })

  const anularFacturaMutation = useMutation({
    mutationFn: ({ facturaId, motivo }) => finanzasApi.anularFactura(facturaId, motivo),
    onSuccess: (data, variables) => {
      toast.success(data?.message || 'Factura anulada exitosamente')
      setMotivoAnulacion('')
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-factura-detalle', variables.facturaId] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-ingresos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-ingresos'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible anular la factura.'))
    },
  })

  const metodosPago = useMemo(
    () => objectToChartData(ingresosQuery.data?.ingresosPorMetodoPago, PAYMENT_METHOD_LABELS),
    [ingresosQuery.data?.ingresosPorMetodoPago]
  )
  const ingresosPorDia = useMemo(
    () => mapIngresosPorDia(ingresosQuery.data?.ingresosPorDia),
    [ingresosQuery.data?.ingresosPorDia]
  )
  const resumenEstados = facturasQuery.data?.resumenEstados || {}
  const resumenElectronico = facturasQuery.data?.resumenElectronico || {}
  const pendientesElectronicos =
    Number(resumenElectronico.pendiente || 0) +
    Number(resumenElectronico.enviada || 0) +
    Number(resumenElectronico.rechazada || 0) +
    Number(resumenElectronico.error || 0)

  const facturaSeleccionada = facturaDetalleQuery.data?.factura || null
  const propietariosDisponibles = propietariosQuery.data?.propietarios || []
  const productosDisponibles = productosQuery.data?.productos || []
  const selectedOwner = propietariosDisponibles.find(
    (propietario) => propietario.id === invoiceForm.propietarioId
  )
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
  const invoiceTotals = useMemo(() => {
    const subtotal = invoiceForm.items.reduce((acc, item) => {
      const cantidad = Math.max(toAmount(item.cantidad), 0)
      const precio = Math.max(toAmount(item.precioUnitario), 0)
      const descuento = Math.max(toAmount(item.descuento), 0)
      return acc + Math.max(cantidad * precio - descuento, 0)
    }, 0)
    const descuentoGeneral = Math.max(toAmount(invoiceForm.descuentoGeneral), 0)

    return {
      subtotal,
      descuentoGeneral,
      total: Math.max(subtotal - descuentoGeneral, 0),
    }
  }, [invoiceForm.descuentoGeneral, invoiceForm.items])

  const handleBuscar = (event) => {
    event.preventDefault()
    setPagina(1)
    setSelectedFacturaId(null)
    setMotivoAnulacion('')
    setEmisionForm({
      formaPagoCodigo: '1',
      enviarEmail: false,
      fechaVencimientoPago: '',
    })
    setBuscar(buscarInput.trim())
  }

  const updateInvoiceItem = (itemId, field, value) => {
    setInvoiceForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }))
  }

  const addServiceItem = () => {
    setInvoiceForm((current) => ({
      ...current,
      items: [...current.items, createBlankInvoiceItem()],
    }))
  }

  const removeInvoiceItem = (itemId) => {
    setInvoiceForm((current) => ({
      ...current,
      items:
        current.items.length > 1
          ? current.items.filter((item) => item.id !== itemId)
          : current.items,
    }))
  }

  const addProductToInvoice = (product) => {
    setInvoiceForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          tipo: 'producto',
          descripcion: product.nombre,
          cantidad: '1',
          precioUnitario: String(product.precioVenta || 0),
          descuento: '0',
          productoId: product.id,
        },
      ],
    }))
  }

  const handleBarcodeScan = () => {
    const codigo = barcodeInput.trim()

    if (!codigo) {
      toast.error('Ingresa o escanea un codigo de barras valido.')
      return
    }

    buscarProductoPorBarcodeMutation.mutate(codigo)
  }

  const handlePrintReceipt = () => {
    if (!facturaSeleccionada) {
      toast.error('Selecciona una factura para imprimir la tirilla.')
      return
    }

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=420,height=900')
    if (!popup) {
      toast.error('El navegador bloqueo la ventana de impresion.')
      return
    }

    popup.document.open()
    popup.document.write(buildThermalReceiptHtml({ factura: facturaSeleccionada, clinica }))
    popup.document.close()
    popup.focus()
    popup.print()
  }

  const exportCurrentCut = () => {
    const rows = facturasQuery.data?.facturas || []

    if (!rows.length) {
      toast.error('No hay facturas para exportar con el filtro actual.')
      return
    }

    const csvRows = [
      ['Factura', 'Fecha', 'Cliente', 'Responsable', 'Estado', 'Total'],
      ...rows.map((factura) => [
        factura.numero,
        factura.fecha,
        factura.propietario?.nombre || '',
        factura.usuario?.nombre || '',
        factura.estado,
        factura.total,
      ]),
    ]

    const csvContent = csvRows.map((row) => row.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `finanzas-${rangoMes.fechaInicio}-${rangoMes.fechaFin}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCrearFactura = () => {
    if (!invoiceForm.propietarioId) {
      toast.error('Selecciona un tutor para crear la factura.')
      return
    }

    const itemsValidos = invoiceForm.items
      .map((item) => ({
        descripcion: item.descripcion.trim(),
        cantidad: toAmount(item.cantidad),
        precioUnitario: toAmount(item.precioUnitario),
        descuento: toAmount(item.descuento),
        tipo: item.tipo,
        productoId: item.productoId || undefined,
      }))
      .filter((item) => item.descripcion && item.cantidad > 0)

    if (!itemsValidos.length) {
      toast.error('Agrega al menos un item valido para facturar.')
      return
    }

    const itemInvalido = itemsValidos.find((item) => item.precioUnitario < 0)
    if (itemInvalido) {
      toast.error('El precio unitario no puede ser negativo.')
      return
    }

    crearFacturaMutation.mutate({
      propietarioId: invoiceForm.propietarioId,
      metodoPago: invoiceForm.metodoPago,
      observaciones: invoiceForm.observaciones.trim() || undefined,
      descuentoGeneral: toAmount(invoiceForm.descuentoGeneral),
      emitirElectronica: emisionAutomaticaActiva,
      items: itemsValidos,
    })
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

  if (!rolPermitido) {
    return <RestrictedFinancePage />
  }

  return (
    <AdminShell
      currentKey="finanzas"
      title="Caja y facturacion"
      description="Operacion diaria de ventas, servicios, productos y control de facturas con una lectura mas natural para recepcion, auxiliares, medicos y facturacion."
      headerBadge={
        <StatusPill tone="border-emerald-200 bg-emerald-50 text-emerald-700">
          Corte mensual activo
        </StatusPill>
      }
      actions={
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Volver al dashboard
        </Link>
      }
      asideNote="Usa este modulo para buscar facturas, revisar estados, emitir electronicamente y controlar anulaciones con trazabilidad."
    >
      {!puedeVerFinanzas ? (
        <EmptyModuleState
          title="Finanzas no disponibles en el plan actual"
          body="La lectura de ingresos y facturas necesita caja activa y reportes operativos. Si quieres usar esta area como modulo fijo de gerencia, conviene subir de plan."
          ctaLabel="Revisar planes"
        />
      ) : (
        <div className="space-y-5">
          {ingresosQuery.isError || facturasQuery.isError || facturaDetalleQuery.isError ? (
            <div className="grid gap-4">
              {ingresosQuery.isError ? (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  {getErrorMessage(ingresosQuery.error, 'No fue posible cargar el reporte de ingresos del periodo.')}
                </div>
              ) : null}
              {facturasQuery.isError ? (
                <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                  {getErrorMessage(facturasQuery.error, 'No fue posible cargar la tabla administrativa de facturas.')}
                </div>
              ) : null}
              {facturaDetalleQuery.isError ? (
                <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                  {getErrorMessage(facturaDetalleQuery.error, 'No fue posible cargar el detalle de la factura seleccionada.')}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-4">
            <KpiCard
              icon={Wallet}
              label="Ingresos del mes"
              value={formatCurrency(ingresosQuery.data?.totalIngresos || 0)}
              helper="Suma total del periodo en curso para el cierre administrativo."
              tone="text-emerald-700"
            />
            <KpiCard
              icon={Receipt}
              label="Facturas emitidas"
              value={formatNumber(resumenEstados.emitida?.cantidad || 0)}
              helper="Documentos listos para cobro o seguimiento financiero."
              tone="text-cyan-700"
            />
            <KpiCard
              icon={ShieldCheck}
              label="Facturas pagadas"
              value={formatNumber(resumenEstados.pagada?.cantidad || 0)}
              helper="Documentos ya cerrados dentro del periodo actual."
              tone="text-emerald-700"
            />
            <KpiCard
              icon={CircleAlert}
              label="Pendientes electronicos"
              value={formatNumber(pendientesElectronicos)}
              helper="Facturas con emision pendiente, rechazada o con error tecnico."
              tone="text-amber-700"
            />
          </div>

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.28fr)_380px]">
            <DashboardPanel
              title="Nueva factura"
              subtitle="Caja operativa para consultas, peluqueria, productos, procedimientos y ventas mostrador con tutor, items y cobro en una sola vista."
              action={
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addServiceItem}
                    className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar servicio
                  </button>
                  <button
                    type="button"
                    onClick={handleCrearFactura}
                    disabled={crearFacturaMutation.isPending}
                    className="inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Receipt className="h-4 w-4" />
                    {crearFacturaMutation.isPending ? 'Guardando...' : 'Crear factura'}
                  </button>
                </div>
              }
            >
              <div className="grid gap-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-4">
                    <label className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Buscar tutor
                      </span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={ownerSearch}
                          onChange={(event) => setOwnerSearch(event.target.value)}
                          placeholder="Nombre, documento o telefono"
                          className="h-10 w-full border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                        />
                      </div>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Tutor seleccionado
                      </span>
                      <select
                        value={invoiceForm.propietarioId}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({
                            ...current,
                            propietarioId: event.target.value,
                          }))
                        }
                        className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                      >
                        <option value="">Selecciona un tutor</option>
                        {propietariosDisponibles.map((propietario) => (
                          <option key={propietario.id} value={propietario.id}>
                            {propietario.nombre} · {propietario.numeroDocumento}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Contexto del tutor
                    </p>
                    {selectedOwner ? (
                      <>
                        <p className="mt-3 font-semibold text-slate-950">{selectedOwner.nombre}</p>
                        <p>{selectedOwner.email || 'Sin email principal'}</p>
                        <p>{selectedOwner.telefono || 'Sin telefono principal'}</p>
                      </>
                    ) : (
                      <p className="mt-3">Selecciona un tutor existente para empezar la factura.</p>
                    )}
                    <Link
                      to="/pacientes"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                    >
                      Abrir pacientes
                    </Link>
                  </div>
                </div>

                {puedeConsultarInventario ? (
                  <div className="grid gap-4 border border-slate-200 bg-slate-50 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Entrada por escaner
                      </span>
                      <div className="relative">
                        <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={barcodeInput}
                          onChange={(event) => setBarcodeInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              handleBarcodeScan()
                            }
                          }}
                          placeholder="Escanea el codigo y presiona Enter"
                          className="h-10 w-full border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                        />
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        La pistola lectora suele escribir el codigo y cerrar con Enter. Si el
                        producto existe y tiene stock, se agrega directo al borrador.
                      </p>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleBarcodeScan}
                        disabled={buscarProductoPorBarcodeMutation.isPending}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ScanLine className="h-4 w-4" />
                        {buscarProductoPorBarcodeMutation.isPending ? 'Leyendo...' : 'Agregar por codigo'}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Metodo de pago
                    </span>
                    <select
                      value={invoiceForm.metodoPago}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({ ...current, metodoPago: event.target.value }))
                      }
                      className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Descuento general
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoiceForm.descuentoGeneral}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({ ...current, descuentoGeneral: event.target.value }))
                      }
                      className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </label>
                  <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Emision electronica
                    </p>
                    <p className="mt-2">
                      {emisionAutomaticaActiva
                        ? 'Activa en este plan. Al crear la factura se intenta emitir automaticamente y solo veras reintento si hay pendiente o error.'
                        : 'No activa en este plan. Por ahora se guarda la factura interna de caja.'}
                    </p>
                  </div>
                </div>

                <label className="grid gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Observaciones
                  </span>
                  <textarea
                    value={invoiceForm.observaciones}
                    onChange={(event) =>
                      setInvoiceForm((current) => ({ ...current, observaciones: event.target.value }))
                    }
                    placeholder="Notas internas o detalle del servicio prestado."
                    className="min-h-24 border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                </label>

                <div className="grid gap-3">
                  {invoiceForm.items.map((item, index) => (
                    <div key={item.id} className="grid gap-3 border border-slate-200 bg-slate-50 px-4 py-4 2xl:grid-cols-[120px_minmax(0,1fr)_110px_130px_120px_100px]">
                      <label className="grid gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Tipo
                        </span>
                        <select
                          value={item.tipo}
                          onChange={(event) => updateInvoiceItem(item.id, 'tipo', event.target.value)}
                          className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                        >
                          <option value="servicio">Servicio</option>
                          <option value="producto">Producto</option>
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Descripcion
                        </span>
                        <input
                          type="text"
                          value={item.descripcion}
                          onChange={(event) => updateInvoiceItem(item.id, 'descripcion', event.target.value)}
                          placeholder={`Item ${index + 1}`}
                          className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Cantidad
                        </span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.cantidad}
                          onChange={(event) => updateInvoiceItem(item.id, 'cantidad', event.target.value)}
                          className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Precio unitario
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precioUnitario}
                          onChange={(event) => updateInvoiceItem(item.id, 'precioUnitario', event.target.value)}
                          className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Descuento
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.descuento}
                          onChange={(event) => updateInvoiceItem(item.id, 'descuento', event.target.value)}
                          className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeInvoiceItem(item.id)}
                          disabled={invoiceForm.items.length === 1}
                          className="h-10 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {puedeConsultarInventario ? (
                  <div className="grid gap-3 border border-slate-200 bg-white px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Agregar desde inventario
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Busca un producto y agrégalo como línea facturable.
                        </p>
                      </div>
                      <label className="relative min-w-[260px]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(event) => setProductSearch(event.target.value)}
                          placeholder="Buscar producto por nombre"
                          className="h-10 w-full border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                        />
                      </label>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-2">
                      {productosDisponibles.length ? (
                        productosDisponibles.map((producto) => (
                          <div key={producto.id} className="flex items-center justify-between gap-3 border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">{producto.nombre}</p>
                              <p className="text-xs text-slate-500">
                                Stock {formatNumber(producto.stock)} · {formatCurrency(producto.precioVenta)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addProductToInvoice(producto)}
                              className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-100"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Agregar
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-7 text-slate-600 lg:col-span-2">
                          No hay productos disponibles para esta búsqueda o tu plan actual no tiene inventario cargado.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Resumen del borrador"
              subtitle="Lectura rápida antes de crear la factura o exportar el corte financiero."
              action={
                <button
                  type="button"
                  onClick={exportCurrentCut}
                  className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </button>
              }
            >
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-4 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span className="font-medium text-slate-600">Tutor</span>
                    <span className="min-w-0 text-right font-semibold text-slate-950">
                      {selectedOwner?.nombre || 'Pendiente de seleccionar'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span className="font-medium text-slate-600">Metodo</span>
                    <span className="min-w-0 text-right font-semibold text-slate-950">
                      {PAYMENT_METHOD_LABELS[invoiceForm.metodoPago] || invoiceForm.metodoPago}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span className="font-medium text-slate-600">Lineas</span>
                    <span className="font-semibold text-slate-950">
                      {formatNumber(invoiceForm.items.length)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-4 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <span className="font-medium text-slate-600">Subtotal</span>
                    <span className="font-semibold text-slate-950">
                      {formatCurrency(invoiceTotals.subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <span className="font-medium text-slate-600">Descuento general</span>
                    <span className="font-semibold text-slate-950">
                      {formatCurrency(invoiceTotals.descuentoGeneral)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border border-slate-900 bg-slate-950 px-4 py-3 text-sm text-slate-100">
                    <span className="font-medium text-slate-300">Total estimado</span>
                    <span className="font-semibold">{formatCurrency(invoiceTotals.total)}</span>
                  </div>
                </div>

                <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                  El exportable descarga el corte actual filtrado. La creación guiada guarda la
                  factura interna y luego puedes abrirla en detalle para emisión electrónica o
                  control de anulación.
                </div>
              </div>
            </DashboardPanel>
          </div>

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_380px]">
            <LinePanel
              title="Evolucion diaria del ingreso"
              subtitle={`Lectura del ${formatShortDate(rangoMes.fechaInicio)} al ${formatShortDate(rangoMes.fechaFin)}.`}
              data={ingresosPorDia}
              dataKey="total"
              color="#0f4c81"
              formatter={formatCurrency}
              emptyMessage="Aun no hay ingresos registrados para el periodo actual."
            />
            <DonutCard
              title="Metodos de pago"
              subtitle="Distribucion del ingreso segun la forma de pago registrada."
              data={metodosPago}
              centerLabel="Ingreso total"
              centerValue={formatCurrency(ingresosQuery.data?.totalIngresos || 0)}
              formatter={formatCurrency}
              emptyMessage="No hay metodos de pago disponibles para mostrar."
            />
          </div>

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_380px]">
            <DataTable
              title="Facturas del periodo"
              subtitle="Busca por numero, cliente o responsable y abre el detalle para operar."
              rows={facturasRows}
              columns={[
                { key: 'numero', label: 'Factura' },
                { key: 'fecha', label: 'Fecha' },
                { key: 'cliente', label: 'Cliente' },
                { key: 'usuario', label: 'Responsable' },
                {
                  key: 'estado',
                  label: 'Estado',
                  render: (row) => (
                    <StatusPill tone={getEstadoTone(row.estado)}>
                      {ESTADO_LABELS[row.estado] || row.estado}
                    </StatusPill>
                  ),
                },
                { key: 'total', label: 'Total' },
                {
                  key: 'acciones',
                  label: 'Acciones',
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFacturaId(row.id)
                        setMotivoAnulacion('')
                        setEmisionForm({
                          formaPagoCodigo: '1',
                          enviarEmail: false,
                          fechaVencimientoPago: '',
                        })
                      }}
                      className={`border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                        currentFacturaId === row.id
                          ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {currentFacturaId === row.id ? 'Abierta' : 'Ver detalle'}
                    </button>
                  ),
                },
              ]}
              emptyTitle="Aun no hay facturas para este filtro"
              emptyBody="Cuando haya movimiento en el estado elegido, la tabla se llenara automaticamente."
              action={
                <form onSubmit={handleBuscar} className="flex flex-wrap gap-3">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={buscarInput}
                      onChange={(event) => setBuscarInput(event.target.value)}
                      placeholder="Buscar factura o cliente"
                      className="h-10 border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </label>
                  <select
                    value={estado}
                    onChange={(event) => {
                      setEstado(event.target.value)
                      setPagina(1)
                      setSelectedFacturaId(null)
                      setMotivoAnulacion('')
                      setEmisionForm({
                        formaPagoCodigo: '1',
                        enviarEmail: false,
                        fechaVencimientoPago: '',
                      })
                    }}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Buscar
                  </button>
                </form>
              }
            />

            <DashboardPanel
              title="Detalle de factura"
              subtitle="Desde aqui revisas la venta, imprimes la tirilla y solo intervienes la emision electronica si hubo pendiente o error."
            >
              {!currentFacturaId ? (
                <div className="border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-7 text-slate-600">
                  Elige una factura de la tabla para abrir su detalle operativo.
                </div>
              ) : facturaDetalleQuery.isLoading && !facturaSeleccionada ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-16 animate-pulse border border-slate-200 bg-slate-50" />
                  ))}
                </div>
              ) : facturaSeleccionada ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{facturaSeleccionada.numero}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {facturaSeleccionada.propietario?.nombre || 'Sin propietario'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handlePrintReceipt}
                        className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir tirilla
                      </button>
                      <StatusPill tone={getEstadoTone(facturaSeleccionada.estado)}>
                        {ESTADO_LABELS[facturaSeleccionada.estado] || facturaSeleccionada.estado}
                      </StatusPill>
                      <StatusPill tone={getEstadoElectronicoTone(facturaSeleccionada.estadoElectronico)}>
                        {ESTADO_ELECTRONICO_LABELS[facturaSeleccionada.estadoElectronico] ||
                          facturaSeleccionada.estadoElectronico}
                      </StatusPill>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      Fecha: <span className="font-semibold text-slate-950">{formatLongDate(facturaSeleccionada.fecha)}</span>
                    </div>
                    <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      Metodo de pago:{' '}
                      <span className="font-semibold text-slate-950">
                        {PAYMENT_METHOD_LABELS[facturaSeleccionada.metodoPago] || 'Sin definir'}
                      </span>
                    </div>
                    <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      Responsable:{' '}
                      <span className="font-semibold text-slate-950">
                        {facturaSeleccionada.usuario?.nombre || 'Sin usuario asignado'}
                      </span>
                    </div>
                    <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      Total: <span className="font-semibold text-slate-950">{formatCurrency(facturaSeleccionada.total)}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Item</th>
                          <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Cantidad</th>
                          <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(facturaSeleccionada.items || []).map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-3 text-slate-700">{item.descripcion}</td>
                            <td className="px-3 py-3 text-slate-700">{formatNumber(item.cantidad)}</td>
                            <td className="px-3 py-3 text-slate-700">{formatCurrency(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {facturaSeleccionada.observaciones ? (
                    <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                      {facturaSeleccionada.observaciones}
                    </div>
                  ) : null}

                  <div className="space-y-3 border-t border-slate-200 pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Estado electronico
                    </p>
                    <div className="grid gap-3">
                      <div className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        CUFE: <span className="font-semibold text-slate-950">{facturaSeleccionada.cufe || 'Pendiente'}</span>
                      </div>
                      <div className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        Validada en:{' '}
                        <span className="font-semibold text-slate-950">
                          {facturaSeleccionada.fechaValidacionElectronica
                            ? formatDateTime(facturaSeleccionada.fechaValidacionElectronica)
                            : 'Sin validacion'}
                        </span>
                      </div>
                      {facturaSeleccionada.mensajeElectronico ? (
                        <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                          {facturaSeleccionada.mensajeElectronico}
                        </div>
                      ) : null}
                      {facturaSeleccionada.motivoAnulacion ? (
                        <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                          Motivo de anulacion: {facturaSeleccionada.motivoAnulacion}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {canEmitInvoice(facturaSeleccionada, puedeEmitirElectronica) ? (
                    <div className="space-y-4 border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-2">
                        <SendHorizontal className="h-4 w-4 text-cyan-700" />
                        <p className="text-sm font-semibold text-slate-950">Reintentar emision electronica</p>
                      </div>
                      <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                        La emision electronica normalmente sale automatica al crear la factura cuando
                        la clinica tiene esta funcionalidad activa. Este bloque solo sirve para
                        pendientes, rechazos o reintentos controlados.
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Forma de pago</span>
                          <select
                            value={emisionForm.formaPagoCodigo}
                            onChange={(event) =>
                              setEmisionForm((current) => ({
                                ...current,
                                formaPagoCodigo: event.target.value,
                                fechaVencimientoPago:
                                  event.target.value === '1' ? '' : current.fechaVencimientoPago,
                              }))
                            }
                            className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                          >
                            {PAYMENT_FORM_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Vencimiento</span>
                          <input
                            type="date"
                            value={emisionForm.fechaVencimientoPago}
                            onChange={(event) =>
                              setEmisionForm((current) => ({
                                ...current,
                                fechaVencimientoPago: event.target.value,
                              }))
                            }
                            disabled={emisionForm.formaPagoCodigo !== '2'}
                            className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                          />
                        </label>
                      </div>
                      <label className="flex items-center gap-3 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={emisionForm.enviarEmail}
                          onChange={(event) =>
                            setEmisionForm((current) => ({ ...current, enviarEmail: event.target.checked }))
                          }
                          className="h-4 w-4 border-slate-300 text-cyan-700 focus:ring-cyan-500"
                        />
                        Enviar email al tutor al emitir electronicamente
                      </label>
                      <button
                        type="button"
                        onClick={handleEmitirFactura}
                        disabled={emitirFacturaMutation.isPending}
                        className="inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <SendHorizontal className="h-4 w-4" />
                        {emitirFacturaMutation.isPending ? 'Emitiendo...' : 'Reintentar emision'}
                      </button>
                    </div>
                  ) : null}

                  {canVoidInvoice(facturaSeleccionada, puedeAnular) ? (
                    <div className="space-y-4 border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-red-700" />
                        <p className="text-sm font-semibold text-slate-950">Anular factura</p>
                      </div>
                      <textarea
                        value={motivoAnulacion}
                        onChange={(event) => setMotivoAnulacion(event.target.value)}
                        placeholder="Describe el motivo de anulacion para auditoria y control interno."
                        className="min-h-24 border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={handleAnularFactura}
                        disabled={anularFacturaMutation.isPending}
                        className="inline-flex items-center gap-2 border border-red-200 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Ban className="h-4 w-4" />
                        {anularFacturaMutation.isPending ? 'Anulando...' : 'Anular factura'}
                      </button>
                    </div>
                  ) : facturaSeleccionada?.estadoElectronico === 'validada' && facturaSeleccionada?.cufe ? (
                    <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                      Esta factura ya fue validada electronicamente. No se puede anular desde caja:
                      requiere un flujo tributario controlado como nota credito.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-7 text-slate-600">
                  No fue posible abrir el detalle de esta factura.
                </div>
              )}
            </DashboardPanel>
          </div>

          {(facturasQuery.data?.paginas || 1) > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-slate-600">
                Pagina {facturasQuery.data?.paginaActual || 1} de {facturasQuery.data?.paginas || 1}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFacturaId(null)
                    setMotivoAnulacion('')
                    setEmisionForm({
                      formaPagoCodigo: '1',
                      enviarEmail: false,
                      fechaVencimientoPago: '',
                    })
                    setPagina((current) => Math.max(current - 1, 1))
                  }}
                  disabled={(facturasQuery.data?.paginaActual || 1) <= 1}
                  className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFacturaId(null)
                    setMotivoAnulacion('')
                    setEmisionForm({
                      formaPagoCodigo: '1',
                      enviarEmail: false,
                      fechaVencimientoPago: '',
                    })
                    setPagina((current) => Math.min(current + 1, facturasQuery.data?.paginas || 1))
                  }}
                  disabled={(facturasQuery.data?.paginaActual || 1) >= (facturasQuery.data?.paginas || 1)}
                  className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}

          {!puedeEmitirElectronica ? (
            <div className="border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-slate-500" />
                <div className="text-sm leading-7 text-slate-600">
                  La configuracion tecnica de DIAN y Factus ya no se modifica desde la clinica. Si
                  necesitas activar o corregir la integracion, se hace desde soporte central con un
                  perfil `superadmin`.
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AdminShell>
  )
}
