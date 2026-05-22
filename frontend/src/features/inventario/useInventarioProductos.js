import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inventarioApi } from './inventarioApi'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import { getErrorMessage, invalidateInventarioQueries } from './inventarioUtils'

export const CATEGORY_OPTIONS = [
  { value: 'todas', label: 'Todas' },
  { value: 'medicamento', label: 'Medicamentos' },
  { value: 'vacuna', label: 'Vacunas' },
  { value: 'insumo', label: 'Insumos' },
  { value: 'alimento', label: 'Alimentos' },
  { value: 'antiparasitario', label: 'Antiparasitarios' },
  { value: 'suplemento', label: 'Suplementos' },
  { value: 'accesorio', label: 'Accesorios' },
  { value: 'otro', label: 'Otros' },
]

export function useInventarioProductos({ enabled, onProductDeleted }) {
  const queryClient = useQueryClient()

  const [buscar, setBuscar] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [bajoStock, setBajoStock] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [editingProduct, setEditingProduct] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, producto: null })

  const busquedaDiferida = useDeferredValue(buscar.trim())

  const productosQuery = useQuery({
    queryKey: ['inventario-productos', busquedaDiferida, categoria, bajoStock, pagina],
    queryFn: () =>
      inventarioApi.obtenerProductos({
        buscar: busquedaDiferida || undefined,
        categoria: categoria !== 'todas' ? categoria : undefined,
        bajoStock: bajoStock ? 'true' : undefined,
        pagina,
        limite: 12,
      }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const productosSelectorQuery = useQuery({
    queryKey: ['inventario-productos-selector'],
    queryFn: () => inventarioApi.obtenerProductos({ limite: 50 }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const crearProductoMutation = useMutation({
    mutationFn: inventarioApi.crearProducto,
    onSuccess: (data) => {
      toast.success(data?.message || 'Producto creado exitosamente')
      closeDrawer()
      invalidateInventarioQueries(queryClient)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible crear el producto.')),
  })

  const editarProductoMutation = useMutation({
    mutationFn: ({ productoId, payload }) => inventarioApi.editarProducto(productoId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Producto actualizado exitosamente')
      closeDrawer()
      invalidateInventarioQueries(queryClient)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible actualizar el producto.')),
  })

  const eliminarProductoMutation = useMutation({
    mutationFn: inventarioApi.eliminarProducto,
    onSuccess: (data, productoId) => {
      toast.success(data?.message || 'Producto desactivado exitosamente')
      setConfirmDialog({ open: false, producto: null })
      if (editingProduct?.id === productoId) closeDrawer()
      onProductDeleted?.(productoId)
      invalidateInventarioQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ['inventario-movimientos'] })
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible desactivar el producto.')),
  })

  const productosRows = useMemo(
    () =>
      (productosQuery.data?.productos || []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        stock: p.stock,
        stockMinimo: p.stockMinimo,
        valor: formatCurrency(Number(p.precioVenta || 0) * Number(p.stock || 0)),
        alertas: p.alertas || [],
        raw: p,
      })),
    [productosQuery.data?.productos]
  )

  function openCreateDrawer() {
    setEditingProduct(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingProduct(null)
  }

  function openEditDrawer(producto) {
    setEditingProduct(producto)
    setDrawerOpen(true)
  }

  function openConfirmDelete(producto) {
    setConfirmDialog({ open: true, producto })
  }

  function confirmDelete() {
    eliminarProductoMutation.mutate(confirmDialog.producto.id)
  }

  function handleDrawerSubmit(formData) {
    const payload = {
      nombre: formData.nombre,
      categoria: formData.categoria,
      unidadMedida: formData.unidadMedida,
      stockMinimo: formData.stockMinimo,
      precioCompra: formData.precioCompra,
      precioVenta: formData.precioVenta,
      fechaVencimiento: formData.fechaVencimiento || undefined,
      lote: formData.lote?.trim() || undefined,
      laboratorio: formData.laboratorio?.trim() || undefined,
      requiereFormula: formData.requiereFormula,
    }
    if (editingProduct) {
      editarProductoMutation.mutate({ productoId: editingProduct.id, payload })
    } else {
      crearProductoMutation.mutate({ ...payload, stock: formData.stock ?? 0 })
    }
  }

  return {
    productosQuery,
    productosSelectorQuery,
    productosRows,
    isPendingProduct: crearProductoMutation.isPending || editarProductoMutation.isPending,
    isPendingDelete: eliminarProductoMutation.isPending,
    buscar, setBuscar,
    categoria, setCategoria,
    bajoStock, setBajoStock,
    pagina, setPagina,
    editingProduct,
    drawerOpen,
    confirmDialog, setConfirmDialog,
    openCreateDrawer,
    closeDrawer,
    openEditDrawer,
    openConfirmDelete,
    confirmDelete,
    handleDrawerSubmit,
  }
}
