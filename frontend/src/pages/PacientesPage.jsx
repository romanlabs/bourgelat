import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { HeartPulse, PawPrint, Plus, Search, ShieldCheck, UserRound, Users } from 'lucide-react'
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
  fechaNacimiento: '',
  peso: '',
  color: '',
  microchip: '',
  observaciones: '',
  fotoPerfil: '',
  esterilizado: false,
}

const MAX_PET_PHOTO_BYTES = 4 * 1024 * 1024
const ALLOWED_PET_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const formatWeight = (value) => (value ? `${value} kg` : 'Sin peso')

const getSpeciesLabel = (value) => SPECIES_LABELS[value] || value || 'Sin especie'
const isHttpUrl = (value) => /^https?:\/\/.+/i.test(value)

function PetAvatar({ name, photo, size = 'h-12 w-12' }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={`Foto de ${name}`}
        className={`${size} shrink-0 border border-slate-200 object-cover`}
      />
    )
  }

  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center border border-slate-200 bg-slate-100 text-sm font-semibold uppercase text-slate-600`}
    >
      {String(name || 'P').slice(0, 1)}
    </div>
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
  const speciesData = useMemo(() => {
    const record = mascotas.reduce((acc, pet) => {
      acc[pet.especie] = (acc[pet.especie] || 0) + 1
      return acc
    }, {})
    return objectToChartData(record, SPECIES_LABELS)
  }, [mascotas])

  const mascotasRows = useMemo(
    () =>
      mascotas.map((mascota) => ({
        id: mascota.id,
        paciente: mascota.nombre,
        fotoPerfil: mascota.fotoPerfil || '',
        especie: getSpeciesLabel(mascota.especie),
        tutor: mascota.Propietario?.nombre || 'Sin tutor',
        contacto: mascota.Propietario?.telefono || 'Sin telefono',
        ficha: historiasDisponibles ? 'Lista para historia clinica' : 'Historia no incluida',
        raw: mascota,
      })),
    [historiasDisponibles, mascotas]
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
      fechaNacimiento: petForm.fechaNacimiento || undefined,
      peso: petForm.peso ? Number(petForm.peso) : undefined,
      color: petForm.color.trim() || undefined,
      microchip: petForm.microchip.trim() || undefined,
      observaciones: petForm.observaciones.trim() || undefined,
      fotoPerfil: petForm.fotoPerfil.trim() || undefined,
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

    if (payload.fechaNacimiento && payload.fechaNacimiento > new Date().toISOString().slice(0, 10)) {
      toast.error('La fecha de nacimiento no puede estar en el futuro.')
      return
    }

    if (payload.peso !== undefined && (!Number.isFinite(payload.peso) || payload.peso <= 0)) {
      toast.error('Si registras el peso, usa un valor positivo.')
      return
    }

    if (payload.fotoPerfil && !isHttpUrl(payload.fotoPerfil)) {
      toast.error('La foto del paciente debe usar una URL publica que empiece por http:// o https://.')
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
    setPetForm((current) => ({ ...current, fotoPerfil: '' }))
  }

  if (!rolPermitido) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <DashboardPanel
            title="Pacientes"
            subtitle="Este modulo se muestra a recepcion, auxiliares, veterinarios o perfiles administrativos."
          >
            <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
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
      description="Base clinica para recepcion, consulta y preparacion de historia. Aqui se registran tutores, pacientes activos y los datos minimos que realmente sirven en operacion."
      headerBadge={
        <StatusPill tone="border-cyan-200 bg-cyan-50 text-cyan-700">
          Base clinica activa
        </StatusPill>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            to="/agenda"
            className="inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Abrir agenda
          </Link>
          <Link
            to="/antecedentes"
            className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir antecedentes
          </Link>
          <Link
            to="/historias"
            className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir historias
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Volver al dashboard
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
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-4">
            <KpiCard
              icon={PawPrint}
              label="Pacientes activos"
              value={formatNumber(totalMascotas)}
              helper="Pacientes visibles segun el filtro actual de la base."
              tone="text-cyan-700"
            />
            <KpiCard
              icon={Users}
              label="Tutores"
              value={formatNumber(totalPropietarios)}
              helper="Total de tutores registrados en la clinica."
              tone="text-emerald-700"
            />
            <KpiCard
              icon={ShieldCheck}
              label="Cupo del plan"
              value={limiteMascotas === null ? 'Sin limite' : formatNumber(Math.max(limiteMascotas - totalMascotas, 0))}
              helper={
                limiteMascotas === null
                  ? 'La suscripcion actual no tiene tope de pacientes.'
                  : `${formatNumber(totalMascotas)} de ${formatNumber(limiteMascotas)} pacientes en uso.`
              }
              tone="text-violet-700"
            />
            <KpiCard
              icon={HeartPulse}
              label="Historia clinica"
              value={historiasDisponibles ? 'Activa' : 'No incluida'}
              helper="Define si esta base ya puede pasar directo a evolucion clinica."
              tone={historiasDisponibles ? 'text-rose-700' : 'text-amber-700'}
            />
          </div>

          <div className="grid gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
            <DonutCard
              title="Especies visibles"
              subtitle="Distribucion de la base que estas viendo con el filtro actual."
              data={speciesData}
              centerLabel="Pacientes"
              centerValue={formatNumber(mascotas.length)}
              formatter={formatNumber}
              emptyMessage="Aun no hay especies para mostrar."
            />

            <DashboardPanel
              title="Base activa de pacientes"
              subtitle="Busqueda rapida de pacientes con tutor, contacto y disponibilidad para ficha clinica."
              action={
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={buscarMascota}
                    onChange={(event) => {
                      setBuscarMascota(event.target.value)
                      setPaginaMascotas(1)
                    }}
                    placeholder="Buscar por nombre o microchip"
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <select
                    value={especie}
                    onChange={(event) => {
                      setEspecie(event.target.value)
                      setPaginaMascotas(1)
                    }}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  >
                    {SPECIES_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              <DataTable
                title="Pacientes"
                subtitle="Base lista para recepcion, agenda y consulta."
                rows={mascotasRows}
                columns={[
                  {
                    key: 'paciente',
                    label: 'Paciente',
                    render: (row) => (
                      <div className="flex items-center gap-3">
                        <PetAvatar name={row.paciente} photo={row.fotoPerfil} size="h-11 w-11" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{row.paciente}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.raw.raza || 'Sin raza'}</p>
                        </div>
                      </div>
                    ),
                  },
                  { key: 'especie', label: 'Especie' },
                  { key: 'tutor', label: 'Tutor' },
                  { key: 'contacto', label: 'Contacto' },
                  { key: 'ficha', label: 'Ficha' },
                  {
                    key: 'detalle',
                    label: 'Detalle',
                    render: (row) => (
                      <div className="text-xs leading-6 text-slate-500">
                        {row.raw.raza || 'Sin raza'}
                        {' · '}
                        {formatWeight(row.raw.peso)}
                      </div>
                    ),
                  },
                ]}
                emptyTitle="No hay pacientes para este filtro"
                emptyBody="Ajusta la busqueda o registra el primer paciente desde el panel inferior."
                action={
                  <StatusPill tone="border-slate-200 bg-slate-100 text-slate-700">
                    {SPECIES_OPTIONS.find((option) => option.value === especie)?.label}
                  </StatusPill>
                }
              />

              {(mascotasQuery.data?.paginas || 1) > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-600">
                    Pagina {mascotasQuery.data?.paginaActual || 1} de {mascotasQuery.data?.paginas || 1}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPaginaMascotas((current) => Math.max(current - 1, 1))}
                      disabled={(mascotasQuery.data?.paginaActual || 1) <= 1}
                      className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ) : null}
            </DashboardPanel>
          </div>

          <div className="grid gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
            <DashboardPanel
              title="Registrar tutor"
              subtitle="Alta rapida del responsable principal antes de abrir la ficha del paciente."
              action={<UserRound className="h-4 w-4 text-cyan-700" />}
            >
              {!puedeCrearTutor ? (
                <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                  Tu rol actual puede consultar la base, pero no crear nuevos tutores.
                </div>
              ) : (
                <form className="grid gap-4" onSubmit={handleCreateOwner}>
                  <input
                    type="text"
                    value={ownerForm.nombre}
                    onChange={(event) => setOwnerForm((current) => ({ ...current, nombre: event.target.value }))}
                    placeholder="Nombre completo del tutor"
                    className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <select
                      value={ownerForm.tipoDocumento}
                      onChange={(event) =>
                        setOwnerForm((current) => ({ ...current, tipoDocumento: event.target.value }))
                      }
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      {DOCUMENT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={ownerForm.numeroDocumento}
                      onChange={(event) =>
                        setOwnerForm((current) => ({ ...current, numeroDocumento: event.target.value }))
                      }
                      placeholder="Documento principal"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                      placeholder="Telefono o celular"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="email"
                      value={ownerForm.email}
                      onChange={(event) => setOwnerForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="Email del tutor"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={ownerForm.ciudad}
                    onChange={(event) => setOwnerForm((current) => ({ ...current, ciudad: event.target.value }))}
                    placeholder="Ciudad o municipio"
                    className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={crearPropietarioMutation.isPending}
                    className="border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {crearPropietarioMutation.isPending ? 'Guardando...' : 'Guardar tutor'}
                  </button>
                </form>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="Registrar paciente"
              subtitle="Selecciona un tutor existente y completa solo los datos que ayudan de verdad a recepcion y consulta."
              action={<Plus className="h-4 w-4 text-cyan-700" />}
            >
              {!puedeCrearPaciente ? (
                <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                  Tu rol actual no tiene permisos para crear pacientes.
                </div>
              ) : (
                <form className="grid gap-4" onSubmit={handleCreatePet}>
                  <div className="border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Search className="h-3.5 w-3.5" />
                      Buscar tutor existente
                    </div>
                    <input
                      type="text"
                      value={ownerSearch}
                      onChange={(event) => setOwnerSearch(event.target.value)}
                      placeholder="Nombre, telefono o documento"
                      className="mt-3 h-11 w-full border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />

                    <div className="mt-4 space-y-2">
                      {selectedOwner ? (
                        <div className="border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-slate-700">
                          <p className="font-semibold text-slate-950">{selectedOwner.nombre}</p>
                          <p className="mt-1">{selectedOwner.telefono || 'Sin telefono principal'}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOwner(null)
                              setPetForm((current) => ({ ...current, propietarioId: '' }))
                            }}
                            className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            Cambiar tutor
                          </button>
                        </div>
                      ) : null}

                      {!selectedOwner && propietarios.length > 0
                          ? propietarios.map((owner) => (
                            <button
                              key={owner.id}
                              type="button"
                              onClick={() => {
                                setSelectedOwner(owner)
                                setPetForm((current) => ({ ...current, propietarioId: owner.id }))
                              }}
                              className="flex w-full items-start justify-between border border-slate-200 bg-white px-3 py-3 text-left transition hover:bg-slate-50"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-950">{owner.nombre}</p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {owner.telefono || 'Sin telefono principal'}
                                </p>
                              </div>
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Seleccionar
                              </span>
                            </button>
                          ))
                        : null}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="text"
                      value={petForm.nombre}
                      onChange={(event) => setPetForm((current) => ({ ...current, nombre: event.target.value }))}
                      placeholder="Nombre del paciente"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <select
                      value={petForm.especie}
                      onChange={(event) => setPetForm((current) => ({ ...current, especie: event.target.value }))}
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      {SPECIES_OPTIONS.filter((option) => option.value !== 'todas').map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="text"
                      value={petForm.raza}
                      onChange={(event) => setPetForm((current) => ({ ...current, raza: event.target.value }))}
                      placeholder="Raza o cruce"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <select
                      value={petForm.sexo}
                      onChange={(event) => setPetForm((current) => ({ ...current, sexo: event.target.value }))}
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      {SEX_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="date"
                      value={petForm.fechaNacimiento}
                      onChange={(event) =>
                        setPetForm((current) => ({ ...current, fechaNacimiento: event.target.value }))
                      }
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={petForm.peso}
                      onChange={(event) => setPetForm((current) => ({ ...current, peso: event.target.value }))}
                      placeholder="Peso actual en kg"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="text"
                      value={petForm.color}
                      onChange={(event) => setPetForm((current) => ({ ...current, color: event.target.value }))}
                      placeholder="Color principal"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      value={petForm.microchip}
                      onChange={(event) =>
                        setPetForm((current) => ({ ...current, microchip: event.target.value }))
                      }
                      placeholder="Numero de microchip"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_120px]">
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <input
                          key={petPhotoInputKey}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePetPhotoChange}
                          className="block w-full border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 file:mr-3 file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                        />
                        <p className="text-xs leading-6 text-slate-500">
                          Aceptamos JPG, PNG o WEBP hasta 4 MB. Sirve una foto descargada desde WhatsApp Web o una imagen tomada y guardada desde el celular.
                        </p>
                        {petPhotoFile ? (
                          <div className="flex flex-wrap items-center gap-3 border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                            <span className="font-medium text-slate-900">{petPhotoFile.name}</span>
                            <span>{formatNumber(Math.round(petPhotoFile.size / 1024))} KB</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPetPhotoFile(null)
                                setPetPhotoInputKey((current) => current + 1)
                              }}
                              className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                            >
                              Quitar foto
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div className="grid gap-2">
                        <input
                          type="text"
                          value={petForm.fotoPerfil}
                          onChange={(event) =>
                            setPetForm((current) => ({ ...current, fotoPerfil: event.target.value }))
                          }
                          placeholder="O pega una URL publica si ya la tienes"
                          className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                        />
                        <p className="text-xs leading-6 text-slate-500">
                          La URL publica sigue disponible como opcion avanzada, pero el camino recomendado es subir el archivo.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start justify-center xl:justify-end">
                      <PetAvatar
                        name={petForm.nombre || 'Paciente'}
                        photo={
                          petPhotoPreview ||
                          (petForm.fotoPerfil && isHttpUrl(petForm.fotoPerfil) ? petForm.fotoPerfil : '')
                        }
                        size="h-[88px] w-[88px]"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={petForm.esterilizado}
                      onChange={(event) =>
                        setPetForm((current) => ({ ...current, esterilizado: event.target.checked }))
                      }
                    />
                    Paciente esterilizado
                  </label>

                  <textarea
                    value={petForm.observaciones}
                    onChange={(event) =>
                      setPetForm((current) => ({ ...current, observaciones: event.target.value }))
                    }
                    placeholder="Notas utiles para recepcion y consulta"
                    className="min-h-[120px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />

                  {!selectedOwner && ownerSearch.trim() && propietarios.length === 0 ? (
                    <div className="border border-dashed border-slate-300 bg-white px-3 py-3 text-sm leading-7 text-slate-600">
                      No encontramos un tutor con esa busqueda. Puedes crearlo desde el panel izquierdo.
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={crearMascotaMutation.isPending || subirFotoMascotaMutation.isPending}
                    className="border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {crearMascotaMutation.isPending || subirFotoMascotaMutation.isPending
                      ? 'Guardando...'
                      : 'Guardar paciente'}
                  </button>
                </form>
              )}
            </DashboardPanel>
          </div>

          <DashboardPanel
            title="Criterio operativo"
            subtitle="Lo importante en esta pantalla es dejar una base limpia y util para el resto del sistema."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                Primero se registra el tutor responsable y luego el paciente, para que agenda, historias y cobro compartan la misma base.
              </div>
              <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                Los campos visibles son los que mas ayudan en recepcion y consulta: identificacion, contacto, especie, peso y observaciones utiles.
              </div>
              <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                El cupo del plan ya se refleja aqui, asi que la clinica puede saber cuando necesita ordenar la base o subir de nivel.
              </div>
            </div>
          </DashboardPanel>
        </div>
      )}
    </AdminShell>
  )
}
