import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  obtenerFacturasCompra,
  crearFacturaCompra,
  editarFacturaCompra,
  confirmarFacturaCompra,
  anularFacturaCompra,
  marcarComoPagada,
  obtenerAlertasCompra,
} from './facturaCompraApi'
import { inventarioApi } from './inventarioApi'
import { inventarioClinicoApi } from '@/features/inventarioClinico/inventarioClinicoApi'
import { invalidateInventarioClinicoQueries } from '@/features/inventarioClinico/inventarioClinicoUtils'
import { getErrorMessage, invalidateInventarioQueries } from './inventarioUtils'

export const ESTADO_FACTURA_COMPRA = [
  { value: '', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'anulada', label: 'Anulada' },
]

export const ESTADO_COLORS = {
  borrador: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  confirmada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  anulada: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export const DESTINO_INVENTARIO_OPTIONS = [
  { value: 'ventas', label: 'Inventario de ventas' },
  { value: 'clinico', label: 'Inventario clínico' },
]

const PRODUCTO_NUEVO_VACIO = () => ({
  nombre: '',
  categoria: '',
  // Destino ventas: presentación entera que se vende tal cual.
  unidadMedida: '',
  // Destino clínico: unidad fraccionable de consumo y cuánto trae la presentación.
  unidadBase: '',
  cantidadPresentacion: '',
})

const ITEM_VACIO = () => ({
  destinoInventario: 'ventas',
  esNuevo: false,
  productoId: '',
  insumoClinicoId: '',
  productoNuevo: PRODUCTO_NUEVO_VACIO(),
  cantidad: 1,
  precioUnitario: 0,
})

const ITEMS_VACIO = () => [ITEM_VACIO()]

const FORM_INICIAL = {
  proveedor: '',
  fecha: new Date().toISOString().slice(0, 10),
  numero: '',
  observaciones: '',
  tipoPago: 'contado',
  fechaPagoFinal: '',
  items: ITEMS_VACIO(),
}

export function useFacturaCompra() {
  const queryClient = useQueryClient()
  const [pagina, setPagina] = useState(1)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingFactura, setEditingFactura] = useState(null)
  const [facturaDetalle, setFacturaDetalle] = useState(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, tipo: null, facturaId: null })

  const { data, isLoading, error } = useQuery({
    queryKey: ['facturas-compra', filtroEstado, pagina],
    queryFn: () => obtenerFacturasCompra({ estado: filtroEstado || undefined, pagina, limite: 15 }),
  })

  const { data: alertasData } = useQuery({
    queryKey: ['facturas-compra-alertas'],
    queryFn: obtenerAlertasCompra,
    staleTime: 60_000,
  })

  const invalidar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['facturas-compra'] })
    queryClient.invalidateQueries({ queryKey: ['producto-combobox'] })
    invalidateInventarioQueries(queryClient)
    // Una factura puede abastecer los dos inventarios en la misma operación.
    invalidateInventarioClinicoQueries(queryClient)
  }, [queryClient])

  const mutCrear = useMutation({
    mutationFn: crearFacturaCompra,
    onSuccess: invalidar,
  })

  const mutEditar = useMutation({
    mutationFn: ({ id, datos }) => editarFacturaCompra(id, datos),
    onSuccess: invalidar,
  })

  const mutConfirmar = useMutation({
    mutationFn: confirmarFacturaCompra,
    onSuccess: invalidar,
  })

  const mutAnular = useMutation({
    mutationFn: anularFacturaCompra,
    onSuccess: invalidar,
  })

  const mutPagar = useMutation({
    mutationFn: (facturaId) => marcarComoPagada(facturaId),
    onSuccess: () => {
      invalidar()
      queryClient.invalidateQueries({ queryKey: ['facturas-compra-alertas'] })
    },
  })

  const crearProductoInlineMutation = useMutation({
    mutationFn: inventarioApi.crearProducto,
  })

  const crearInsumoInlineMutation = useMutation({
    mutationFn: inventarioClinicoApi.crearInsumo,
  })

  const abrirNueva = useCallback(() => {
    setEditingFactura(null)
    setForm(FORM_INICIAL)
    setDrawerOpen(true)
  }, [])

  const abrirEditar = useCallback((factura) => {
    setEditingFactura(factura)
    setForm({
      proveedor: factura.proveedor,
      fecha: factura.fecha,
      numero: factura.numero || '',
      observaciones: factura.observaciones || '',
      tipoPago: factura.fechaPagoFinal ? 'credito' : 'contado',
      fechaPagoFinal: factura.fechaPagoFinal || '',
      items: factura.items.map((i) => ({
        destinoInventario: i.destinoInventario || 'ventas',
        esNuevo: false,
        productoId: i.productoId || '',
        insumoClinicoId: i.insumoClinicoId || '',
        producto: i.producto || i.insumoClinico || null,
        productoNuevo: PRODUCTO_NUEVO_VACIO(),
        cantidad: i.cantidad,
        precioUnitario: Number(i.precioUnitario),
      })),
    })
    setDrawerOpen(true)
  }, [])

  const abrirDetalle = useCallback((factura) => {
    setFacturaDetalle(factura)
  }, [])

  const cerrarDetalle = useCallback(() => {
    setFacturaDetalle(null)
  }, [])

  const cerrarDrawer = useCallback(() => {
    setDrawerOpen(false)
    setEditingFactura(null)
    setForm(FORM_INICIAL)
  }, [])

  const submitForm = useCallback(async () => {
    // Resuelve la referencia real de los ítems marcados como "nuevo", creando
    // el producto o el insumo en su catálogo antes de guardar la factura. Se
    // hace en secuencia (no Promise.all) para poder ir actualizando form.items
    // y no volver a crear registros ya creados si algo falla a mitad de camino.
    let itemsResueltos = form.items
    for (let idx = 0; idx < itemsResueltos.length; idx += 1) {
      const item = itemsResueltos[idx]
      if (!item.esNuevo) continue

      let campoId
      let idCreado

      if (item.destinoInventario === 'clinico') {
        // stockInicial en 0: la existencia entra al confirmar la factura, no al
        // crear el insumo, o la mercancía quedaría contada dos veces.
        const respuesta = await crearInsumoInlineMutation.mutateAsync({
          nombre: item.productoNuevo.nombre.trim(),
          categoria: item.productoNuevo.categoria,
          unidadBase: item.productoNuevo.unidadBase,
          cantidadPresentacion: Number(item.productoNuevo.cantidadPresentacion),
          unidadPresentacion: item.productoNuevo.unidadBase,
          precioPresentacion: Number(item.precioUnitario) || 0,
          stockMinimo: 0,
          stockInicial: 0,
        })
        campoId = 'insumoClinicoId'
        idCreado = respuesta.insumo?.id ?? respuesta.id
      } else {
        const respuesta = await crearProductoInlineMutation.mutateAsync({
          nombre: item.productoNuevo.nombre.trim(),
          categoria: item.productoNuevo.categoria,
          unidadMedida: item.productoNuevo.unidadMedida,
          precioCompra: Number(item.precioUnitario) || 0,
          stock: 0,
        })
        campoId = 'productoId'
        idCreado = respuesta.producto?.id ?? respuesta.id
      }

      itemsResueltos = itemsResueltos.map((it, i) =>
        i === idx ? { ...it, esNuevo: false, [campoId]: idCreado } : it
      )
      setForm((f) => ({ ...f, items: itemsResueltos }))
    }

    const payload = {
      ...form,
      numero: form.numero || undefined,
      observaciones: form.observaciones || undefined,
      fechaPagoFinal: form.tipoPago === 'credito' ? form.fechaPagoFinal || undefined : undefined,
      tipoPago: undefined,
      items: itemsResueltos.map((i) => ({
        destinoInventario: i.destinoInventario,
        ...(i.destinoInventario === 'clinico'
          ? { insumoClinicoId: i.insumoClinicoId }
          : { productoId: i.productoId }),
        cantidad: Number(i.cantidad),
        precioUnitario: Number(i.precioUnitario),
      })),
    }

    if (editingFactura) {
      await mutEditar.mutateAsync({ id: editingFactura.id, datos: payload })
    } else {
      await mutCrear.mutateAsync(payload)
    }
    cerrarDrawer()
  }, [
    form,
    editingFactura,
    mutCrear,
    mutEditar,
    cerrarDrawer,
    crearProductoInlineMutation,
    crearInsumoInlineMutation,
  ])

  const pedirConfirmar = useCallback((facturaId) => {
    setConfirmDialog({ open: true, tipo: 'confirmar', facturaId })
  }, [])

  const pedirAnular = useCallback((facturaId) => {
    setConfirmDialog({ open: true, tipo: 'anular', facturaId })
  }, [])

  const pedirPagar = useCallback((facturaId) => {
    setConfirmDialog({ open: true, tipo: 'pagar', facturaId })
  }, [])

  const ejecutarAccion = useCallback(async () => {
    const { tipo, facturaId } = confirmDialog
    setConfirmDialog({ open: false, tipo: null, facturaId: null })
    if (tipo === 'confirmar') await mutConfirmar.mutateAsync(facturaId)
    if (tipo === 'anular') await mutAnular.mutateAsync(facturaId)
    if (tipo === 'pagar') await mutPagar.mutateAsync(facturaId)
  }, [confirmDialog, mutConfirmar, mutAnular, mutPagar])

  const cancelarAccion = useCallback(() => {
    setConfirmDialog({ open: false, tipo: null, facturaId: null })
  }, [])

  // Helpers para gestionar ítems en el form
  const agregarItem = useCallback(() => {
    setForm((f) => ({ ...f, items: [...f.items, ITEM_VACIO()] }))
  }, [])

  const actualizarItem = useCallback((idx, campo, valor) => {
    setForm((f) => {
      const items = f.items.map((item, i) => {
        if (i !== idx) return item
        const actualizado = { ...item, [campo]: valor }
        actualizado.subtotal = Number(actualizado.cantidad) * Number(actualizado.precioUnitario)
        return actualizado
      })
      return { ...f, items }
    })
  }, [])

  const seleccionarProductoItem = useCallback((idx, producto) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => {
        if (i !== idx) return item
        const campoId = item.destinoInventario === 'clinico' ? 'insumoClinicoId' : 'productoId'
        return { ...item, [campoId]: producto?.id ?? '', producto: producto ?? null }
      }),
    }))
  }, [])

  // El destino decide catálogo, categorías y unidades, que no se solapan entre
  // inventarios: al cambiarlo se descarta lo elegido para el destino anterior.
  const actualizarItemDestino = useCallback((idx, destino) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === idx
          ? {
              ...item,
              destinoInventario: destino,
              productoId: '',
              insumoClinicoId: '',
              producto: null,
              productoNuevo: PRODUCTO_NUEVO_VACIO(),
            }
          : item
      ),
    }))
  }, [])

  const actualizarItemProductoNuevo = useCallback((idx, campo, valor) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === idx ? { ...item, productoNuevo: { ...item.productoNuevo, [campo]: valor } } : item
      ),
    }))
  }, [])

  const toggleItemEsNuevo = useCallback((idx) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === idx
          ? {
              ...item,
              esNuevo: !item.esNuevo,
              productoId: '',
              insumoClinicoId: '',
              producto: null,
              productoNuevo: PRODUCTO_NUEVO_VACIO(),
            }
          : item
      ),
    }))
  }, [])

  const eliminarItem = useCallback((idx) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }, [])

  const totalCalculado = form.items.reduce(
    (sum, i) => sum + Number(i.cantidad || 0) * Number(i.precioUnitario || 0),
    0
  )

  const errorMsg =
    getErrorMessage(mutCrear.error, null) ||
    getErrorMessage(mutEditar.error, null) ||
    getErrorMessage(mutConfirmar.error, null) ||
    getErrorMessage(mutAnular.error, null) ||
    getErrorMessage(mutPagar.error, null) ||
    getErrorMessage(crearProductoInlineMutation.error, null) ||
    getErrorMessage(crearInsumoInlineMutation.error, null)

  const isSaving =
    mutCrear.isPending ||
    mutEditar.isPending ||
    crearProductoInlineMutation.isPending ||
    crearInsumoInlineMutation.isPending

  const alertasCompra = {
    vencidas: alertasData?.vencidas?.facturas ?? [],
    proximasAVencer: alertasData?.proximasAVencer?.facturas ?? [],
    totalVencidas: alertasData?.vencidas?.total ?? 0,
    totalProximas: alertasData?.proximasAVencer?.total ?? 0,
  }

  return {
    // Datos
    facturas: data?.facturas ?? [],
    total: data?.total ?? 0,
    paginas: data?.paginas ?? 1,
    isLoading,
    error,
    // Alertas de pago
    alertasCompra,
    // Filtros y paginación
    pagina,
    setPagina,
    filtroEstado,
    setFiltroEstado,
    // Drawer
    drawerOpen,
    editingFactura,
    form,
    setForm,
    abrirNueva,
    abrirEditar,
    cerrarDrawer,
    submitForm,
    isSaving,
    // Detalle de solo lectura
    facturaDetalle,
    abrirDetalle,
    cerrarDetalle,
    // Items
    agregarItem,
    actualizarItem,
    seleccionarProductoItem,
    actualizarItemDestino,
    actualizarItemProductoNuevo,
    toggleItemEsNuevo,
    eliminarItem,
    totalCalculado,
    // Confirmar / Anular / Pagar
    confirmDialog,
    pedirConfirmar,
    pedirAnular,
    pedirPagar,
    ejecutarAccion,
    cancelarAccion,
    isActuando: mutConfirmar.isPending || mutAnular.isPending || mutPagar.isPending,
    // Error
    errorMsg,
  }
}
