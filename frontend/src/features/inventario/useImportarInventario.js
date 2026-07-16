import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inventarioApi } from './inventarioApi'
import { getErrorMessage, invalidateInventarioQueries } from './inventarioUtils'

export function useImportarInventario() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resultado, setResultado] = useState(null)

  const importarMutation = useMutation({
    mutationFn: inventarioApi.importarProductos,
    onSuccess: (data) => {
      setResultado(data)
      const creados = data?.creados?.length || 0
      const omitidos = data?.omitidos?.length || 0
      toast.success(`Importacion completada: ${creados} creados${omitidos > 0 ? `, ${omitidos} omitidos` : ''}`)
      invalidateInventarioQueries(queryClient)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible importar el inventario.')),
  })

  function openImportDialog() {
    setResultado(null)
    setDialogOpen(true)
  }

  function closeImportDialog() {
    setDialogOpen(false)
    setResultado(null)
  }

  function confirmImport(productos) {
    importarMutation.mutate(productos)
  }

  return {
    dialogOpen,
    openImportDialog,
    closeImportDialog,
    confirmImport,
    resultado,
    isPending: importarMutation.isPending,
  }
}
