import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidarDominios } from '@/lib/queryKeys'
import { toast } from 'sonner'
import {
  Camera, ChevronLeft, HeartPulse, Loader2, Mail, PawPrint, Phone, Plus, Scissors, Search,
} from 'lucide-react'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { antecedentesApi } from '@/features/antecedentes/antecedentesApi'
import { PesoEnElTiempo, VacunasYDesparasitacion } from '@/features/pacientes/FichaSalud'
import { formatoNumero, medicionesDe } from '@/features/pacientes/fichaSaludUtils'
import { useAdminSearch } from '@/components/layout/HeaderSlotContext'
import { useSoloLectura } from '@/lib/useSoloLectura'
import { mensajeDeError } from '@/lib/errores'
import { historiasApi } from '@/features/historias/historiasApi'
import { agendaApi } from '@/features/agenda/agendaApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import HistoriaClinicaFormDrawer from '@/features/historias/HistoriaClinicaFormDrawer'
import HistoriaClinicaTimeline from '@/features/historias/HistoriaClinicaTimeline'
import { useImprimirFormula, useImprimirHistoria } from '@/features/historias/useImprimirFormula'
import { formatNumeroHistoria } from '@/features/historias/historiaPdfComun'
import EstilosTimeline from '@/features/estilos/EstilosTimeline'
import ExamenesLaboratorioSection from '@/features/examenesLaboratorio/ExamenesLaboratorioSection'
import RegistroEstiloFormDrawer from '@/features/estilos/RegistroEstiloFormDrawer'
import { useEstilosMascota } from '@/features/estilos/useEstilos'
import { SkeletonBlock } from '@/components/shared/SkeletonBlock'
import { etiquetaEspecie } from '@/lib/especies'
import { formatearEdad } from '@/lib/utils'
import AdminShell from '@/components/layout/AdminShell'
import { formatearCelular } from '@/lib/celular'

const TABS = [
  { id: 'historia', label: 'Consultas', titulo: 'Historia clínica' },
  { id: 'examenes', label: 'Exámenes', titulo: 'Exámenes de laboratorio' },
  { id: 'estilos', label: 'Estilos', titulo: 'Servicios de estilos' },
]

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const MAX_FOTO_BYTES = 4 * 1024 * 1024
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']

// Buscador global junto a «Volver»: va dentro del shell para leer su contexto.
function BotonBuscar() {
  const abrirBusqueda = useAdminSearch()
  if (!abrirBusqueda) return null
  return (
    <button
      type="button"
      onClick={abrirBusqueda}
      aria-label="Buscar"
      className={`hidden h-10 w-64 items-center gap-2.5 rounded-lg bg-card px-3 text-sm text-muted-foreground transition hover:text-foreground lg:flex ${FOCO}`}
    >
      <Search className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 truncate whitespace-nowrap text-left">Buscar paciente o tutor</span>
      <kbd className="rounded-md bg-muted px-1.5 py-0.5 font-sans text-xs font-semibold text-muted-foreground">Ctrl K</kbd>
    </button>
  )
}

function PatientHeaderSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card lg:flex-row">
      <SkeletonBlock className="h-[250px] rounded-none lg:h-[380px] lg:w-[42%] lg:max-w-[460px]" />
      <div className="flex-1 space-y-4 p-9">
        <SkeletonBlock className="h-16 w-64" />
        <SkeletonBlock className="h-4 w-80" />
        <SkeletonBlock className="h-4 w-56" />
      </div>
    </div>
  )
}

