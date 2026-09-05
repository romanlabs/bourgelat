import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inventarioClinicoApi } from './inventarioClinicoApi'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import { getErrorMessage, invalidateInventarioClinicoQueries } from './inventarioClinicoUtils'

export const CATEGORY_OPTIONS = [
  { value: 'todas', label: 'Todas' },
  { value: 'medicamento', label: 'Medicamentos' },
  { value: 'vacuna', label: 'Vacunas' },
  { value: 'insumo', label: 'Insumos' },
  { value: 'antiparasitario', label: 'Antiparasitarios' },
  { value: 'suplemento', label: 'Suplementos' },
  { value: 'otro', label: 'Otros' },
]

// Unidades base para consumo clinico: fraccionables, no presentaciones enteras.
export const UNIDAD_BASE_OPTIONS = [
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'mg', label: 'Miligramo (mg)' },
  { value: 'gr', label: 'Gramo (gr)' },
  { value: 'unidad', label: 'Unidad' },
  { value: 'dosis', label: 'Dosis' },
]

export function useInsumosClinicos({ enabled, onInsumoDeleted }) {
  const queryClient = useQueryClient()

  const [buscar, setBuscar] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [bajoStock, setBajoStock] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [editingInsumo, setEditingInsumo] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, insumo: null })

  const busquedaDiferida = useDeferredValue(buscar.trim())

  const insumosQuery = useQuery({
    queryKey: ['inventario-clinico-insumos', busquedaDiferida, categoria, bajoStock, pagina],
    queryFn: () =>
      inventarioClinicoApi.obtenerInsumos({
        buscar: busquedaDiferida || undefined,
        categoria: categoria !== 'todas' ? categoria : undefined,
        bajoStock: bajoStock ? 'true' : undefined,
        pagina,
        limite: 12,
      }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const insumosSelectorQuery = useQuery({
    queryKey: ['inventario-clinico-insumos-selector'],
    queryFn: () => inventarioClinicoApi.obtenerInsumos({ limite: 100 }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const crearInsumoMutation = useMutation({
    mutationFn: inventarioClinicoApi.crearInsumo,
    onSuccess: (data) => {
      toast.success(data?.message || 'Insumo clinico creado exitosamente')
      closeDrawer()
      invalidateInventarioClinicoQueries(queryClient)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible crear el insumo clinico.')),
  })

  const editarInsumoMutation = useMutation({
    mutationFn: ({ insumoId, payload }) => inventarioClinicoApi.editarInsumo(insumoId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Insumo clinico actualizado exitosamente')
      closeDrawer()
      invalidateInventarioClinicoQueries(queryClient)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible actualizar el insumo clinico.')),
  })

  const eliminarInsumoMutation = useMutation({
    mutationFn: inventarioClinicoApi.eliminarInsumo,
    onSuccess: (data, insumoId) => {
      toast.success(data?.message || 'Insumo clinico desactivado exitosamente')
      setConfirmDialog({ open: false, insumo: null })
      if (editingInsumo?.id === insumoId) closeDrawer()
      onInsumoDeleted?.(insumoId)
      invalidateInventarioClinicoQueries(queryClient)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible desactivar el insumo clinico.')),
  })

  const registrarCompraMutation = useMutation({
    mutationFn: ({ insumoId, payload }) => inventarioClinicoApi.registrarMovimiento(insumoId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Compra registrada exitosamente')
      closeDrawer()
      invalidateInventarioClinicoQueries(queryClient)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible registrar la compra.')),
  })

  const registrarMermaMutation = useMutation({
    mutationFn: ({ insumoId, payload }) => inventarioClinicoApi.registrarMovimiento(insumoId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Merma registrada exitosamente')
      closeDrawer()
      invalidateInventarioClinicoQueries(queryClient)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible registrar la merma.')),
  })

  const insumosRows = useMemo(
    () =>
      (insumosQuery.data?.insumos || []).map((i) => ({
        id: i.id,
        nombre: i.nombre,
        categoria: i.categoria,
        stock: i.stock,
        stockMinimo: i.stockMinimo,
        unidadBase: i.unidadBase,
        precioUnitarioBase: i.precioUnitarioBase,
        valor: formatCurrency(Number(i.precioUnitarioBase || 0) * Number(i.stock || 0)),
        alertas: i.alertas || [],
        raw: i,
      })),
    [insumosQuery.data?.insumos]
  )

  function openCreateDrawer() {
    setEditingInsumo(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingInsumo(null)
  }

  function openEditDrawer(insumo) {
    setEditingInsumo(insumo)
    setDrawerOpen(true)
  }

  function openConfirmDelete(insumo) {
    setConfirmDialog({ open: true, insumo })
  }

  function confirmDelete() {
    eliminarInsumoMutation.mutate(confirmDialog.insumo.id)
  }

  function handleDrawerSubmit(formData) {
    if (editingInsumo) {
      editarInsumoMutation.mutate({
        insumoId: editingInsumo.id,
        payload: {
          nombre: formData.nombre,
          categoria: formData.categoria,
          unidadBase: formData.unidadBase,
          stockMinimo: formData.stockMinimo,
          fechaVencimiento: formData.fechaVencimiento || undefined,
          lote: formData.lote?.trim() || undefined,
          laboratorio: formData.laboratorio?.trim() || undefined,
        },
      })
    } else {
      crearInsumoMutation.mutate({
        nombre: formData.nombre,
        categoria: formData.categoria,
        unidadBase: formData.unidadBase,
        cantidadPresentacion: formData.cantidadPresentacion,
        unidadPresentacion: formData.unidadPresentacion?.trim() || undefined,
        precioPresentacion: formData.precioPresentacion,
        stockMinimo: formData.stockMinimo,
        fechaVencimiento: formData.fechaVencimiento || undefined,
        lote: formData.lote?.trim() || undefined,
        laboratorio: formData.laboratorio?.trim() || undefined,
      })
    }
  }

  function handleRegistrarCompra(insumoId, { cantidadPresentacion, unidadPresentacion, precioPresentacion }) {
    registrarCompraMutation.mutate({
      insumoId,
      payload: {
        tipo: 'entrada',
        motivo: 'compra',
        cantidad: cantidadPresentacion,
        cantidadPresentacion,
        unidadPresentacion: unidadPresentacion?.trim() || undefined,
        precioPresentacion,
      },
    })
  }

  function handleRegistrarMerma(insumoId, { cantidad, motivo, observaciones }) {
    registrarMermaMutation.mutate({
      insumoId,
      payload: {
        tipo: 'salida',
        motivo,
        cantidad,
        observaciones: observaciones?.trim() || undefined,
      },
    })
  }

  return {
    insumosQuery,
    insumosSelectorQuery,
    insumosRows,
    isPendingInsumo: crearInsumoMutation.isPending || editarInsumoMutation.isPending,
    isPendingDelete: eliminarInsumoMutation.isPending,
    isPendingCompra: registrarCompraMutation.isPending,
    isPendingMerma: registrarMermaMutation.isPending,
    buscar, setBuscar,
    categoria, setCategoria,
    bajoStock, setBajoStock,
    pagina, setPagina,
    editingInsumo,
    drawerOpen,
    confirmDialog, setConfirmDialog,
    openCreateDrawer,
    closeDrawer,
    openEditDrawer,
    openConfirmDelete,
    confirmDelete,
    handleDrawerSubmit,
    handleRegistrarCompra,
    handleRegistrarMerma,
  }
}
