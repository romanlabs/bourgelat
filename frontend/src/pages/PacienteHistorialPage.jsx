import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ChevronLeft, PawPrint, Phone, User, Weight,
  HeartPulse, Plus, Scissors,
} from 'lucide-react'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { historiasApi } from '@/features/historias/historiasApi'
import { agendaApi } from '@/features/agenda/agendaApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import HistoriaClinicaFormDrawer from '@/features/historias/HistoriaClinicaFormDrawer'
import HistoriaClinicaTimeline from '@/features/historias/HistoriaClinicaTimeline'
import EstilosTimeline from '@/features/estilos/EstilosTimeline'
import RegistroEstiloFormDrawer from '@/features/estilos/RegistroEstiloFormDrawer'
import { useEstilosMascota } from '@/features/estilos/useEstilos'
import { SkeletonBlock } from '@/components/shared/SkeletonBlock'

const TABS = [
  { id: 'historia', label: 'Historia Clínica' },
  { id: 'estilos', label: 'Estilos' },
]

const SPECIES_LABELS = {
  perro: 'Perro',
  gato: 'Gato',
  ave: 'Ave',
  conejo: 'Conejo',
  reptil: 'Reptil',
  otro: 'Otro',
}

function PatientHeaderSkeleton() {
  return (
    <div className="border-b border-border bg-card px-6 py-5">
      <div className="flex items-center gap-4">
        <SkeletonBlock className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-3.5 w-64" />
          <SkeletonBlock className="h-3.5 w-48" />
        </div>
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

  const mascota = mascotaQuery.data?.mascota
  const historias = historiasQuery.data?.historias || []

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

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setHistoriaToEdit(null)
    // Limpiar citaId de la URL para evitar que se re-abra al recargar
    if (citaIdParam) setSearchParams({})
  }

  const handleDrawerSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['paciente-historial', mascotaId] })
    // Solo cerrar al crear nueva historia; al editar/bloquear se deja el drawer abierto
    if (!historiaToEdit) {
      setDrawerOpen(false)
      if (citaIdParam) setSearchParams({})
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

  return (
    <div className="min-h-screen bg-background">
      {/* Barra de navegación contextual */}
      <div className="border-b border-border bg-card px-6 py-3">
        <Link
          to="/pacientes"
          className="inline-flex items-center gap-1 text-small text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Volver a Pacientes
        </Link>
      </div>

      {/* Header del paciente */}
      {mascotaQuery.isPending && <PatientHeaderSkeleton />}
      {mascota && (
        <div className="border-b border-border bg-card px-6 py-5">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap items-start gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                {mascota.fotoPerfil ? (
                  <img
                    src={mascota.fotoPerfil}
                    alt={mascota.nombre}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PawPrint className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-foreground">{mascota.nombre}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {SPECIES_LABELS[mascota.especie] || mascota.especie}
                  {mascota.raza ? ` · ${mascota.raza}` : ''}
                  {mascota.sexo && mascota.sexo !== 'desconocido' ? ` · ${mascota.sexo === 'macho' ? 'Macho' : 'Hembra'}` : ''}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {mascota.Propietario?.nombre && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {mascota.Propietario.nombre}
                    </span>
                  )}
                  {mascota.Propietario?.telefono && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {mascota.Propietario.telefono}
                    </span>
                  )}
                  {mascota.peso && (
                    <span className="flex items-center gap-1">
                      <Weight className="h-3.5 w-3.5" />
                      {mascota.peso} kg
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap gap-2">
                {tieneHistorias && puedeEditarHistorias && (
                  <button
                    type="button"
                    onClick={handleNuevaConsulta}
                    className="inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva consulta
                  </button>
                )}
                {tieneAntecedentes && (
                  <button
                    type="button"
                    onClick={() => navigate(`/antecedentes?mascotaId=${mascotaId}`)}
                    className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                  >
                    <HeartPulse className="h-4 w-4" />
                    Antecedentes
                  </button>
                )}
                {activeTab === 'estilos' && puedeEditarEstilos && (
                  <button
                    type="button"
                    onClick={handleNuevoRegistroEstilo}
                    className="inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    <Scissors className="h-4 w-4" />
                    Nuevo servicio de estilos
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pestañas + contenido */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex gap-1 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'historia' ? (
          <>
            {!historiasQuery.isPending && (
              <p className="mb-6 text-sm text-muted-foreground">
                {historias.length === 0
                  ? 'Sin consultas registradas'
                  : `${historias.length} consulta${historias.length !== 1 ? 's' : ''} registrada${historias.length !== 1 ? 's' : ''}`}
              </p>
            )}

            {historiasQuery.isError && (
              <p className="text-sm text-rose-600 dark:text-rose-400">No fue posible cargar el historial clínico.</p>
            )}

            {!historiasQuery.isError && (
              <HistoriaClinicaTimeline
                historias={historias}
                isPending={historiasQuery.isPending}
                onNuevaConsulta={handleNuevaConsulta}
                onEditHistoria={handleEditHistoria}
              />
            )}
          </>
        ) : (
          <>
            {registrosQuery.isError && (
              <p className="text-sm text-rose-600 dark:text-rose-400">No fue posible cargar los registros de estilos.</p>
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
    </div>
  )
}
