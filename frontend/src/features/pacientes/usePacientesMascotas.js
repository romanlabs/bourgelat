import { useDeferredValue, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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

export function usePacientesMascotas({ enabled, featureSet }) {
  const queryClient = useQueryClient()

  const [buscar, setBuscar] = useState('')
  const [especie, setEspecie] = useState('todas')
  const [pagina, setPagina] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [ownerSearch, setOwnerSearch] = useState('')

  const buscarDiferido = useDeferredValue(buscar.trim())
  const ownerSearchDiferido = useDeferredValue(ownerSearch.trim())

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
    enabled: enabled && drawerOpen,
    placeholderData: (prev) => prev,
  })

  const subirFotoMascotaMutation = useMutation({
    mutationFn: pacientesApi.subirFotoMascota,
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible cargar la foto del paciente.')),
  })

  const crearMascotaMutation = useMutation({
    mutationFn: pacientesApi.crearMascota,
    onSuccess: (data) => {
      toast.success(data?.message || 'Paciente registrado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['pacientes-mascotas'] })
      queryClient.invalidateQueries({ queryKey: ['pacientes-mascotas-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible registrar el paciente.')),
  })

  const historiasDisponibles = featureSet.has('historias')
  const antecedentesDisponibles = featureSet.has('antecedentes')

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
          peso: mascota.peso ? `${mascota.peso} kg` : 'Sin peso',
          fichaLabel: fichaInfo.label,
          fichaTone: fichaInfo.tone,
          historiasTo: historiasDisponibles
            ? `/historias?mascotaId=${mascota.id}&propietarioId=${mascota.Propietario?.id || ''}`
            : '',
          antecedentesTo: antecedentesDisponibles ? `/antecedentes?mascotaId=${mascota.id}` : '',
          raw: mascota,
        }
      }),
    [mascotasQuery.data?.mascotas, historiasDisponibles, antecedentesDisponibles]
  )

  const [expedienteDrawerOpen, setExpedienteDrawerOpen] = useState(false)
  const [selectedMascota, setSelectedMascota] = useState(null)

  function openDrawer() {
    setOwnerSearch('')
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setOwnerSearch('')
  }

  function openExpediente(row) {
    setSelectedMascota(row)
    setExpedienteDrawerOpen(true)
  }

  function closeExpediente() {
    setExpedienteDrawerOpen(false)
    setTimeout(() => setSelectedMascota(null), 300)
  }

  async function handleDrawerSubmit({ payload, photoFile, onDone }) {
    try {
      if (photoFile) {
        const uploaded = await subirFotoMascotaMutation.mutateAsync(photoFile)
        payload.fotoPerfil = uploaded?.fotoPerfil
      }
      await crearMascotaMutation.mutateAsync(payload)
      onDone?.()
    } catch {
      // errors handled in mutation callbacks
    }
  }

  return {
    mascotasQuery,
    propietariosSelectorQuery,
    mascotasRows,
    buscar, setBuscar,
    especie, setEspecie,
    pagina, setPagina,
    drawerOpen,
    ownerSearch, setOwnerSearch,
    isPending: crearMascotaMutation.isPending || subirFotoMascotaMutation.isPending,
    openDrawer,
    closeDrawer,
    handleDrawerSubmit,
    expedienteDrawerOpen,
    selectedMascota,
    openExpediente,
    closeExpediente,
  }
}
