import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invalidarDominios } from '@/lib/queryKeys'
import { useAuthStore } from '@/store/authStore'
import { serviciosApi } from '@/features/servicios/serviciosApi'
import { inventarioApi } from './inventarioApi'
import { construirLibroInventario, descargarArchivo } from './inventarioExcel'
import { getErrorMessage, invalidateInventarioQueries } from './inventarioUtils'

const POR_PAGINA = 100

// Las listas paginan de a 100 como maximo: se recorren todas las paginas.
async function traerTodo(obtenerPagina, clave) {
  const filas = []
  let pagina = 1
  let paginas = 1
  do {
    const data = await obtenerPagina({ pagina, limite: POR_PAGINA })
    filas.push(...(data?.[clave] || []))
    paginas = data?.paginas || 1
    pagina += 1
  } while (pagina <= paginas)
  return filas
}

function fechaArchivo() {
  const hoy = new Date()
  const dos = (n) => String(n).padStart(2, '0')
  return `${hoy.getFullYear()}-${dos(hoy.getMonth() + 1)}-${dos(hoy.getDate())}`
}

// Productos y servicios van a endpoints distintos; si una parte falla, la otra
// ya quedo guardada y se informa igual (volver a cargar omite los repetidos).
async function importarTodo({ productos, servicios }) {
  const resultado = { productos: null, servicios: null, error: null }
  try {
    if (productos.length > 0) resultado.productos = await inventarioApi.importarProductos(productos)
    if (servicios.length > 0) resultado.servicios = await inventarioApi.importarServicios(servicios)
  } catch (error) {
    if (!resultado.productos && !resultado.servicios) throw error
    resultado.error = getErrorMessage(error, 'Una parte no se pudo cargar.')
  }
  return resultado
}

export function useImportarInventario() {
  const queryClient = useQueryClient()
  const clinica = useAuthStore((state) => state.clinica)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [exportando, setExportando] = useState(false)

  const importarMutation = useMutation({
    mutationFn: importarTodo,
    onSuccess: (data) => {
      setResultado(data)
      const creados = (data.productos?.creados?.length || 0) + (data.servicios?.creados?.length || 0)
      const omitidos = (data.productos?.omitidos?.length || 0) + (data.servicios?.omitidos?.length || 0)
      if (data.error) {
        toast.warning(`Se cargó una parte (${creados} creados). ${data.error}`)
      } else {
        toast.success(`Carga completada: ${creados} creados${omitidos > 0 ? `, ${omitidos} omitidos` : ''}`)
      }
      if (data.productos) invalidateInventarioQueries(queryClient)
      if (data.servicios) invalidarDominios(queryClient, 'servicios')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible cargar el archivo.')),
  })

  function openImportDialog() {
    setResultado(null)
    setDialogOpen(true)
  }

  function closeImportDialog() {
    setDialogOpen(false)
    setResultado(null)
  }

  function confirmImport({ productos, servicios }) {
    importarMutation.mutate({ productos, servicios })
  }

  async function exportarExcel() {
    setExportando(true)
    try {
      const [productos, servicios] = await Promise.all([
        traerTodo((params) => inventarioApi.obtenerProductos(params), 'productos'),
        traerTodo((params) => serviciosApi.obtenerServicios(params), 'servicios'),
      ])
      const bytes = await construirLibroInventario({
        productos,
        servicios,
        nombreClinica: clinica?.nombreComercial || clinica?.nombre || '',
      })
      descargarArchivo(bytes, `inventario-bourgelat-${fechaArchivo()}.xlsx`)
      toast.success(`Excel descargado: ${productos.length} productos y ${servicios.length} servicios`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'No fue posible generar el Excel.'))
    } finally {
      setExportando(false)
    }
  }

  return {
    dialogOpen,
    openImportDialog,
    closeImportDialog,
    confirmImport,
    resultado,
    isPending: importarMutation.isPending,
    exportarExcel,
    exportando,
  }
}
