import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inventarioApi } from '@/features/inventario/inventarioApi'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { finanzasApi } from './finanzasApi'

const createBlankInvoiceItem = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  tipo: 'servicio',
  descripcion: '',
  cantidad: '1',
  precioUnitario: '',
  productoId: '',
  stock: null,
  precioMinimo: 0,
})

const toAmount = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback

const buildInitialForm = () => ({
  propietarioId: '',
  metodoPago: 'efectivo',
  observaciones: '',
  items: [],
})

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta_debito', label: 'Tarjeta debito' },
  { value: 'tarjeta_credito', label: 'Tarjeta credito' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'otro', label: 'Otro' },
]

export function useFinanzasFacturacion({
  enabled,
  puedeConsultarInventario,
  emisionAutomaticaActiva,
  onFacturaCreada,
}) {
  const queryClient = useQueryClient()
  const [ownerSearch, setOwnerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [invoiceForm, setInvoiceForm] = useState(buildInitialForm)
  const [selectedOwnerData, setSelectedOwnerData] = useState(null)
  const [tutorDrawerOpen, setTutorDrawerOpen] = useState(false)
  const [productDrawerOpen, setProductDrawerOpen] = useState(false)

  const deferredOwnerSearch = useDeferredValue(ownerSearch)
  const deferredProductSearch = useDeferredValue(productSearch)

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

  const emitirParaAutoEmision = useMutation({
    mutationFn: ({ facturaId, payload }) => finanzasApi.emitirFacturaElectronica(facturaId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-ingresos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-ingresos'] })
    },
  })

  const crearFacturaMutation = useMutation({
    mutationFn: (payload) => finanzasApi.crearFactura(payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Factura creada exitosamente')
      setInvoiceForm(buildInitialForm)
      setSelectedOwnerData(null)
      setOwnerSearch('')
      setProductSearch('')
      setBarcodeInput('')
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-facturas-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['finanzas-ingresos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-ingresos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })

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
    },
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

  const propietariosDisponibles = propietariosQuery.data?.propietarios || []
  const productosDisponibles = productosQuery.data?.productos || []

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

  const handleCrearFactura = () => {
    const itemsValidos = invoiceForm.items
      .map((item) => ({
        descripcion: item.descripcion.trim(),
        cantidad: toAmount(item.cantidad),
        precioUnitario: toAmount(item.precioUnitario),
        tipo: item.tipo,
        productoId: item.productoId || undefined,
      }))
      .filter((item) => item.descripcion && item.cantidad > 0)

    if (!itemsValidos.length) {
      toast.error('Agrega al menos un item valido para facturar.')
      return
    }

    if (itemsValidos.some((item) => item.precioUnitario < 0)) {
      toast.error('El precio unitario no puede ser negativo.')
      return
    }

    // Piso de precio: un producto no se puede vender por debajo de su costo.
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
        `"${itemSinStock.descripcion}" solo tiene ${itemSinStock.stock} unidades en stock. Ajusta la cantidad.`
      )
      return
    }

    // La emision electronica requiere cliente con datos fiscales;
    // las ventas de mostrador (sin tutor) siempre quedan como factura interna.
    crearFacturaMutation.mutate({
      propietarioId: invoiceForm.propietarioId || undefined,
      metodoPago: invoiceForm.metodoPago,
      observaciones: invoiceForm.observaciones.trim() || undefined,
      emitirElectronica: emisionAutomaticaActiva && Boolean(invoiceForm.propietarioId),
      items: itemsValidos,
    })
  }

  return {
    ownerSearch,
    setOwnerSearch,
    productSearch,
    setProductSearch,
    barcodeInput,
    setBarcodeInput,
    invoiceForm,
    setInvoiceForm,
    propietariosDisponibles,
    productosDisponibles,
    selectedOwnerData,
    selectOwner,
    tutorDrawerOpen,
    setTutorDrawerOpen,
    productDrawerOpen,
    setProductDrawerOpen,
    invoiceTotals,
    propietariosQuery,
    productosQuery,
    crearFacturaMutation,
    buscarProductoPorBarcodeMutation,
    handleCrearFactura,
    handleBarcodeScan,
    addServiceItem,
    addProductToInvoice,
    removeInvoiceItem,
    updateInvoiceItem,
  }
}
