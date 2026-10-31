import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inventarioApi } from '@/features/inventario/inventarioApi'
import { estadoVencimiento, textoVencimiento } from '@/features/inventario/inventarioUtils'
import { invalidarDominios } from '@/lib/queryKeys'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { serviciosApi } from '@/features/servicios/serviciosApi'
import { finanzasApi } from './finanzasApi'
import { mensajeDeError } from '@/lib/errores'
import { crearGestorClaveVenta } from './claveIdempotenciaVenta'
import { cuentaDelCobro, faltaCuenta, MENSAJE_FALTA_CUENTA } from './cuentaCobro'
import { useCuentasRecaudo } from './useCuentasRecaudo'

const createBlankInvoiceItem = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  tipo: 'servicio',
  descripcion: '',
  cantidad: '1',
  precioUnitario: '',
  productoId: '',
  servicioClinicoId: '',
  stock: null,
  precioMinimo: 0,
})

const toAmount = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getErrorMessage = mensajeDeError

const buildInitialForm = () => ({
  propietarioId: '',
  metodoPago: 'efectivo',
  // Banco o referencia de la transferencia, o cuál es el «otro» método.
  detallePago: '',
  // Solo transferencia: cuenta de la clínica a la que entró (Configuración).
  cuentaRecaudoId: '',
  observaciones: '',
  // Solo crédito: en cuántos días queda en pagar ('' = sin plazo).
  plazoCreditoDias: '',
  items: [],
  // Cuando la factura cobra una consulta: marca la historia como facturada.
  historiaClinicaId: '',
  // Cuando la factura cobra un servicio de estilos: marca el registro como
  // facturado y lo bloquea (ver facturaController.js).
  registroEstiloId: '',
})

// `tipo` distingue como se confirma el pago, no como se llama:
//   'manual'   → el cajero registra algo que YA paso (la plata esta en el cajon
//                o ya llego a la cuenta). La venta se cierra al oprimir el boton.
//   'pasarela' → el cobro lo confirma un tercero (Wompi) por webhook. La venta
//                NO puede cerrarse hasta que llegue esa confirmacion.
// Hoy todos son 'manual'. Cuando entre la pasarela, su metodo se agrega aqui
// con tipo 'pasarela' y el POS ramifica sobre este campo, en vez de comparar
// contra un value hardcodeado. Ojo: la lista de metodos validos tambien vive
// duplicada en los validadores de backend/src/routes/facturaRoutes.js (3 sitios).
// Transferencia cubre cualquier banco o app (Nequi, Daviplata, Bre-B…): el
// banco va en `detalle`. Las ventas viejas con 'nequi' o 'daviplata' siguen
// teniendo etiqueta en PAYMENT_METHOD_LABELS. 'credito' es venta fiada: el
// backend la deja con saldo por cobrar y exige cliente.
export const PAYMENT_METHOD_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo', tipo: 'manual' },
  {
    value: 'transferencia',
    label: 'Transferencia',
    tipo: 'manual',
    detalle: { label: 'Banco o referencia', placeholder: 'Bancolombia, Nequi, ref. 8841…', requerido: false },
  },
  { value: 'tarjeta_debito', label: 'Tarjeta débito', tipo: 'manual' },
  { value: 'tarjeta_credito', label: 'Tarjeta crédito', tipo: 'manual' },
  { value: 'credito', label: 'A crédito', tipo: 'manual', requiereCliente: true },
  {
    value: 'otro',
    label: 'Otro',
    tipo: 'manual',
    detalle: { label: '¿Cuál?', placeholder: 'Bono, canje, convenio…', requerido: true, falta: 'Escribe cuál método se usó' },
  },
]

