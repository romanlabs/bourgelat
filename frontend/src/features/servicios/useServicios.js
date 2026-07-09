import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { serviciosApi } from './serviciosApi'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

function invalidateServiciosQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['servicios-clinicos'] })
  queryClient.invalidateQueries({ queryKey: ['servicios-clinicos-selector'] })
  // El POS consulta el catalogo con su propia clave; sin esto, un servicio
  // recien creado no aparece en el punto de venta hasta recargar la pagina.
  queryClient.invalidateQueries({ queryKey: ['finanzas-servicios'] })
}

export function useServicios({ enabled, forSelector = false } = {}) {
  const queryClient = useQueryClient()

  const [buscar, setBuscar] = useState('')
  const [pagina, setPagina] = useState(1)
  const [editingServicio, setEditingServicio] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, servicio: null })

  const busquedaDiferida = useDeferredValue(buscar.trim())

  const serviciosQuery = useQuery({
    queryKey: ['servicios-clinicos', busquedaDiferida, pagina],
    queryFn: () => serviciosApi.obtenerServicios({ buscar: busquedaDiferida || undefined, pagina, limite: 12 }),
    enabled,
    placeholderData: (prev) => prev,
  })

  // Selector liviano para el buscador de servicios en Finanzas.
  const serviciosSelectorQuery = useQuery({
    queryKey: ['servicios-clinicos-selector', busquedaDiferida],
    queryFn: () => serviciosApi.obtenerServicios({ buscar: busquedaDiferida || undefined, limite: 50 }),
    enabled: enabled && forSelector,
    placeholderData: (prev) => prev,
  })

  const crearServicioMutation = useMutation({
    mutationFn: serviciosApi.crearServicio,
    onSuccess: (data) => {
      toast.success(data?.message || 'Servicio creado exitosamente')
      closeDrawer()
      invalidateServiciosQueries(queryClient)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible crear el servicio.')),
  })

  const editarServicioMutation = useMutation({
    mutationFn: ({ servicioId, payload }) => serviciosApi.editarServicio(servicioId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Servicio actualizado exitosamente')
      closeDrawer()
      invalidateServiciosQueries(queryClient)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible actualizar el servicio.')),
  })

  const eliminarServicioMutation = useMutation({
    mutationFn: serviciosApi.eliminarServicio,
    onSuccess: (data, servicioId) => {
      toast.success(data?.message || 'Servicio desactivado exitosamente')
      setConfirmDialog({ open: false, servicio: null })
      if (editingServicio?.id === servicioId) closeDrawer()
      invalidateServiciosQueries(queryClient)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible desactivar el servicio.')),
  })

  const serviciosRows = useMemo(
    () =>
      (serviciosQuery.data?.servicios || []).map((s) => ({
        id: s.id,
        nombre: s.nombre,
        categoria: s.categoria || '—',
        precioVenta: formatCurrency(Number(s.precioVenta || 0)),
        costoEstimado: formatCurrency(Number(s.costoEstimado || 0)),
        insumos: s.insumos?.length || 0,
        raw: s,
      })),
    [serviciosQuery.data?.servicios]
  )

  function openCreateDrawer() {
    setEditingServicio(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingServicio(null)
  }

  function openEditDrawer(servicio) {
    setEditingServicio(servicio)
    setDrawerOpen(true)
  }

  function openConfirmDelete(servicio) {
    setConfirmDialog({ open: true, servicio })
  }

  function confirmDelete() {
    eliminarServicioMutation.mutate(confirmDialog.servicio.id)
  }

  function handleDrawerSubmit(formData) {
    const payload = {
      nombre: formData.nombre,
      categoria: formData.categoria?.trim() || undefined,
      descripcion: formData.descripcion?.trim() || undefined,
      precioVenta: formData.precioVenta,
      insumos: formData.insumos.map((i) => ({
        insumoClinicoId: i.insumoClinicoId,
        cantidadConsumida: i.cantidadConsumida,
      })),
    }
    if (editingServicio) {
      editarServicioMutation.mutate({ servicioId: editingServicio.id, payload })
    } else {
      crearServicioMutation.mutate(payload)
    }
  }

  return {
    serviciosQuery,
    serviciosSelectorQuery,
    serviciosRows,
    isPendingServicio: crearServicioMutation.isPending || editarServicioMutation.isPending,
    isPendingDelete: eliminarServicioMutation.isPending,
    buscar, setBuscar,
    pagina, setPagina,
    editingServicio,
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