export default function PacienteHistorialPage() {
  const { mascotaId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const usuario = useAuthStore((s) => s.usuario)
  // Todos los planes incluyen historias y antecedentes.
  const tieneHistorias = true
  const tieneAntecedentes = true
  const puedeEditarHistorias = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])
  // Mismo criterio de roles que Agenda/backend para el modulo de estilos.
  const puedeEditarEstilos = hasAnyRole(usuario, [
    'admin', 'superadmin', 'veterinario', 'recepcionista', 'auxiliar',
  ])

  const citaIdParam = searchParams.get('citaId') || ''
  // La bandeja de /historias entra aqui con ?historiaId= para abrir una
  // consulta concreta sin obligar a buscarla en el timeline.
  const historiaIdParam = searchParams.get('historiaId') || ''

  const [activeTab, setActiveTab] = useState('historia')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [historiaToEdit, setHistoriaToEdit] = useState(null)
  const [estiloDrawerOpen, setEstiloDrawerOpen] = useState(false)
  const [registroEstiloToEdit, setRegistroEstiloToEdit] = useState(null)

  const citaQuery = useQuery({
    queryKey: ['cita-detalle', citaIdParam],
    queryFn: () => agendaApi.obtenerCita(citaIdParam),
    enabled: Boolean(citaIdParam),
    retry: 1,
  })

  // Si la consulta de la cita falla, no queremos dejar al usuario sin nada:
  // se restaura el comportamiento previo a este módulo (abrir historia
  // clínica) una sola vez por citaId, no en cada re-render.
  const citaFallbackFiredRef = useRef(false)
  useEffect(() => {
    citaFallbackFiredRef.current = false
  }, [citaIdParam])

  // La agenda navega aqui con ?citaId= al atender una cita. Una cita de
  // peluqueria abre Estilos; cualquier otra, la historia clinica.
  useEffect(() => {
    if (!citaIdParam) return

    if (citaQuery.isError) {
      if (citaFallbackFiredRef.current) return
      citaFallbackFiredRef.current = true

      toast.error(
        'No pudimos cargar los datos de la cita. Abrimos la historia clínica; si era un servicio de estilos, cámbiate a esa pestaña.'
      )

      if (tieneHistorias && puedeEditarHistorias) {
        setActiveTab('historia')
        setHistoriaToEdit(null)
        setDrawerOpen(true)
      }
      return
    }

    const tipoCita = citaQuery.data?.cita?.tipoCita
    if (!tipoCita) return

    if (tipoCita === 'peluqueria') {
      setActiveTab('estilos')
      setRegistroEstiloToEdit(null)
      setEstiloDrawerOpen(true)
    } else if (tieneHistorias && puedeEditarHistorias) {
      setActiveTab('historia')
      setHistoriaToEdit(null)
      setDrawerOpen(true)
    }
  }, [citaIdParam, citaQuery.data, citaQuery.isError, tieneHistorias, puedeEditarHistorias])

  useEffect(() => {
    document.title = 'Historial clínico | Bourgelat'
  }, [])

  const mascotaQuery = useQuery({
    queryKey: ['paciente-perfil', mascotaId],
    queryFn: () => pacientesApi.obtenerMascota(mascotaId),
    enabled: Boolean(mascotaId),
  })

  const historiasQuery = useQuery({
    queryKey: ['paciente-historial', mascotaId],
    queryFn: () => historiasApi.obtenerHistoriasMascota(mascotaId),
    enabled: Boolean(mascotaId) && tieneHistorias,
  })

  const { registrosQuery, registros } = useEstilosMascota({ mascotaId })

  const antecedentesQuery = useQuery({
    queryKey: ['antecedentes-detalle', mascotaId],
    queryFn: () => antecedentesApi.obtenerAntecedentes(mascotaId),
    enabled: Boolean(mascotaId) && tieneAntecedentes,
  })
  const antecedentes = antecedentesQuery.data?.antecedentes

  const { propsAccion } = useSoloLectura()
  const puedeCambiarFoto = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'])
  const fotoInputRef = useRef(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  const mascota = mascotaQuery.data?.mascota
  const historias = historiasQuery.data?.historias || []

  const handleCambiarFoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!TIPOS_FOTO.includes(file.type)) {
      toast.error('La foto debe estar en formato JPG, PNG o WEBP.')
      return
    }
    if (file.size > MAX_FOTO_BYTES) {
      toast.error('La foto supera el máximo permitido de 4 MB.')
      return
    }
    setSubiendoFoto(true)
    try {
      const { fotoPerfil } = await pacientesApi.subirFotoMascota(file)
      await pacientesApi.editarMascota(mascotaId, { fotoPerfil })
      invalidarDominios(queryClient, 'pacientes')
      toast.success('Foto actualizada.')
    } catch (error) {
      toast.error(mensajeDeError(error, 'No fue posible cambiar la foto.'))
    } finally {
      setSubiendoFoto(false)
    }
  }

  // Igual que con citaId: una sola apertura por historiaId, para que cerrar el
  // drawer no lo vuelva a abrir en el siguiente render.
  const historiaDeepLinkFiredRef = useRef(false)
  useEffect(() => {
    historiaDeepLinkFiredRef.current = false
  }, [historiaIdParam])

  useEffect(() => {
    if (!historiaIdParam || historiaDeepLinkFiredRef.current) return
    if (historiasQuery.isPending) return

    const historia = (historiasQuery.data?.historias || []).find((h) => h.id === historiaIdParam)
    historiaDeepLinkFiredRef.current = true

    if (!historia) {
      toast.error('No encontramos esa consulta en el historial de este paciente.')
      setSearchParams({}, { replace: true })
      return
    }

    setActiveTab('historia')
    setHistoriaToEdit(historia)
    setDrawerOpen(true)
  }, [historiaIdParam, historiasQuery.data, historiasQuery.isPending, setSearchParams])

  const handleNuevaConsulta = () => {
    setHistoriaToEdit(null)
    setDrawerOpen(true)
  }

  const handleNuevoRegistroEstilo = () => {
    setRegistroEstiloToEdit(null)
    setEstiloDrawerOpen(true)
  }

  const handleEditHistoria = (historia) => {
    setHistoriaToEdit(historia)
    setDrawerOpen(true)
  }

  const imprimirFormula = useImprimirFormula()
  const imprimirHistoria = useImprimirHistoria()

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setHistoriaToEdit(null)
    // Limpiar citaId/historiaId de la URL para evitar que se re-abra al recargar
    if (citaIdParam || historiaIdParam) setSearchParams({})
  }

  const handleDrawerSuccess = () => {
    invalidarDominios(queryClient, 'historias')
    // Solo cerrar al crear nueva historia; al editar/bloquear se deja el drawer abierto
    if (!historiaToEdit) {
      setDrawerOpen(false)
      if (citaIdParam || historiaIdParam) setSearchParams({})
    }
  }

  const handleEstiloDrawerClose = () => {
    setEstiloDrawerOpen(false)
    setRegistroEstiloToEdit(null)
    if (citaIdParam) setSearchParams({})
  }

  const handleEstiloDrawerSuccess = () => {
    setEstiloDrawerOpen(false)
    setRegistroEstiloToEdit(null)
    if (citaIdParam) setSearchParams({})
  }

  // Construir el objeto mascota en el formato que espera el drawer
  const mascotaParaDrawer = mascota
    ? {
        ...mascota,
        Propietario: mascota.Propietario || null,
      }
    : null

  const sexoTexto =
    mascota?.sexo === 'macho' ? 'macho' : mascota?.sexo === 'hembra' ? 'hembra' : ''
  const edadTexto = formatearEdad(mascota?.fechaNacimiento)
  const numeroHistoria = formatNumeroHistoria(mascota?.numeroHistoria)
  const subtitulo = mascota
    ? [
        mascota.raza || etiquetaEspecie(mascota.especie),
        [sexoTexto, mascota.esterilizado ? (mascota.sexo === 'hembra' ? 'esterilizada' : 'esterilizado') : '']
          .filter(Boolean)
          .join(' '),
        edadTexto,
        mascota.Propietario?.nombre ? `tutor ${mascota.Propietario.nombre}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : ''
  // Peso y temperatura de la consulta más reciente que los tenga; el peso cae
  // al registrado en el paciente si ninguna consulta lo trae.
  const ultimoPeso = medicionesDe(historias, 'peso').at(-1)?.valor ?? (Number(mascota?.peso) || null)
  const ultimaTemperatura = medicionesDe(historias, 'temperatura').at(-1)?.valor ?? null
  const alergias = (antecedentes?.alergias || [])
    .map((alergia) => alergia.descripcion || alergia.tipo)
    .filter(Boolean)
  const datosClave = mascota
    ? [
        { label: 'Peso', value: ultimoPeso ? `${formatoNumero(ultimoPeso, 2)} kg` : '—' },
        { label: 'Temperatura', value: ultimaTemperatura ? `${formatoNumero(ultimaTemperatura)} °C` : '—' },
        {
          label: 'Alergias',
          value: antecedentesQuery.isPending ? '…' : alergias.length ? alergias.join(', ') : 'Ninguna',
          alerta: alergias.length > 0,
        },
        { label: 'Historia N.º', value: numeroHistoria || 'Sin número' },
      ]
    : []
  const puedeEditarExamenes = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario', 'auxiliar', 'recepcionista'])
  const puedeEliminarExamenes = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])

  return (
    <AdminShell
      currentKey="pacientes"
      title={mascota?.nombre ? `Historial de ${mascota.nombre}` : 'Historial clínico'}
      hidePageHeader
      hideSearch
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3 lg:pt-6">
          <Link
            to="/pacientes"
            className={`inline-flex min-h-8 items-center gap-1.5 rounded text-sm font-medium text-muted-foreground transition hover:text-foreground ${FOCO}`}
          >
            <ChevronLeft className="h-4 w-4" />
            Volver a pacientes
          </Link>
          <BotonBuscar />
        </div>

        {/* Encabezado del paciente: foto grande y datos clave */}
        {mascotaQuery.isPending && <PatientHeaderSkeleton />}
        {mascotaQuery.isError && (
          <div className="rounded-2xl bg-danger-soft px-5 py-4 text-sm text-danger">
            No fue posible cargar los datos del paciente.
          </div>
        )}
        {mascota && (
          <section
            aria-labelledby="ficha-nombre"
            className="flex flex-col overflow-hidden rounded-2xl bg-primary text-primary-foreground lg:flex-row"
          >
            <div
              role="img"
              aria-label={`Foto de ${mascota.nombre}`}
              className="relative flex h-[250px] shrink-0 items-center justify-center overflow-hidden bg-brand-muted sm:h-[320px] lg:h-auto lg:min-h-[380px] lg:w-[42%] lg:max-w-[460px]"
            >
              {mascota.fotoPerfil ? (
                <img src={mascota.fotoPerfil} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <PawPrint className="h-40 w-40 text-brand-foreground/25" strokeWidth={1.4} />
              )}
              {puedeCambiarFoto ? (
                <>
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCambiarFoto}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    disabled={subiendoFoto || propsAccion.disabled}
                    title={propsAccion.title}
                    className={`absolute bottom-4 left-4 inline-flex h-10 items-center gap-2 rounded-lg bg-card px-4 text-sm font-semibold text-foreground transition hover:brightness-95 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 ${FOCO}`}
                  >
                    {subiendoFoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {subiendoFoto ? 'Subiendo…' : mascota.fotoPerfil ? 'Cambiar foto' : 'Agregar foto'}
                  </button>
                </>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 px-5 py-6 sm:px-9 sm:py-7">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="min-w-0">
                  <h1
                    id="ficha-nombre"
                    className="text-5xl font-semibold leading-[0.95] tracking-[-0.05em] [overflow-wrap:anywhere] sm:text-[64px]"
                  >
                    {mascota.nombre}
                  </h1>
                  {subtitulo ? <p className="mt-2 text-base opacity-85">{subtitulo}</p> : null}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {tieneHistorias && puedeEditarHistorias && (
                    <button
                      type="button"
                      onClick={handleNuevaConsulta}
                      className={`inline-flex h-[46px] items-center gap-2 rounded-lg bg-primary-foreground px-5 text-sm font-semibold text-primary transition hover:brightness-95 active:translate-y-px ${FOCO}`}
                    >
                      <Plus className="h-4 w-4" />
                      Nueva consulta
                    </button>
                  )}
                  {activeTab === 'estilos' && puedeEditarEstilos && (
                    <button
                      type="button"
                      onClick={handleNuevoRegistroEstilo}
                      className={`inline-flex h-[46px] items-center gap-2 rounded-lg bg-primary-foreground/15 px-[18px] text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/25 active:translate-y-px ${FOCO}`}
                    >
                      <Scissors className="h-4 w-4" />
                      Nuevo servicio de estilos
                    </button>
                  )}
                  {tieneAntecedentes && (
                    <button
                      type="button"
                      onClick={() => navigate(`/antecedentes?mascotaId=${mascotaId}`)}
                      className={`inline-flex h-[46px] items-center gap-2 rounded-lg bg-primary-foreground/15 px-[18px] text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/25 active:translate-y-px ${FOCO}`}
                    >
                      <HeartPulse className="h-4 w-4" />
                      Antecedentes
                    </button>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-4 border-t border-primary-foreground/15 pt-5 sm:grid-cols-4">
                {datosClave.map((dato) => (
                  <div key={dato.label} className="min-w-0">
                    <dt className="text-[13px] opacity-80">{dato.label}</dt>
                    <dd
                      title={dato.value}
                      className={`mt-1 font-semibold tabular-nums ${dato.alerta ? 'line-clamp-2 text-base leading-snug text-brand' : 'truncate text-[19px]'}`}
                    >
                      {dato.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Historia, estilos y exámenes */}
          <section aria-labelledby="ficha-secciones" className="min-w-0 rounded-2xl bg-card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 id="ficha-secciones" className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
                  {TABS.find((tab) => tab.id === activeTab)?.titulo}
                </h2>
                {activeTab === 'historia' && !historiasQuery.isPending ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {historias.length === 0
                      ? 'Sin consultas registradas'
                      : `${historias.length} consulta${historias.length !== 1 ? 's' : ''} registrada${historias.length !== 1 ? 's' : ''}`}
                  </p>
                ) : null}
              </div>
              <div role="tablist" aria-label="Secciones de la ficha" className="flex flex-wrap gap-1 rounded-[10px] bg-muted p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`h-9 rounded-[7px] px-3.5 text-[13px] transition ${FOCO} ${
                      activeTab === tab.id
                        ? 'bg-card font-semibold text-foreground'
                        : 'font-medium text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'historia' && (
              <>
                {historiasQuery.isError && (
                  <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">No fue posible cargar el historial clínico.</p>
                )}

                {!historiasQuery.isError && (
                  <HistoriaClinicaTimeline
                    historias={historias}
                    isPending={historiasQuery.isPending}
                    onNuevaConsulta={handleNuevaConsulta}
                    onEditHistoria={handleEditHistoria}
                    onImprimirFormula={imprimirFormula.imprimir}
                    historiaImprimiendo={imprimirFormula.historiaEnCurso}
                    onImprimirHistoria={imprimirHistoria.imprimir}
                    historiaImprimiendoCompleta={imprimirHistoria.historiaEnCurso}
                  />
                )}
              </>
            )}

            {activeTab === 'estilos' && (
              <>
                {registrosQuery.isError && (
                  <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">No fue posible cargar los registros de estilos.</p>
                )}

                {!registrosQuery.isError && (
                  <EstilosTimeline
                    registros={registros}
                    isPending={registrosQuery.isPending}
                    onNuevoRegistro={handleNuevoRegistroEstilo}
                    onEditRegistro={(registro) => {
                      setRegistroEstiloToEdit(registro)
                      setEstiloDrawerOpen(true)
                    }}
                  />
                )}
              </>
            )}

            {activeTab === 'examenes' && mascotaId && (
              <ExamenesLaboratorioSection
                mascotaId={mascotaId}
                puedeEditar={puedeEditarExamenes}
                puedeEliminar={puedeEliminarExamenes}
              />
            )}
          </section>

          {/* Columna lateral: tutor y accesos */}
          <div className="flex min-w-0 flex-col gap-6">
            {mascota?.Propietario ? (
              <section aria-labelledby="ficha-tutor" className="flex flex-col gap-2.5 rounded-2xl bg-secondary p-6 text-secondary-foreground">
                <p className="text-[13px] text-muted-foreground">Tutor</p>
                <h2 id="ficha-tutor" className="-mt-1.5 text-lg font-semibold">{mascota.Propietario.nombre}</h2>
                <div className="flex flex-col gap-1 text-[15px] leading-6">
                  {mascota.Propietario.telefono ? (
                    <a href={`tel:${mascota.Propietario.telefono}`} className={`inline-flex items-center gap-2 self-start rounded hover:text-primary ${FOCO}`}>
                      <Phone className="h-4 w-4" />
                      {formatearCelular(mascota.Propietario.telefono)}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Sin teléfono</span>
                  )}
                  {mascota.Propietario.email ? (
                    <a href={`mailto:${mascota.Propietario.email}`} className={`inline-flex items-center gap-2 self-start rounded [overflow-wrap:anywhere] hover:text-primary ${FOCO}`}>
                      <Mail className="h-4 w-4 shrink-0" />
                      {mascota.Propietario.email}
                    </a>
                  ) : null}
                </div>
              </section>
            ) : null}

            {mascota?.observaciones ? (
              <section aria-labelledby="ficha-notas" className="flex flex-col gap-2 rounded-2xl bg-card p-6">
                <h2 id="ficha-notas" className="text-lg font-semibold text-foreground">Notas del paciente</h2>
                <p className="whitespace-pre-line text-[15px] leading-6 text-foreground">{mascota.observaciones}</p>
              </section>
            ) : null}

            <PesoEnElTiempo historias={historias} />

            {tieneAntecedentes && mascota ? (
              <VacunasYDesparasitacion
                antecedentes={antecedentes}
                cargando={antecedentesQuery.isPending}
                mascotaId={mascotaId}
                mascotaNombre={mascota.nombre}
                tutor={mascota.Propietario}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Drawer de historia clínica */}
      {mascotaParaDrawer && (
        <HistoriaClinicaFormDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          mascota={mascotaParaDrawer}
          citaIdInicial={historiaToEdit ? '' : citaIdParam}
          historiaToEdit={historiaToEdit}
          onSuccess={handleDrawerSuccess}
        />
      )}

      {/* Drawer de estilos */}
      {mascotaParaDrawer && (
        <RegistroEstiloFormDrawer
          open={estiloDrawerOpen}
          onClose={handleEstiloDrawerClose}
          mascota={mascotaParaDrawer}
          registroToEdit={registroEstiloToEdit}
          citaId={citaIdParam || undefined}
          onSuccess={handleEstiloDrawerSuccess}
        />
      )}
    </AdminShell>
  )
}
