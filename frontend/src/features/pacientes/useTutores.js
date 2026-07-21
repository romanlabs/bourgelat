import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { pacientesApi } from './pacientesApi'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

export const DOCUMENT_OPTIONS = [
  { value: 'CC', label: 'Cedula de ciudadania' },
  { value: 'CE', label: 'Cedula de extranjeria' },
  { value: 'PP', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
]

export function useTutores({ enabled }) {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const buscarParam = searchParams.get('tab') === 'tutores' ? searchParams.get('buscar') : null

  const [buscar, setBuscar] = useState(() => buscarParam || '')
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    if (buscarParam !== null) {
      setBuscar(buscarParam)
      setPagina(1)
    }
  }, [buscarParam])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const buscarDiferido = useDebouncedValue(buscar.trim())

  const tutoresQuery = useQuery({
    queryKey: ['pacientes-tutores', buscarDiferido, pagina],
    queryFn: () =>
      pacientesApi.obtenerPropietarios({
        buscar: buscarDiferido || undefined,
        pagina,
        limite: 12,
      }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const crearPropietarioMutation = useMutation({
    mutationFn: pacientesApi.crearPropietario,
    onSuccess: (data) => {
      toast.success(data?.message || 'Tutor registrado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['pacientes-tutores'] })
      queryClient.invalidateQueries({ queryKey: ['pacientes-propietarios-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['pacientes-propietarios-selector'] })
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible registrar el tutor.')),
  })

  const tutoresRows = useMemo(
    () =>
      (tutoresQuery.data?.propietarios || []).map((t) => ({
        id: t.id,
        nombre: t.nombre,
        documento: t.numeroDocumento ? `${t.tipoDocumento || ''} ${t.numeroDocumento}`.trim() : 'Sin documento',
        telefono: t.telefono || 'Sin telefono',
        email: t.email || '—',
        ciudad: t.ciudad || '—',
        raw: t,
      })),
    [tutoresQuery.data?.propietarios]
  )

  function openDrawer() { setDrawerOpen(true) }
  function closeDrawer() { setDrawerOpen(false) }

  function handleDrawerSubmit(formData) {
    const payload = {
      nombre: formData.nombre.trim(),
      tipoDocumento: formData.tipoDocumento,
      numeroDocumento: formData.numeroDocumento.trim(),
      telefono: formData.telefono.replace(/\D/g, ''),
      email: formData.email?.trim().toLowerCase() || undefined,
      ciudad: formData.ciudad?.trim() || undefined,
    }
    crearPropietarioMutation.mutate(payload, {
      onSuccess: () => closeDrawer(),
    })
  }

  return {
    tutoresQuery,
    tutoresRows,
    buscar, setBuscar,
    pagina, setPagina,
    drawerOpen,
    isPending: crearPropietarioMutation.isPending,
    openDrawer,
    closeDrawer,
    handleDrawerSubmit,
  }
}
