import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatearEdad } from '@/lib/utils'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { pacientesApi } from './pacientesApi'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

export const SPECIES_OPTIONS = [
  { value: 'todas', label: 'Todas las especies' },
  { value: 'perro', label: 'Perros' },
  { value: 'gato', label: 'Gatos' },
  { value: 'ave', label: 'Aves' },
  { value: 'conejo', label: 'Conejos' },
  { value: 'reptil', label: 'Reptiles' },
  { value: 'otro', label: 'Otros' },
]

const SPECIES_LABELS = {
  perro: 'Perros',
  gato: 'Gatos',
  ave: 'Aves',
  conejo: 'Conejos',
  reptil: 'Reptiles',
  otro: 'Otros',
}

export function usePacientesMascotas({ enabled }) {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const esTabActivo = searchParams.get('tab') === 'pacientes'

  const [buscar, setBuscar] = useState(() => (esTabActivo && searchParams.get('buscar')) || '')
  const [especie, setEspecie] = useState('todas')
  const [pagina, setPagina] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPaciente, setEditingPaciente] = useState(null)
  const [ownerSearch, setOwnerSearch] = useState('')

  const buscarDiferido = useDebouncedValue(buscar.trim())
  const ownerSearchDiferido = useDebouncedValue(ownerSearch.trim())

  // Refleja el termino en la URL para que la busqueda sea compartible y
  // sobreviva a un refresh. Se escribe el valor ya diferido para no apilar una
  // entrada por pulsacion, y en modo replace para no romper el boton atras.
  useEffect(() => {
    if (!esTabActivo) return
    setSearchParams(
      (previos) => {
        const siguientes = new URLSearchParams(previos)
        if (buscarDiferido) siguientes.set('buscar', buscarDiferido)
        else siguientes.delete('buscar')
        return siguientes
      },
      { replace: true }
    )
  }, [buscarDiferido, esTabActivo, setSearchParams])

  // Unico punto de entrada del termino: garantiza que la paginacion vuelva a 1.
  function cambiarBuscar(valor) {
    setBuscar(valor)
    setPagina(1)
  }

  function cambiarEspecie(valor) {
    setEspecie(valor)
    setPagina(1)
  }

  const mascotasQuery = useQuery({
    queryKey: ['pacientes-mascotas', buscarDiferido, especie, pagina],
    queryFn: () =>
      pacientesApi.obtenerMascotas({
        buscar: buscarDiferido || undefined,
        especie: especie !== 'todas' ? especie : undefined,
        pagina,
        limite: 12,
      }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const propietariosSelectorQuery = useQuery({
    queryKey: ['pacientes-propietarios-selector', ownerSearchDiferido],
    queryFn: () =>
      pacientesApi.obtenerPropietarios({
        buscar: ownerSearchDiferido || undefined,
        pagina: 1,
        limite: 8,
      }),
    // En edicion el tutor no se puede reasignar, asi que no hace falta el selector.
    enabled: enabled && drawerOpen && !editingPaciente,
    placeholderData: (prev) => prev,
  })

  const subirFotoMascotaMutation = useMutation({
    mutationFn: pacientesApi.subirFotoMascota,
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible cargar la foto del paciente.')),
  })

  function invalidarMascotas() {
    queryClient.invalidateQueries({ queryKey: ['pacientes-mascotas'] })
    queryClient.invalidateQueries({ queryKey: ['pacientes-mascotas-resumen'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
  }

  const crearMascotaMutation = useMutation({
    mutationFn: pacientesApi.crearMascota,
    onSuccess: (data) => {
      toast.success(data?.message || 'Paciente registrado exitosamente')
      invalidarMascotas()
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible registrar el paciente.')),
  })

  const editarMascotaMutation = useMutation({
    mutationFn: ({ mascotaId, payload }) => pacientesApi.editarMascota(mascotaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Paciente actualizado exitosamente')
      invalidarMascotas()
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible actualizar el paciente.')),
  })

  // Todos los planes incluyen historias y antecedentes.
  const historiasDisponibles = true
  const antecedentesDisponibles = true

  const mascotasRows = useMemo(
    () =>
      (mascotasQuery.data?.mascotas || []).map((mascota) => {
        const fichaInfo =
          historiasDisponibles && antecedentesDisponibles
            ? { label: 'Lista para historia y antecedentes', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
            : historiasDisponibles
              ? { label: 'Lista para historia clinica', tone: 'border-cyan-200 bg-cyan-50 text-cyan-700' }
              : antecedentesDisponibles
                ? { label: 'Lista para antecedentes', tone: 'border-amber-200 bg-amber-50 text-amber-700' }
                : { label: 'Ficha clinica no incluida', tone: 'border-slate-200 bg-slate-100 text-slate-700' }

        return {
          id: mascota.id,
          paciente: mascota.nombre,
          fotoPerfil: mascota.fotoPerfil || '',
          especie: SPECIES_LABELS[mascota.especie] || mascota.especie,
          raza: mascota.raza || '',
          tutor: mascota.Propietario?.nombre || 'Sin tutor',
          contacto: mascota.Propietario?.telefono || 'Sin telefono',
          color: mascota.color || 'Sin color',
          edad: formatearEdad(mascota.fechaNacimiento) || 'Sin edad',
          peso: mascota.peso ? `${mascota.peso} kg` : 'Sin peso',
          fichaLabel: fichaInfo.label,
          fichaTone: fichaInfo.tone,
          historiasTo: historiasDisponibles
            ? `/pacientes/${mascota.id}/historial`
            : '',
          antecedentesTo: antecedentesDisponibles ? `/antecedentes?mascotaId=${mascota.id}` : '',
          raw: mascota,
        }
      }),
    [mascotasQuery.data?.mascotas, historiasDisponibles, antecedentesDisponibles]
  )

  function openCreateDrawer() {
    setEditingPaciente(null)
    setOwnerSearch('')
    setDrawerOpen(true)
  }

  function openEditDrawer(mascota) {
    setEditingPaciente(mascota)
    setOwnerSearch('')
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingPaciente(null)
    setOwnerSearch('')
  }

  async function handleDrawerSubmit({ payload, photoFile, onDone }) {
    try {
      if (photoFile) {
        const uploaded = await subirFotoMascotaMutation.mutateAsync(photoFile)
        payload.fotoPerfil = uploaded?.fotoPerfil
      }

      if (editingPaciente) {
        // Ni la especie ni el tutor son editables: el backend los ignora y enviarlos
        // solo confundiria la traza de auditoria.
        const editable = { ...payload }
        delete editable.propietarioId
        delete editable.especie
        await editarMascotaMutation.mutateAsync({ mascotaId: editingPaciente.id, payload: editable })
      } else {
        await crearMascotaMutation.mutateAsync(payload)
      }
      onDone?.()
    } catch {
      // errors handled in mutation callbacks
    }
  }

  return {
    mascotasQuery,
    propietariosSelectorQuery,
    mascotasRows,
    buscar, setBuscar: cambiarBuscar,
    buscarAplicado: buscarDiferido,
    especie, setEspecie: cambiarEspecie,
    pagina, setPagina,
    drawerOpen,
    editingPaciente,
    ownerSearch, setOwnerSearch,
    isPending:
      crearMascotaMutation.isPending ||
      editarMascotaMutation.isPending ||
      subirFotoMascotaMutation.isPending,
    openCreateDrawer,
    openEditDrawer,
    closeDrawer,
    handleDrawerSubmit,
  }
}