// Qué le falta al carrito o al método elegido para poder cobrar (null si nada).
export const faltaParaCobrar = (form, cuentas = []) => {
  // El backend rechaza la venta de un vencido: se avisa antes de llegar al cobro.
  const vencido = (form?.items || []).find(
    (item) => item.tipo === 'producto' && estadoVencimiento(item) === 'vencido'
  )
  if (vencido) return `«${vencido.descripcion}» figura vencido: revisa el vencimiento o quítalo del carrito`
  const opcion = PAYMENT_METHOD_OPTIONS.find((o) => o.value === form?.metodoPago)
  if (opcion?.requiereCliente && !form?.propietarioId) return 'Para vender a crédito asigna un cliente'
  if (opcion?.detalle?.requerido && !String(form?.detallePago || '').trim()) return opcion.detalle.falta
  if (faltaCuenta({ metodoPago: form?.metodoPago, cuentaRecaudoId: form?.cuentaRecaudoId, cuentas })) return MENSAJE_FALTA_CUENTA
  return null
}

export function useFinanzasFacturacion({
  enabled,
  puedeConsultarInventario,
  emisionAutomaticaActiva,
  onFacturaCreada,
}) {
  const queryClient = useQueryClient()
  const [ownerSearch, setOwnerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [servicioSearch, setServicioSearch] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [invoiceForm, setInvoiceForm] = useState(buildInitialForm)
  const [selectedOwnerData, setSelectedOwnerData] = useState(null)
  const [tutorDrawerOpen, setTutorDrawerOpen] = useState(false)
  const [productDrawerOpen, setProductDrawerOpen] = useState(false)
  // Producto vencido que se intentó vender: { producto, itemId? }. Con itemId
  // ya está en el carrito (vino de una consulta); sin él, del catálogo o el escáner.
  const [vencimientoPendiente, setVencimientoPendiente] = useState(null)
  // Clave de idempotencia del carrito actual: se repite en los reintentos para
  // que un corte de red no duplique la venta (ver claveIdempotenciaVenta.js).
  const [claveVenta] = useState(() => crearGestorClaveVenta())
  const { data: cuentasRecaudo = [] } = useCuentasRecaudo({ soloActivas: true, enabled })

  const deferredOwnerSearch = useDeferredValue(ownerSearch)
  const deferredProductSearch = useDeferredValue(productSearch)
  const deferredServicioSearch = useDeferredValue(servicioSearch)

  const propietariosQuery = useQuery({
    queryKey: ['finanzas-propietarios', deferredOwnerSearch],
    queryFn: () =>
      pacientesApi.obtenerPropietarios({ buscar: deferredOwnerSearch || undefined, limite: 8 }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const productosQuery = useQuery({
    queryKey: ['finanzas-productos', deferredProductSearch],
    queryFn: () =>
      inventarioApi.obtenerProductos({ buscar: deferredProductSearch || undefined, limite: 8 }),
    enabled: enabled && puedeConsultarInventario,
    placeholderData: (prev) => prev,
  })

  const serviciosQuery = useQuery({
    queryKey: ['finanzas-servicios', deferredServicioSearch],
    queryFn: () =>
      serviciosApi.obtenerServicios({ buscar: deferredServicioSearch || undefined, limite: 12 }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const emitirParaAutoEmision = useMutation({
    mutationFn: ({ facturaId, payload }) => finanzasApi.emitirFacturaElectronica(facturaId, payload),
    onSuccess: () => {
      invalidarDominios(queryClient, 'facturacion')
    },
  })

  const crearFacturaMutation = useMutation({
    mutationFn: (payload) => finanzasApi.crearFactura(payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Factura creada exitosamente')
      claveVenta.reiniciar()
      setInvoiceForm(buildInitialForm)
      setSelectedOwnerData(null)
      setOwnerSearch('')
      setProductSearch('')
      setBarcodeInput('')
      // La venta descuenta stock y suma al turno de caja abierto. Si cobró una
      // consulta o un servicio de estilos, los marca como facturados.
      invalidarDominios(queryClient, 'facturacion', 'productos', 'caja', 'historias')

      if (emisionAutomaticaActiva && data?.factura?.id && data?.factura?.estadoElectronico === 'pendiente') {
        emitirParaAutoEmision.mutate({
          facturaId: data.factura.id,
          payload: { formaPagoCodigo: '1', enviarEmail: false },
        })
      }

      if (data?.factura?.id) {
        onFacturaCreada?.(data.factura.id)
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear la factura.'))
      if (error?.response?.data?.code === 'TURNO_CAJA_REQUERIDO') {
        // El turno pudo cerrarse en otra pestana/dispositivo mientras se armaba la venta.
        queryClient.invalidateQueries({ queryKey: ['caja-turno-activo'] })
      }
    },
  })

  const buscarProductoPorBarcodeMutation = useMutation({
    mutationFn: (codigo) => inventarioApi.obtenerProductoPorBarcode(codigo),
    onSuccess: (data) => {
      const producto = data?.producto
      if (!producto) return
      setBarcodeInput('')
      const estado = estadoVencimiento(producto)
      if (estado === 'vencido') {
        setVencimientoPendiente({ producto })
        return
      }
      addProductToInvoice(producto)
      if (estado === 'proximo') {
        toast.warning(`${producto.nombre}: ${textoVencimiento(producto.fechaVencimiento).toLowerCase()}`)
      } else {
        toast.success(`Producto agregado: ${producto.nombre}`)
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible leer el código de barras.'))
    },
  })

  const propietariosDisponibles = propietariosQuery.data?.propietarios || []
  const productosDisponibles = productosQuery.data?.productos || []
  const serviciosDisponibles = serviciosQuery.data?.servicios || []

  const selectOwner = (propietario) => {
    setInvoiceForm((curr) => ({ ...curr, propietarioId: propietario.id }))
    setSelectedOwnerData(propietario)
  }

  const invoiceTotals = useMemo(() => {
    const subtotal = invoiceForm.items.reduce((acc, item) => {
      const cantidad = Math.max(toAmount(item.cantidad), 0)
      const precio = Math.max(toAmount(item.precioUnitario), 0)
      return acc + cantidad * precio
    }, 0)
    return { subtotal, total: subtotal }
  }, [invoiceForm.items])

  const updateInvoiceItem = (itemId, field, value) => {
    setInvoiceForm((curr) => ({
      ...curr,
      items: curr.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }))
  }

  const addServiceItem = () => {
    setInvoiceForm((curr) => ({ ...curr, items: [...curr.items, createBlankInvoiceItem()] }))
  }

  const removeInvoiceItem = (itemId) => {
    setInvoiceForm((curr) => ({
      ...curr,
      items: curr.items.filter((item) => item.id !== itemId),
    }))
  }

  const addServiceFromCatalog = (servicio) => {
    setInvoiceForm((curr) => ({
      ...curr,
      items: [
        ...curr.items,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          tipo: 'servicio',
          descripcion: servicio.nombre,
          cantidad: '1',
          precioUnitario: String(servicio.precioVenta || 0),
          productoId: '',
          servicioClinicoId: servicio.id,
          stock: null,
          precioMinimo: 0,
        },
      ],
    }))
  }

  const addProductToInvoice = (product) => {
    setInvoiceForm((curr) => ({
      ...curr,
      items: [
        ...curr.items,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          tipo: 'producto',
          descripcion: product.nombre,
          cantidad: '1',
          precioUnitario: String(product.precioVenta || 0),
          productoId: product.id,
          stock: product.stock ?? null,
          // Piso de precio: no se puede vender por debajo del costo.
          precioMinimo: Math.max(toAmount(product.precioCompra), 0),
          fechaVencimiento: product.fechaVencimiento || null,
        },
      ],
    }))
  }

  /**
   * Carga en el carrito lo cobrable de una consulta cerrada: el plan
   * farmacologico que el tutor se lleva, que descuenta del inventario de
   * ventas al emitir la factura.
   *
   * El tratamiento intrahospitalario no llega aqui: no se cobra al tutor, se
   * registra como gasto de insumos al cerrar la historia.
   */
  const loadPreliquidacionHistoria = (preliquidacion) => {
    const items = (preliquidacion?.items || []).map((item) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      tipo: item.tipo,
      descripcion: item.descripcion,
      cantidad: String(item.cantidad),
      precioUnitario: String(item.precioUnitario || 0),
      productoId: item.productoId || '',
      servicioClinicoId: '',
      stock: item.stock ?? null,
      precioMinimo: toAmount(item.precioMinimo),
      fechaVencimiento: item.fechaVencimiento || null,
    }))

    // Reemplaza el carrito: anexar duplicaba los ítems al repetir «Facturar
    // consulta» y mezclaba la consulta con una venta a medias.
    claveVenta.reiniciar()
    setInvoiceForm(() => ({
      ...buildInitialForm(),
      propietarioId: preliquidacion?.propietario?.id || '',
      historiaClinicaId: preliquidacion?.historiaClinicaId || '',
      items,
    }))

    if (preliquidacion?.medicamentosOmitidos?.length) {
      toast.warning(
        `No se cargaron del plan: ${preliquidacion.medicamentosOmitidos.join(', ')}. Agrégalos a mano si se los llevó.`
      )
    }

    if (preliquidacion?.productosSinStock?.length) {
      toast.warning(
        `Sin stock suficiente: ${preliquidacion.productosSinStock.join(', ')}. Ajusta la cantidad antes de facturar.`
      )
    }
  }

  /**
   * Carga en el carrito el tutor y el vinculo de un servicio de estilos aun
   * no facturado. A diferencia de la historia clinica, el registro de
   * estilos no trae items propios (no define precios): el cajero agrega el
   * servicio de peluqueria desde el catalogo. El aviso ayuda a no olvidarlo.
   */
  const loadPreliquidacionEstilo = (preliquidacion) => {
    claveVenta.reiniciar()
    setInvoiceForm(() => ({
      ...buildInitialForm(),
      propietarioId: preliquidacion?.propietario?.id || '',
      registroEstiloId: preliquidacion?.registroEstiloId || '',
    }))

    if (preliquidacion?.tipoCorte) {
      toast.info(`Agrega el servicio de estilos al carrito: ${preliquidacion.tipoCorte}.`)
    }
  }

  // Al cerrar el POS sin vender, un carrito que venía de una consulta o de un
  // servicio de estilos se descarta: si no, la siguiente venta (aunque fuera
  // de otra cosa) quedaba ligada a esa consulta y la marcaba como cobrada.
  const descartarCobroVinculado = () => {
    if (!invoiceForm.historiaClinicaId && !invoiceForm.registroEstiloId) return
    claveVenta.reiniciar()
    setInvoiceForm(buildInitialForm)
    setSelectedOwnerData(null)
    setOwnerSearch('')
  }

  /**
   * Tras actualizar el vencimiento desde Caja: lo que quedó vigente sigue en la
   * venta. Si el producto ya estaba en el carrito se actualiza; si venía del
   * catálogo, entra ahora con la nueva fecha. Sin existencias, no hay qué vender.
   */
  const aplicarRelevoVencimiento = ({ producto, itemId }, data) => {
    const stockNuevo = toAmount(data?.stockNuevo)
    const fechaVencimiento = data?.fechaVencimiento || null

    if (stockNuevo <= 0) {
      if (itemId) removeInvoiceItem(itemId)
      toast.info(`Se retiró todo el stock de ${producto.nombre}: no queda nada para vender.`)
      return
    }

    if (itemId) {
      setInvoiceForm((curr) => ({
        ...curr,
        items: curr.items.map((item) =>
          item.id === itemId ? { ...item, stock: stockNuevo, fechaVencimiento } : item
        ),
      }))
      return
    }

    addProductToInvoice({ ...producto, stock: stockNuevo, fechaVencimiento })
  }

  const handleBarcodeScan = () => {
    const codigo = barcodeInput.trim()
    if (!codigo) {
      toast.error('Ingresa o escanea un código de barras válido.')
      return
    }
    buscarProductoPorBarcodeMutation.mutate(codigo)
  }

  const handleCrearFactura = () => {
    const itemsValidos = invoiceForm.items
      .map((item) => ({
        descripcion: item.descripcion.trim(),
        cantidad: toAmount(item.cantidad),
        precioUnitario: toAmount(item.precioUnitario),
        tipo: item.tipo,
        productoId: item.productoId || undefined,
        servicioClinicoId: item.servicioClinicoId || undefined,
      }))
      .filter((item) => item.descripcion && item.cantidad > 0)

    if (!itemsValidos.length) {
      toast.error('Agrega al menos un concepto válido para facturar.')
      return
    }

    if (itemsValidos.some((item) => item.precioUnitario < 0)) {
      toast.error('El precio unitario no puede ser negativo.')
      return
    }

    // Piso de precio: un producto no se vende por debajo de su costo.
    const itemBajoCosto = invoiceForm.items.find(
      (item) =>
        item.tipo === 'producto' &&
        toAmount(item.precioMinimo) > 0 &&
        toAmount(item.precioUnitario) < toAmount(item.precioMinimo)
    )
    if (itemBajoCosto) {
      toast.error(
        `"${itemBajoCosto.descripcion}" no se puede vender por debajo de su costo ($${toAmount(itemBajoCosto.precioMinimo).toLocaleString('es-CO')}).`
      )
      return
    }

    const itemSinStock = invoiceForm.items.find(
      (item) =>
        item.tipo === 'producto' &&
        item.stock !== null &&
        toAmount(item.cantidad) > item.stock
    )
    if (itemSinStock) {
      toast.error(
        `"${itemSinStock.descripcion}" solo tiene ${itemSinStock.stock} unidades disponibles. Ajusta la cantidad.`
      )
      return
    }

    const falta = faltaParaCobrar(invoiceForm, cuentasRecaudo)
    if (falta) {
      toast.error(falta)
      return
    }

    // El detalle del pago (banco, referencia, cuál «otro») viaja en la nota de
    // la venta: así queda en el historial sin cambiar la base de datos.
    const opcionPago = PAYMENT_METHOD_OPTIONS.find((o) => o.value === invoiceForm.metodoPago)
    const detallePago = opcionPago?.detalle ? String(invoiceForm.detallePago || '').trim() : ''
    const observaciones = [
      detallePago ? `${opcionPago.label}: ${detallePago}` : '',
      invoiceForm.observaciones.trim(),
    ].filter(Boolean).join(' · ')

    // La emision electronica requiere cliente con datos fiscales;
    // las ventas de mostrador (sin tutor) siempre quedan como factura interna.
    crearFacturaMutation.mutate({
      propietarioId: invoiceForm.propietarioId || undefined,
      metodoPago: invoiceForm.metodoPago,
      cuentaRecaudoId:
        cuentaDelCobro({
          metodoPago: invoiceForm.metodoPago,
          cuentaRecaudoId: invoiceForm.cuentaRecaudoId,
          cuentas: cuentasRecaudo,
        }) || undefined,
      observaciones: observaciones || undefined,
      emitirElectronica: emisionAutomaticaActiva && Boolean(invoiceForm.propietarioId),
      historiaClinicaId: invoiceForm.historiaClinicaId || undefined,
      registroEstiloId: invoiceForm.registroEstiloId || undefined,
      items: itemsValidos,
      claveIdempotencia: claveVenta.obtener(),
      plazoCreditoDias:
        invoiceForm.metodoPago === 'credito' && invoiceForm.plazoCreditoDias
          ? Number(invoiceForm.plazoCreditoDias)
          : undefined,
    })
  }

  return {
    ownerSearch,
    setOwnerSearch,
    productSearch,
    setProductSearch,
    servicioSearch,
    setServicioSearch,
    barcodeInput,
    setBarcodeInput,
    invoiceForm,
    setInvoiceForm,
    propietariosDisponibles,
    productosDisponibles,
    serviciosDisponibles,
    selectedOwnerData,
    selectOwner,
    tutorDrawerOpen,
    setTutorDrawerOpen,
    productDrawerOpen,
    setProductDrawerOpen,
    invoiceTotals,
    propietariosQuery,
    productosQuery,
    serviciosQuery,
    crearFacturaMutation,
    buscarProductoPorBarcodeMutation,
    handleCrearFactura,
    handleBarcodeScan,
    addServiceItem,
    addServiceFromCatalog,
    addProductToInvoice,
    vencimientoPendiente,
    setVencimientoPendiente,
    aplicarRelevoVencimiento,
    loadPreliquidacionHistoria,
    loadPreliquidacionEstilo,
    descartarCobroVinculado,
    removeInvoiceItem,
    updateInvoiceItem,
  }
}
