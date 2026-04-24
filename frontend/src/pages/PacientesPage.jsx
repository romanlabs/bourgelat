import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CalendarClock,
  FileText,
  HeartPulse,
  LayoutDashboard,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import {
  DashboardPanel,
  DataTable,
  DonutCard,
  EmptyModuleState,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatNumber, objectToChartData, toNumber } from '@/features/dashboard/dashboardUtils'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'

const SPECIES_OPTIONS = [
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

const SEX_LABELS = {
  desconocido: 'Sin especificar',
  macho: 'Macho',
  hembra: 'Hembra',
}

const SEX_OPTIONS = [
  { value: 'desconocido', label: 'Sin especificar' },
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
]

const DOCUMENT_OPTIONS = [
  { value: 'CC', label: 'Cedula de ciudadania' },
  { value: 'CE', label: 'Cedula de extranjeria' },
  { value: 'PP', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
]

const DEFAULT_OWNER_FORM = {
  nombre: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  telefono: '',
  email: '',
  ciudad: '',
}

const DEFAULT_PET_FORM = {
  propietarioId: '',
  nombre: '',
  especie: 'perro',
  raza: '',
  sexo: 'desconocido',
  peso: '',
  color: '',
  observaciones: '',
  esterilizado: false,
}

const MAX_PET_PHOTO_BYTES = 4 * 1024 * 1024
const ALLOWED_PET_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const INPUT_CLASSNAME =
  'h-11 rounded-[16px] border border-slate-300 bg-white px-3.5 text-[15px] text-slate-800 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-cyan-100'
const TEXTAREA_CLASSNAME =
  'min-h-[140px] rounded-[16px] border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-800 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-cyan-100'
const PET_MEDIA_COLUMN_CLASSNAME = 'grid w-full max-w-[224px] shrink-0 justify-self-start gap-3'
const PET_MEDIA_FRAME_CLASSNAME = 'overflow-hidden rounded-[16px] border border-slate-300 bg-white'
const PET_MEDIA_PREVIEW_CLASSNAME =
  'flex h-[168px] w-full items-center justify-center overflow-hidden bg-slate-50'
const PET_MEDIA_ACTIONS_CLASSNAME =
  'grid gap-3 rounded-[16px] border border-slate-300 bg-white px-3 py-3'
const PET_MEDIA_PRIMARY_BUTTON_CLASSNAME =
  'inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-900 bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const formatWeight = (value) => (value ? `${value} kg` : 'Sin peso')
const getSpeciesLabel = (value) => SPECIES_LABELS[value] || value || 'Sin especie'
const getSexLabel = (value) => SEX_LABELS[value] || 'Sin especificar'

function PetAvatar({ name, photo, size = 'h-12 w-12' }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={`Foto de ${name}`}
        className={`${size} shrink-0 border border-border object-cover`}
      />
    )
  }

  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center border border-border bg-muted text-sm font-semibold uppercase text-muted-foreground`}
    >
      {String(name || 'P').slice(0, 1)}
    </div>
  )
}

function FieldBlock({ label, hint, children, className = '' }) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs leading-6 text-slate-500">{hint}</span> : null}
    </label>
  )
}

export default function PacientesPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const queryClient = useQueryClient()

  const [buscarMascota, setBuscarMascota] = useState('')
  const [especie, setEspecie] = useState('todas')
  const [paginaMascotas, setPaginaMascotas] = useState(1)
  const [ownerSearch, setOwnerSearch] = useState('')
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [ownerForm, setOwnerForm] = useState(DEFAULT_OWNER_FORM)
  const [petForm, setPetForm] = useState(DEFAULT_PET_FORM)
  const [petPhotoFile, setPetPhotoFile] = useState(null)
  const [petPhotoInputKey, setPetPhotoInputKey] = useState(0)

  const buscarMascotaDiferida = useDeferredValue(buscarMascota.trim())
  const ownerSearchDiferida = useDeferredValue(ownerSearch.trim())
  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'])
  const featureSet = new Set(
    Array.isArray(suscripcion?.funcionalidades) ? suscripcion.funcionalidades : []
  )
  const puedeVerModulo = featureSet.has('mascotas') && featureSet.has('propietarios')
  const puedeCrearTutor = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'auxiliar'])
  const puedeCrearPaciente = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'])

  useEffect(() => {
    document.title = 'Pacientes | Bourgelat'
  }, [])

  const petPhotoPreview = useMemo(() => {
    if (!petPhotoFile) {
      return ''
    }

    return URL.createObjectURL(petPhotoFile)
  }, [petPhotoFile])

  useEffect(() => {
    return () => {
      if (petPhotoPreview) {
        URL.revokeObjectURL(petPhotoPreview)
      }
    }
  }, [petPhotoPreview])

  const mascotasQuery = useQuery({
    queryKey: ['pacientes-mascotas', buscarMascotaDiferida, especie, paginaMascotas],
    queryFn: () =>
      pacientesApi.obtenerMascotas({
        buscar: buscarMascotaDiferida || undefined,
        especie: especie !== 'todas' ? especie : undefined,
        pagina: paginaMascotas,
        limite: 12,
      }),
    enabled: rolPermitido && puedeVerModulo,
    placeholderData: (previousData) => previousData,
  })

  const propietariosResumenQuery = useQuery({
    queryKey: ['pacientes-propietarios-resumen'],
    queryFn: () =>
      pacientesApi.obtenerPropietarios({
        pagina: 1,
        limite: 1,
      }),
    enabled: rolPermitido && puedeVerModulo,
    placeholderData: (previousData) => previousData,
  })

  const propietariosSelectorQuery = useQuery({
    queryKey: ['pacientes-propietarios-selector', ownerSearchDiferida],
    queryFn: () =>
      pacientesApi.obtenerPropietarios({
        buscar: ownerSearchDiferida || undefined,
        pagina: 1,
        limite: 8,
      }),
    enabled: rolPermitido && puedeVerModulo && puedeCrearPaciente,
    placeholderData: (previousData) => previousData,
  })

  const crearPropietarioMutation = useMutation({
    mutationFn: pacientesApi.crearPropietario,
    onSuccess: (data) => {
      const propietario = data?.propietario
      toast.success(data?.message || 'Tutor registrado exitosamente')
      setOwnerForm(DEFAULT_OWNER_FORM)
      if (propietario) {
        setSelectedOwner(propietario)
        setOwnerSearch(propietario.nombre)
        setPetForm((current) => ({ ...current, propietarioId: propietario.id }))
      }
      queryClient.invalidateQueries({ queryKey: ['pacientes-propietarios-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['pacientes-propietarios-selector'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible registrar el tutor.'))
    },
  })

  const crearMascotaMutation = useMutation({
    mutationFn: pacientesApi.crearMascota,
    onSuccess: (data) => {
      toast.success(data?.message || 'Paciente registrado exitosamente')
      setPetPhotoFile(null)
      setPetPhotoInputKey((current) => current + 1)
      setPetForm((current) => ({
        ...DEFAULT_PET_FORM,
        propietarioId: current.propietarioId,
      }))
      queryClient.invalidateQueries({ queryKey: ['pacientes-mascotas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible registrar el paciente.'))
    },
  })

  const subirFotoMascotaMutation = useMutation({
    mutationFn: pacientesApi.subirFotoMascota,
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible cargar la foto del paciente.'))
    },
  })

  const mascotas = useMemo(() => mascotasQuery.data?.mascotas || [], [mascotasQuery.data?.mascotas])
  const propietarios = useMemo(
    () => propietariosSelectorQuery.data?.propietarios || [],
    [propietariosSelectorQuery.data?.propietarios]
  )
  const totalMascotas = mascotasQuery.data?.total || 0
  const totalPropietarios = propietariosResumenQuery.data?.total || 0
  const limiteMascotas = toNumber(suscripcion?.limiteMascotas)
  const historiasDisponibles = featureSet.has('historias')
  const antecedentesDisponibles = featureSet.has('antecedentes')

  const speciesData = useMemo(() => {
    const record = mascotas.reduce((acc, pet) => {
      acc[pet.especie] = (acc[pet.especie] || 0) + 1
      return acc
    }, {})

    return objectToChartData(record, SPECIES_LABELS)
  }, [mascotas])

  const mascotasRows = useMemo(
    () =>
      mascotas.map((mascota) => {
        const fichaInfo =
          historiasDisponibles && antecedentesDisponibles
            ? {
                label: 'Lista para historia y antecedentes',
                tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
              }
            : historiasDisponibles
              ? {
                  label: 'Lista para historia clinica',
                  tone: 'border-cyan-200 bg-cyan-50 text-cyan-700',
                }
              : antecedentesDisponibles
                ? {
                    label: 'Lista para antecedentes',
                    tone: 'border-amber-200 bg-amber-50 text-amber-700',
                  }
                : {
                    label: 'Ficha clinica no incluida',
                    tone: 'border-slate-200 bg-slate-100 text-slate-700',
                  }

        return {
          id: mascota.id,
          paciente: mascota.nombre,
          fotoPerfil: mascota.fotoPerfil || '',
          especie: getSpeciesLabel(mascota.especie),
          tutor: mascota.Propietario?.nombre || 'Sin tutor',
          contacto: mascota.Propietario?.telefono || 'Sin telefono',
          ficha: fichaInfo.label,
          fichaTone: fichaInfo.tone,
          historiasTo: historiasDisponibles
            ? `/historias?mascotaId=${mascota.id}&propietarioId=${mascota.Propietario?.id || ''}`
            : '',
          antecedentesTo: antecedentesDisponibles ? `/antecedentes?mascotaId=${mascota.id}` : '',
          raw: mascota,
        }
      }),
    [antecedentesDisponibles, historiasDisponibles, mascotas]
  )

  const handleCreateOwner = (event) => {
    event.preventDefault()

    const payload = {
      nombre: ownerForm.nombre.trim(),
      tipoDocumento: ownerForm.tipoDocumento,
      numeroDocumento: ownerForm.numeroDocumento.trim(),
      telefono: ownerForm.telefono.replace(/\D/g, ''),
      email: ownerForm.email.trim().toLowerCase(),
      ciudad: ownerForm.ciudad.trim(),
    }

    if (!payload.nombre || !payload.numeroDocumento || !payload.telefono) {
      toast.error('Completa nombre, documento y telefono antes de guardar el tutor.')
      return
    }

    if (payload.telefono.length < 7 || payload.telefono.length > 10) {
      toast.error('Usa un telefono valido entre 7 y 10 digitos.')
      return
    }

    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      toast.error('Ingresa un email valido para el tutor o deja el campo vacio.')
      return
    }

    crearPropietarioMutation.mutate({
      ...payload,
      email: payload.email || undefined,
      ciudad: payload.ciudad || undefined,
    })
  }

  const handleCreatePet = async (event) => {
    event.preventDefault()

    const payload = {
      propietarioId: petForm.propietarioId,
      nombre: petForm.nombre.trim(),
      especie: petForm.especie,
      raza: petForm.raza.trim() || undefined,
      sexo: petForm.sexo,
      peso: petForm.peso ? Number(petForm.peso) : undefined,
      color: petForm.color.trim() || undefined,
      observaciones: petForm.observaciones.trim() || undefined,
      esterilizado: petForm.esterilizado,
    }

    if (!payload.propietarioId) {
      toast.error('Selecciona un tutor antes de registrar el paciente.')
      return
    }

    if (!payload.nombre || !payload.especie) {
      toast.error('Completa al menos nombre y especie del paciente.')
      return
    }

    if (payload.peso !== undefined && (!Number.isFinite(payload.peso) || payload.peso <= 0)) {
      toast.error('Si registras el peso, usa un valor positivo.')
      return
    }

    try {
      if (petPhotoFile) {
        const uploaded = await subirFotoMascotaMutation.mutateAsync(petPhotoFile)
        payload.fotoPerfil = uploaded?.fotoPerfil
      }

      await crearMascotaMutation.mutateAsync(payload)
    } catch {
      return
    }
  }

  const handlePetPhotoChange = (event) => {
    const nextFile = event.target.files?.[0]

    if (!nextFile) {
      setPetPhotoFile(null)
      setPetPhotoInputKey((current) => current + 1)
      return
    }

    if (!ALLOWED_PET_PHOTO_TYPES.includes(nextFile.type)) {
      toast.error('La foto debe estar en formato JPG, PNG o WEBP.')
      event.target.value = ''
      return
    }

    if (nextFile.size > MAX_PET_PHOTO_BYTES) {
      toast.error('La foto supera el maximo permitido de 4 MB.')
      event.target.value = ''
      return
    }

    setPetPhotoFile(nextFile)
  }

  const patientOperationalItems = [
    { label: 'Sexo', value: getSexLabel(petForm.sexo) },
    { label: 'Peso', value: petForm.peso ? `${petForm.peso} kg` : 'Sin registrar' },
    { label: 'Color', value: petForm.color.trim() || 'Sin registrar' },
    { label: 'Condicion', value: petForm.esterilizado ? 'Esterilizado' : 'Sin confirmar' },
  ]
  const patientDisplayName = petForm.nombre.trim() || 'Paciente nuevo'
  const patientSpeciesSummary = `${getSpeciesLabel(petForm.especie)}${
    petForm.raza.trim() ? ` / ${petForm.raza.trim()}` : ''
  }`

  if (!rolPermitido) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <DashboardPanel
            title="Pacientes"
            subtitle="Este modulo se muestra a recepcion, auxiliares, veterinarios o perfiles administrativos."
          >
            <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
              Tu acceso actual no tiene visibilidad sobre la base clinica de pacientes y tutores.
            </div>
          </DashboardPanel>
        </div>
      </div>
    )
  }

  return (
    <AdminShell
      currentKey="pacientes"
      title="Pacientes y tutores"
      description="Consulta y registra tutores y pacientes activos para agenda, antecedentes e historias clinicas."
      headerBadge={
        <StatusPill tone="border-primary/30 bg-primary/10 text-primary">
          Base activa
        </StatusPill>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/agenda"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <CalendarClock className="h-4 w-4" />
            Agenda
          </Link>
          <Link
            to="/antecedentes"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <HeartPulse className="h-4 w-4" />
            Antecedentes
          </Link>
          <Link
            to="/historias"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <FileText className="h-4 w-4" />
            Historias
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      }
      asideNote="La recepcion puede crear tutores y pacientes desde esta pantalla, y el equipo medico usa esta misma base para alimentar agenda e historias clinicas."
    >
      {!puedeVerModulo ? (
        <EmptyModuleState
          title="Pacientes no disponibles en el plan actual"
          body="La base de tutores y pacientes hace parte del flujo esencial del producto. Si este modulo no aparece activo, revisa la configuracion comercial de la clinica."
          ctaLabel="Revisar planes"
        />
      ) : (
        <div className="space-y-5">
          {mascotasQuery.isError || propietariosResumenQuery.isError || propietariosSelectorQuery.isError ? (
            <div className="grid gap-4">
              {mascotasQuery.isError ? (
                <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                  {getErrorMessage(mascotasQuery.error, 'No fue posible cargar la base de pacientes.')}
                </div>
              ) : null}
              {propietariosResumenQuery.isError ? (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  {getErrorMessage(
                    propietariosResumenQuery.error,
                    'No fue posible leer el resumen de tutores.'
                  )}
                </div>
              ) : null}
              {propietariosSelectorQuery.isError ? (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  {getErrorMessage(
                    propietariosSelectorQuery.error,
                    'No fue posible consultar los tutores disponibles.'
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <DashboardPanel
            title="Registro operativo"
            subtitle="Tutor y paciente quedan en un mismo frente de trabajo, con una distribucion mas limpia para laptop y escritorio."
            action={
              <div className="flex flex-wrap gap-2">
                <StatusPill
                  tone={
                    selectedOwner
                      ? 'border-emerald-300 bg-white text-emerald-700'
                      : 'border-amber-300 bg-white text-amber-800'
                  }
                >
                  {selectedOwner ? 'Tutor listo' : 'Falta tutor'}
                </StatusPill>
                <StatusPill tone="border-slate-900 bg-slate-950 text-white">
                  Paciente al frente
                </StatusPill>
              </div>
            }
          >
            <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-5">
              <div className="rounded-[22px] border border-slate-300 bg-[#f6f8fb] p-4 xl:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-slate-950">Tutor responsable</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Busca un tutor existente o crealo rapido sin salir de esta misma zona.
                    </p>
                  </div>
                  <UserRound className="h-5 w-5 shrink-0 text-slate-900" />
                </div>

                {puedeCrearPaciente ? (
                  <div className="mt-5 rounded-[18px] border border-slate-300 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Search className="h-3.5 w-3.5" />
                      Buscar tutor existente
                    </div>

                    <FieldBlock label="Tutor" className="mt-3">
                      <input
                        type="text"
                        value={ownerSearch}
                        onChange={(event) => setOwnerSearch(event.target.value)}
                        placeholder="Nombre, telefono o documento"
                        disabled={Boolean(selectedOwner)}
                        className={`${INPUT_CLASSNAME} disabled:cursor-not-allowed disabled:bg-slate-100`}
                      />
                    </FieldBlock>

                    <div className="mt-4 space-y-3">
                      {selectedOwner ? (
                        <div className="rounded-[18px] border border-slate-300 border-l-[5px] border-l-emerald-600 bg-white px-4 py-4 text-sm text-slate-700">
                          <p className="font-semibold text-slate-950">{selectedOwner.nombre}</p>
                          <p className="mt-2">
                            {selectedOwner.telefono || 'Sin telefono principal'}
                            {selectedOwner.numeroDocumento ? ` / ${selectedOwner.numeroDocumento}` : ''}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOwner(null)
                              setOwnerSearch('')
                              setPetForm((current) => ({ ...current, propietarioId: '' }))
                            }}
                            className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            Cambiar tutor
                          </button>
                        </div>
                      ) : null}

                      {!selectedOwner && !ownerSearch.trim() ? (
                        <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                          Escribe nombre, telefono o documento para encontrar un tutor ya creado. Si no existe,
                          puedes crearlo mas abajo.
                        </div>
                      ) : null}

                      {!selectedOwner && ownerSearch.trim() && propietariosSelectorQuery.isFetching ? (
                        <div className="rounded-[18px] border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                          Buscando tutores...
                        </div>
                      ) : null}

                      {!selectedOwner && ownerSearch.trim() && propietarios.length > 0
                        ? propietarios.map((owner) => (
                            <button
                              key={owner.id}
                              type="button"
                              onClick={() => {
                                setSelectedOwner(owner)
                                setOwnerSearch(owner.nombre)
                                setPetForm((current) => ({ ...current, propietarioId: owner.id }))
                              }}
                              className="flex w-full items-start justify-between gap-3 rounded-[18px] border border-slate-300 bg-slate-50 px-4 py-4 text-left transition hover:border-slate-900 hover:bg-white"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-950">{owner.nombre}</p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {owner.telefono || 'Sin telefono principal'}
                                </p>
                                {owner.numeroDocumento ? (
                                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                                    {owner.tipoDocumento || 'Doc'} {owner.numeroDocumento}
                                  </p>
                                ) : null}
                              </div>
                              <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Seleccionar
                              </span>
                            </button>
                          ))
                        : null}

                      {!selectedOwner &&
                      ownerSearch.trim() &&
                      !propietariosSelectorQuery.isFetching &&
                      propietarios.length === 0 ? (
                        <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                          No encontramos un tutor con esa busqueda. Puedes crearlo en el formulario de abajo.
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[18px] border border-slate-300 bg-white px-4 py-5 text-sm leading-7 text-slate-600">
                    Tu rol actual puede consultar la base, pero no asignar un tutor a un nuevo paciente desde
                    esta vista.
                  </div>
                )}

                <div className="mt-5 border-t border-slate-300 pt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">Alta rapida de tutor</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Deja creado al responsable principal sin abrir otra pantalla.
                      </p>
                    </div>
                    <StatusPill
                      tone={
                        puedeCrearTutor
                          ? 'border-cyan-300 bg-white text-cyan-700'
                          : 'border-slate-300 bg-white text-slate-700'
                      }
                    >
                      {puedeCrearTutor ? 'Disponible' : 'Solo lectura'}
                    </StatusPill>
                  </div>

                  {!puedeCrearTutor ? (
                    <div className="mt-4 rounded-[18px] border border-slate-300 bg-white px-4 py-5 text-sm leading-7 text-slate-600">
                      Tu rol actual puede consultar la base, pero no crear nuevos tutores.
                    </div>
                  ) : (
                    <form className="mt-4 grid gap-4" onSubmit={handleCreateOwner}>
                      <FieldBlock label="Nombre del tutor">
                        <input
                          type="text"
                          value={ownerForm.nombre}
                          onChange={(event) =>
                            setOwnerForm((current) => ({ ...current, nombre: event.target.value }))
                          }
                          placeholder="Nombre completo"
                          className={INPUT_CLASSNAME}
                        />
                      </FieldBlock>

                      <div className="grid gap-4">
                        <FieldBlock label="Tipo de documento">
                          <select
                            value={ownerForm.tipoDocumento}
                            onChange={(event) =>
                              setOwnerForm((current) => ({
                                ...current,
                                tipoDocumento: event.target.value,
                              }))
                            }
                            className={INPUT_CLASSNAME}
                          >
                            {DOCUMENT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </FieldBlock>

                        <FieldBlock label="Numero de documento">
                          <input
                            type="text"
                            value={ownerForm.numeroDocumento}
                            onChange={(event) =>
                              setOwnerForm((current) => ({
                                ...current,
                                numeroDocumento: event.target.value,
                              }))
                            }
                            placeholder="Documento principal"
                            className={INPUT_CLASSNAME}
                          />
                        </FieldBlock>
                      </div>

                      <div className="grid gap-4">
                        <FieldBlock label="Telefono o celular">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={ownerForm.telefono}
                            onChange={(event) =>
                              setOwnerForm((current) => ({
                                ...current,
                                telefono: event.target.value.replace(/\D/g, '').slice(0, 10),
                              }))
                            }
                            placeholder="Numero principal"
                            className={INPUT_CLASSNAME}
                          />
                        </FieldBlock>

                        <FieldBlock label="Email" hint="Opcional">
                          <input
                            type="email"
                            value={ownerForm.email}
                            onChange={(event) =>
                              setOwnerForm((current) => ({ ...current, email: event.target.value }))
                            }
                            placeholder="correo@clinica.com"
                            className={INPUT_CLASSNAME}
                          />
                        </FieldBlock>
                      </div>

                      <FieldBlock label="Ciudad o municipio" hint="Opcional">
                        <input
                          type="text"
                          value={ownerForm.ciudad}
                          onChange={(event) =>
                            setOwnerForm((current) => ({ ...current, ciudad: event.target.value }))
                          }
                          placeholder="Ciudad principal"
                          className={INPUT_CLASSNAME}
                        />
                      </FieldBlock>

                      <button
                        type="submit"
                        disabled={crearPropietarioMutation.isPending}
                        className="border border-slate-900 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {crearPropietarioMutation.isPending ? 'Guardando...' : 'Guardar tutor'}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-300 bg-white p-4 xl:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-slate-950">Registro rapido de paciente</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      El paciente queda al frente para cargar solo lo necesario en recepcion y consulta.
                    </p>
                  </div>
                  <Plus className="h-5 w-5 shrink-0 text-slate-900" />
                </div>

                {!puedeCrearPaciente ? (
                  <div className="mt-5 rounded-[18px] border border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                    Tu rol actual no tiene permisos para crear pacientes.
                  </div>
                ) : (
                  <form className="mt-5 grid gap-5" onSubmit={handleCreatePet}>
                    <div className="grid gap-5">
                      <div className="rounded-[18px] border border-slate-300 bg-[#f6f8fb] p-4">
                        <div className="grid gap-5 lg:grid-cols-[224px_minmax(0,1fr)] lg:items-start">
                          <div className={PET_MEDIA_COLUMN_CLASSNAME}>
                            <div className={PET_MEDIA_FRAME_CLASSNAME}>
                              {petPhotoPreview ? (
                                <div className={PET_MEDIA_PREVIEW_CLASSNAME}>
                                  <img
                                    src={petPhotoPreview}
                                    alt={petForm.nombre ? `Foto de ${petForm.nombre}` : 'Foto del paciente'}
                                    className="h-full w-full object-contain object-center"
                                  />
                                </div>
                              ) : (
                                <div
                                  className={`${PET_MEDIA_PREVIEW_CLASSNAME} flex-col px-5 text-center text-slate-500`}
                                >
                                  <PawPrint className="h-7 w-7 text-slate-900" />
                                  <p className="mt-2 text-sm font-semibold text-slate-950">
                                    Sin foto cargada
                                  </p>
                                  <p className="mt-1.5 text-xs leading-5">
                                    Carga una imagen para identificar al paciente.
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className={PET_MEDIA_ACTIONS_CLASSNAME}>
                              <label
                                htmlFor={`pet-photo-${petPhotoInputKey}`}
                                className={PET_MEDIA_PRIMARY_BUTTON_CLASSNAME}
                              >
                                <Upload className="h-4 w-4" />
                                {petPhotoFile ? 'Cambiar foto' : 'Seleccionar foto'}
                              </label>
                              <input
                                id={`pet-photo-${petPhotoInputKey}`}
                                key={petPhotoInputKey}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handlePetPhotoChange}
                                className="sr-only"
                              />

                              {petPhotoFile ? (
                                <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                  <div className="min-w-0">
                                    <p
                                      className="truncate text-sm font-semibold text-slate-900"
                                      title={petPhotoFile.name}
                                    >
                                      {petPhotoFile.name}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {formatNumber(Math.round(petPhotoFile.size / 1024))} KB
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPetPhotoFile(null)
                                      setPetPhotoInputKey((current) => current + 1)
                                    }}
                                    aria-label="Quitar foto"
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:border-slate-900 hover:text-slate-900"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <p className="text-[11px] leading-4 text-slate-500">
                                  <span className="font-semibold text-slate-700">Formato:</span> JPG, PNG o WEBP{' '}
                                  hasta 4 MB.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 grid content-start gap-4">
                            <div className="rounded-[18px] border border-slate-300 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                              <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                  <StatusPill
                                    tone={
                                      selectedOwner
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                        : 'border-amber-300 bg-amber-50 text-amber-800'
                                    }
                                  >
                                    {selectedOwner ? 'Tutor listo' : 'Tutor pendiente'}
                                  </StatusPill>
                                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                                    Ficha en preparacion
                                  </span>
                                </div>
                                {selectedOwner?.telefono ? (
                                  <span className="text-sm font-medium text-slate-500">
                                    {selectedOwner.telefono}
                                  </span>
                                ) : null}
                              </div>

                              <div className="pt-3">
                                <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))]">
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                      Paciente
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold leading-tight text-slate-950">
                                      {patientDisplayName}
                                    </p>
                                    <span className="mt-2 inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                                      <span className="truncate">{patientSpeciesSummary}</span>
                                    </span>
                                  </div>

                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                      Tutor
                                    </p>
                                    <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                                      {selectedOwner ? selectedOwner.nombre : 'Pendiente de seleccion'}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,124px),1fr))]">
                                  {patientOperationalItems.map((item) => (
                                    <div
                                      key={item.label}
                                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                                    >
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                        {item.label}
                                      </p>
                                      <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-800">
                                        {item.value}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldBlock label="Nombre del paciente">
                            <input
                              type="text"
                              value={petForm.nombre}
                              onChange={(event) =>
                                setPetForm((current) => ({ ...current, nombre: event.target.value }))
                              }
                              placeholder="Nombre del paciente"
                              className={INPUT_CLASSNAME}
                            />
                          </FieldBlock>

                          <FieldBlock label="Especie">
                            <select
                              value={petForm.especie}
                              onChange={(event) =>
                                setPetForm((current) => ({ ...current, especie: event.target.value }))
                              }
                              className={INPUT_CLASSNAME}
                            >
                              {SPECIES_OPTIONS.filter((option) => option.value !== 'todas').map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </FieldBlock>

                          <FieldBlock label="Raza o cruce">
                            <input
                              type="text"
                              value={petForm.raza}
                              onChange={(event) =>
                                setPetForm((current) => ({ ...current, raza: event.target.value }))
                              }
                              placeholder="Raza o cruce"
                              className={INPUT_CLASSNAME}
                            />
                          </FieldBlock>

                          <FieldBlock label="Sexo">
                            <select
                              value={petForm.sexo}
                              onChange={(event) =>
                                setPetForm((current) => ({ ...current, sexo: event.target.value }))
                              }
                              className={INPUT_CLASSNAME}
                            >
                              {SEX_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </FieldBlock>

                          <FieldBlock label="Peso actual (kg)">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={petForm.peso}
                              onChange={(event) =>
                                setPetForm((current) => ({ ...current, peso: event.target.value }))
                              }
                              placeholder="Peso actual"
                              className={INPUT_CLASSNAME}
                            />
                          </FieldBlock>

                          <FieldBlock label="Color principal">
                            <input
                              type="text"
                              value={petForm.color}
                              onChange={(event) =>
                                setPetForm((current) => ({ ...current, color: event.target.value }))
                              }
                              placeholder="Color principal"
                              className={INPUT_CLASSNAME}
                            />
                          </FieldBlock>

                          <div className="rounded-[16px] border border-slate-300 bg-[#f6f8fb] px-4 py-3.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Condicion
                            </p>
                            <label className="mt-3 flex items-center gap-3 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={petForm.esterilizado}
                                onChange={(event) =>
                                  setPetForm((current) => ({
                                    ...current,
                                    esterilizado: event.target.checked,
                                  }))
                                }
                              />
                              Paciente esterilizado
                            </label>
                            <p className="mt-2 text-xs leading-6 text-slate-500">
                              Marca solo si el dato ya fue confirmado.
                            </p>
                          </div>
                        </div>

                        <FieldBlock
                          label="Observaciones utiles"
                          hint="Solo notas que realmente ayuden a recepcion, consulta o seguimiento."
                        >
                          <textarea
                            value={petForm.observaciones}
                            onChange={(event) =>
                              setPetForm((current) => ({
                                ...current,
                                observaciones: event.target.value,
                              }))
                            }
                            placeholder="Notas utiles para recepcion y consulta"
                            className={TEXTAREA_CLASSNAME}
                          />
                        </FieldBlock>

                        <div className="flex flex-col gap-3 border-t border-slate-300 pt-4 lg:flex-row lg:items-center lg:justify-between">
                          <p className="max-w-2xl text-sm leading-6 text-slate-600">
                            Registro pensado para dejar lista la ficha y seguir con agenda o historia sin pasos
                            extra.
                          </p>
                          <button
                            type="submit"
                            disabled={crearMascotaMutation.isPending || subirFotoMascotaMutation.isPending}
                            className="border border-slate-900 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {crearMascotaMutation.isPending || subirFotoMascotaMutation.isPending
                              ? 'Guardando...'
                              : 'Guardar paciente'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </DashboardPanel>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-stretch">
            <div className="grid gap-4 sm:grid-cols-2">
              <KpiCard
                icon={PawPrint}
                label="Pacientes activos"
                value={formatNumber(totalMascotas)}
                helper="Pacientes visibles segun el filtro actual de la base."
                tone="text-cyan-700"
                className="min-h-[188px]"
              />
              <KpiCard
                icon={Users}
                label="Tutores"
                value={formatNumber(totalPropietarios)}
                helper="Total de tutores registrados en la clinica."
                tone="text-emerald-700"
                className="min-h-[188px]"
              />
              <KpiCard
                icon={ShieldCheck}
                label="Cupo del plan"
                value={
                  limiteMascotas === null
                    ? 'Sin limite'
                    : formatNumber(Math.max(limiteMascotas - totalMascotas, 0))
                }
                helper={
                  limiteMascotas === null
                    ? 'La suscripcion actual no tiene tope de pacientes.'
                    : `${formatNumber(totalMascotas)} de ${formatNumber(limiteMascotas)} pacientes en uso.`
                }
                tone="text-violet-700"
                className="min-h-[188px]"
              />
              <KpiCard
                icon={HeartPulse}
                label="Historia clinica"
                value={historiasDisponibles ? 'Activa' : 'No incluida'}
                helper="Define si esta base ya puede pasar directo a evolucion clinica."
                tone={historiasDisponibles ? 'text-rose-700' : 'text-amber-700'}
                className="min-h-[188px]"
              />
            </div>

            <DonutCard
              title="Especies visibles"
              subtitle="Distribucion de la base que estas viendo con el filtro actual."
              data={speciesData}
              centerLabel="Pacientes"
              centerValue={formatNumber(mascotas.length)}
              formatter={formatNumber}
              emptyMessage="Aun no hay especies para mostrar."
              className="h-full"
              contentClassName="content-start gap-4 px-5 py-4"
              chartSize={200}
            />
          </div>

          <div className="space-y-4">
              <DataTable
                title="Base activa de pacientes"
                subtitle="Busqueda rapida de pacientes con tutor, contacto y disponibilidad para ficha clinica."
                rows={mascotasRows}
                columns={[
                  {
                    key: 'paciente',
                    label: 'Paciente',
                    render: (row) => (
                      <div className="flex items-start gap-3">
                        <PetAvatar name={row.paciente} photo={row.fotoPerfil} size="h-12 w-12" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{row.paciente}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {row.especie}
                            {row.raw.raza ? ` / ${row.raw.raza}` : ''}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {row.raw.color || 'Sin color'} / {formatWeight(row.raw.peso)}
                          </p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'tutor',
                    label: 'Tutor',
                    render: (row) => (
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{row.tutor}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.contacto}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'ficha',
                    label: 'Ficha',
                    render: (row) => <StatusPill tone={row.fichaTone}>{row.ficha}</StatusPill>,
                  },
                  {
                    key: 'acciones',
                    label: 'Acciones',
                    render: (row) => (
                      <div className="flex flex-wrap gap-2">
                        {row.historiasTo ? (
                          <Link
                            to={row.historiasTo}
                            className="inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-slate-800"
                          >
                            Historia
                          </Link>
                        ) : null}
                        {row.antecedentesTo ? (
                          <Link
                            to={row.antecedentesTo}
                            className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-50"
                          >
                            Antecedentes
                          </Link>
                        ) : null}
                      </div>
                    ),
                  },
                ]}
                emptyTitle="No hay pacientes para este filtro"
                emptyBody="Ajusta la busqueda o registra el primer paciente desde el panel superior."
                action={
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="text"
                      value={buscarMascota}
                      onChange={(event) => {
                        setBuscarMascota(event.target.value)
                        setPaginaMascotas(1)
                      }}
                      placeholder="Buscar por nombre del paciente"
                      className="h-10 rounded-[18px] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <select
                      value={especie}
                      onChange={(event) => {
                        setEspecie(event.target.value)
                        setPaginaMascotas(1)
                      }}
                      className="h-10 rounded-[18px] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      {SPECIES_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              />

              {(mascotasQuery.data?.paginas || 1) > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
                  <p className="text-sm text-slate-600">
                    Pagina {mascotasQuery.data?.paginaActual || 1} de {mascotasQuery.data?.paginas || 1}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPaginaMascotas((current) => Math.max(current - 1, 1))}
                      disabled={(mascotasQuery.data?.paginaActual || 1) <= 1}
                      className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPaginaMascotas((current) =>
                          Math.min(current + 1, mascotasQuery.data?.paginas || 1)
                        )
                      }
                      disabled={(mascotasQuery.data?.paginaActual || 1) >= (mascotasQuery.data?.paginas || 1)}
                      className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ) : null}
          </div>
        </div>
      )}
    </AdminShell>
  )
}
