import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CalendarClock,
  CalendarDays,
  Clock3,
  List,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Zap,
} from 'lucide-react'
import AgendaCalendar from '@/features/agenda/AgendaCalendar'
import { CitaDetailDialog } from '@/features/agenda/CitaDetailDialog'
import AdminShell from '@/components/layout/AdminShell'
import { NavCta } from '@/components/shared/NavCta'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  BarPanel,
  DashboardPanel,
  DataTable,
  DonutCard,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import {
  CITA_ESTADO_LABELS,
  CITA_TIPO_LABELS,
  formatLongDate,
  formatNumber,
  getCurrentMonthRange,
  objectToChartData,
} from '@/features/dashboard/dashboardUtils'
import { agendaApi } from '@/features/agenda/agendaApi'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { RecepcionTab } from '@/features/recepcion/RecepcionTab'
import { UrgenciaRetroactivaDialog } from '@/features/recepcion/UrgenciaRetroactivaDialog'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import { Select } from '@/components/ui/select'

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'programada', label: 'Programada' },
  { value: 'en_espera', label: 'En espera' },
  { value: 'en_atencion', label: 'En atencion' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_asistio', label: 'No asistio' },
]

const TABS = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'recepcion', label: 'Recepción' },
  { id: 'analitica', label: 'Analítica' },
]

const AGENDA_REFETCH_INTERVAL = 60000

const getToday = () => new Date().toISOString().slice(0, 10)

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const formatTimeRange = (horaInicio, horaFin) => `${horaInicio?.slice(0, 5)} - ${horaFin?.slice(0, 5)}`

function RestrictedAgendaPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Agenda"
          subtitle="Esta sección se muestra a recepción, veterinarios o perfiles administrativos."
        >
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene visibilidad sobre la agenda clinica. Solicita permisos al
            administrador principal si necesitas programar, confirmar o reprogramar citas.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function AgendaPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('agenda')
  const [vistaAgenda, setVistaAgenda] = useState('calendario')
  const [fecha, setFecha] = useState(getToday())
  const [estado, setEstado] = useState('todos')
  const [veterinarioId, setVeterinarioId] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [urgenciaOpen, setUrgenciaOpen] = useState(false)
  const [recepcionPrefill, setRecepcionPrefill] = useState(null)

  const rangoMes = useMemo(() => getCurrentMonthRange(), [])
  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'])
  // Todos los planes incluyen citas y reportes operativos.
  const puedeVerAgenda = true
  const puedeProgramar = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'veterinario'])
  const puedeGestionarEstado = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'veterinario'])
  const puedeReprogramar = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista'])
  const puedeVerAnalitica = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])

  useEffect(() => {
    document.title = 'Agenda | Bourgelat'
  }, [])

  const citasQuery = useQuery({
    queryKey: ['agenda-citas', fecha, estado, veterinarioId, pagina],
    queryFn: () =>
      agendaApi.obtenerCitas({
        fecha,
        estado: estado !== 'todos' ? estado : undefined,
        veterinarioId: veterinarioId !== 'todos' ? veterinarioId : undefined,
        pagina,
        limite: 14,
      }),
    enabled: rolPermitido && puedeVerAgenda,
    placeholderData: (previousData) => previousData,
    refetchInterval: AGENDA_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  })

  const reporteQuery = useQuery({
    queryKey: ['agenda-reporte-mensual', rangoMes.fechaInicio, rangoMes.fechaFin],
    queryFn: () => dashboardApi.obtenerReporteCitas(rangoMes),
    enabled: rolPermitido && puedeVerAgenda && puedeVerAnalitica,
    placeholderData: (previousData) => previousData,
  })

  const veterinariosQuery = useQuery({
    queryKey: ['agenda-equipo'],
    queryFn: agendaApi.obtenerEquipoAgenda,
    enabled: rolPermitido && puedeVerAgenda,
    placeholderData: (previousData) => previousData,
  })

  const mascotasQuery = useQuery({
    queryKey: ['agenda-mascotas-base'],
    queryFn: () =>
      pacientesApi.obtenerMascotas({
        pagina: 1,
        limite: 200,
      }),
    enabled: rolPermitido && puedeVerAgenda && puedeProgramar,
    placeholderData: (previousData) => previousData,
  })

  const crearCitaUrgenciaMutation = useMutation({
    mutationFn: agendaApi.crearCitaUrgencia,
    onSuccess: (data) => {
      toast.success(data?.message || 'Urgencia registrada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['agenda-citas'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-calendario'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-reporte-mensual'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
      queryClient.invalidateQueries({ queryKey: ['recepcion-sala-espera'] })
      queryClient.invalidateQueries({ queryKey: ['recepcion-disponibilidad'] })

      const mascotaId = data?.cita?.mascota?.id
      if (mascotaId) {
        navigate(`/pacientes/${mascotaId}/historial?citaId=${data.cita.id}`)
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible registrar la urgencia.'))
    },
  })

  const actualizarEstadoMutation = useMutation({
    mutationFn: ({ citaId, payload }) => agendaApi.actualizarEstadoCita(citaId, payload),
    onSuccess: (data, { payload, cita }) => {
      setSelectedAppointment(null)
      queryClient.invalidateQueries({ queryKey: ['agenda-citas'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-calendario'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-reporte-mensual'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
      queryClient.invalidateQueries({ queryKey: ['recepcion-sala-espera'] })
      queryClient.invalidateQueries({ queryKey: ['recepcion-disponibilidad'] })
      if (payload.estado === 'completada' && cita?.mascota?.id) {
        toast.info(
          cita.tipoCita === 'peluqueria'
            ? 'Cita completada. Registra el servicio de estilos.'
            : 'Cita completada. Registra la historia clínica de la consulta.'
        )
        navigate(`/pacientes/${cita.mascota.id}/historial?citaId=${cita.id}`)
      } else {
        toast.success(data?.message || 'Estado actualizado')
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar la cita.'))
    },
  })

  const reprogramarMutation = useMutation({
    mutationFn: ({ citaId, payload }) => agendaApi.reprogramarCita(citaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Cita reprogramada exitosamente')
      setSelectedAppointment(null)
      queryClient.invalidateQueries({ queryKey: ['agenda-citas'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-calendario'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-reporte-mensual'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible reprogramar la cita.'))
    },
  })

  const veterinarios = useMemo(
    () => veterinariosQuery.data?.usuarios || [],
    [veterinariosQuery.data?.usuarios]
  )
  const mascotas = useMemo(() => mascotasQuery.data?.mascotas || [], [mascotasQuery.data?.mascotas])
  const citas = useMemo(() => citasQuery.data?.citas || [], [citasQuery.data?.citas])

  const citasDelDia = citas.length
  const enEspera = citas.filter((item) => item.estado === 'en_espera').length
  const pendientes = citas.filter((item) =>
    ['programada', 'en_espera'].includes(item.estado)
  ).length

  const estadoLocalData = useMemo(() => {
    const record = citas.reduce((acc, cita) => {
      acc[cita.estado] = (acc[cita.estado] || 0) + 1
      return acc
    }, {})
    return objectToChartData(record, CITA_ESTADO_LABELS)
  }, [citas])

  const tipoLocalData = useMemo(() => {
    const record = citas.reduce((acc, cita) => {
      acc[cita.tipoCita] = (acc[cita.tipoCita] || 0) + 1
      return acc
    }, {})
    return objectToChartData(record, CITA_TIPO_LABELS)
  }, [citas])

  const estadoChartData = puedeVerAnalitica
    ? objectToChartData(reporteQuery.data?.citasPorEstado, CITA_ESTADO_LABELS)
    : estadoLocalData

  const tipoChartData = puedeVerAnalitica
    ? objectToChartData(reporteQuery.data?.citasPorTipo, CITA_TIPO_LABELS)
    : tipoLocalData

  const cargaProfesionales = useMemo(() => {
    const record = citas.reduce((acc, cita) => {
      const nombre = cita.veterinario?.nombre || 'Sin profesional'
      acc[nombre] = (acc[nombre] || 0) + 1
      return acc
    }, {})

    return Object.entries(record).map(([name, total]) => ({
      key: name,
      name,
      total,
    }))
  }, [citas])

  const citasRows = useMemo(
    () =>
      citas.map((cita) => ({
        id: cita.id,
        horario: formatTimeRange(cita.horaInicio, cita.horaFin),
        paciente: cita.mascota?.nombre || 'Paciente',
        tutor: cita.propietario?.nombre || 'Sin tutor',
        motivo: cita.motivo,
        profesional: cita.veterinario?.nombre || 'Sin profesional',
        estado: cita.estado,
        esUrgencia: cita.tipoCita === 'urgencia',
        sinHistoria: cita.tipoCita === 'urgencia' && cita.estado === 'completada' && !cita.historia?.id,
        raw: cita,
      })),
    [citas]
  )

  /** Pre-rellena el panel de programar y cambia al tab de Recepción al hacer clic en un slot del calendario. */
  const handleCalendarSlotClick = useCallback((fechaSlot, horaInicio) => {
    const [h, m] = horaInicio.split(':').map(Number)
    const finMins = h * 60 + m + 30
    const horaFin = `${String(Math.floor(finMins / 60)).padStart(2, '0')}:${String(finMins % 60).padStart(2, '0')}`
    setRecepcionPrefill({ fecha: fechaSlot, horaInicio, horaFin })
    setActiveTab('recepcion')
  }, [])

  const handleCalendarUpdateStatus = useCallback(
    (citaId, payload, cita) => actualizarEstadoMutation.mutate({ citaId, payload, cita }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const handleCalendarReschedule = useCallback(
    (citaId, payload) => reprogramarMutation.mutate({ citaId, payload }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  if (!rolPermitido) {
    return <RestrictedAgendaPage />
  }

  return (
    <AdminShell currentKey="agenda" headerVariant="light" hidePageHeader title="Agenda y coordinacion de citas">
      {!puedeVerAgenda ? (
        <EmptyState
          icon={<Sparkles />}
          title="Agenda no disponible en el plan actual"
          description="La agenda de citas hace parte del producto base. Si esta clinica no la tiene activa, revisa la configuracion comercial antes de continuar."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
        />
      ) : (
        <div className="space-y-0">
          {/* ── Banners de error — siempre visibles ── */}
          {(citasQuery.isError || veterinariosQuery.isError || reporteQuery.isError) && (
            <div className="mb-5 grid gap-4">
              {citasQuery.isError && (
                <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                  {getErrorMessage(citasQuery.error, 'No fue posible cargar la agenda seleccionada.')}
                </div>
              )}
              {veterinariosQuery.isError && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  {getErrorMessage(
                    veterinariosQuery.error,
                    'No fue posible cargar el equipo veterinario disponible.'
                  )}
                </div>
              )}
              {reporteQuery.isError && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  {getErrorMessage(
                    reporteQuery.error,
                    'No fue posible cargar la lectura mensual de agenda.'
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Navegación de tabs ── */}
          <div className="flex gap-0 border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════
              Tab: Agenda
          ══════════════════════════════ */}
          {activeTab === 'agenda' && (
            <div className="space-y-5 pt-5">
              {/* KPI cards — solo en vista lista; el calendario aprovecha ese espacio para la grilla */}
              {vistaAgenda === 'lista' && (
                <div className="grid gap-4 xl:grid-cols-4">
                  <KpiCard
                    icon={CalendarClock}
                    label="Citas del dia"
                    value={formatNumber(citasDelDia)}
                    helper={`Agenda visible para ${formatLongDate(fecha)}.`}
                    tone="text-primary"
                  />
                  <KpiCard
                    icon={ShieldCheck}
                    label="En espera"
                    value={formatNumber(enEspera)}
                    helper="Pacientes que ya llegaron y esperan ser atendidos."
                    tone="text-emerald-700"
                  />
                  <KpiCard
                    icon={Clock3}
                    label="Pendientes"
                    value={formatNumber(pendientes)}
                    helper="Programadas o en espera, aun sin cierre definitivo."
                    tone="text-amber-700"
                  />
                  <KpiCard
                    icon={Stethoscope}
                    label="Profesionales"
                    value={formatNumber(veterinarios.length)}
                    helper="Equipo veterinario disponible para asignacion."
                    tone="text-violet-700"
                  />
                </div>
              )}

              {/* Toggle de vista: calendario / lista, se reutiliza como "extra" del toolbar del calendario */}
              {(() => {
                const vistaToggle = (
                  <div className="flex overflow-hidden rounded-full border border-border bg-muted">
                    <button
                      type="button"
                      onClick={() => setVistaAgenda('calendario')}
                      title="Vista calendario"
                      className={`flex h-9 w-9 items-center justify-center transition ${
                        vistaAgenda === 'calendario'
                          ? 'bg-foreground text-white'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setVistaAgenda('lista')}
                      title="Vista lista"
                      className={`flex h-9 w-9 items-center justify-center transition ${
                        vistaAgenda === 'lista'
                          ? 'bg-foreground text-white'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                )

                // El header de Agenda usa headerVariant="light" (paleta clara tipo Google).
                // Cada boton es un circulo independiente (sin píldora compartida partida a
                // la mitad) para que el estado activo se lea limpio. "Atender urgencia" vive
                // aqui (ya no hay banner de titulo/acciones debajo del header).
                const vistaToggleCompacto = (
                  <div className="flex items-center gap-2">
                    {puedeProgramar && (
                      <button
                        type="button"
                        onClick={() => setUrgenciaOpen(true)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        <Zap className="h-4 w-4" />
                        Urgencia
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setVistaAgenda('calendario')}
                        title="Vista calendario"
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                          vistaAgenda === 'calendario'
                            ? 'bg-primary text-white'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <CalendarDays className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setVistaAgenda('lista')}
                        title="Vista lista"
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                          vistaAgenda === 'lista'
                            ? 'bg-primary text-white'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )

                /* Vista calendario: sin tarjeta envolvente — Google tampoco mete el
                   calendario dentro de una caja blanca grande, va directo sobre el fondo */
                if (vistaAgenda === 'calendario') {
                  return (
                    <>
                      <AgendaCalendar
                        veterinarioId={veterinarioId}
                        estado={estado}
                        onEstadoChange={(v) => {
                          setEstado(v)
                          setPagina(1)
                        }}
                        onVeterinarioChange={(v) => {
                          setVeterinarioId(v)
                          setPagina(1)
                        }}
                        veterinarios={veterinarios}
                        enabled={rolPermitido && puedeVerAgenda}
                        puedeProgramar={puedeProgramar}
                        puedeGestionarEstado={puedeGestionarEstado}
                        puedeReprogramar={puedeReprogramar}
                        onSlotClick={handleCalendarSlotClick}
                        onUpdateStatus={handleCalendarUpdateStatus}
                        onReschedule={handleCalendarReschedule}
                        isUpdating={actualizarEstadoMutation.isPending}
                        isRescheduling={reprogramarMutation.isPending}
                        toolbarExtra={vistaToggleCompacto}
                        onCreateUrgencia={puedeProgramar ? () => setUrgenciaOpen(true) : undefined}
                      />
                    </>
                  )
                }

                /* Vista lista: mantiene el header de tarjeta con filtros propios de la tabla */
                return (
                  <DashboardPanel
                    title="Agenda del dia"
                    subtitle="Tabla operativa para recepcion, confirmacion y seguimiento rapido por profesional."
                    action={
                      <div className="flex flex-wrap items-center gap-3">
                        {vistaToggle}
                        <input
                          type="date"
                          value={fecha}
                          onChange={(event) => {
                            setFecha(event.target.value)
                            setPagina(1)
                          }}
                          className="h-9 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        />
                        <Select
                          aria-label="Filtrar por estado"
                          className="h-9"
                          value={estado}
                          onValueChange={(value) => {
                            setEstado(value)
                            setPagina(1)
                          }}
                          options={STATUS_OPTIONS}
                        />
                        <Select
                          aria-label="Filtrar por profesional"
                          className="h-9"
                          value={veterinarioId}
                          onValueChange={(value) => {
                            setVeterinarioId(value)
                            setPagina(1)
                          }}
                          options={[
                            { value: 'todos', label: 'Todos los profesionales' },
                            ...veterinarios.map((item) => ({ value: item.id, label: item.nombre })),
                          ]}
                        />
                      </div>
                    }
                  >
                    <DataTable
                      title="Citas programadas"
                      subtitle="Lectura diaria con accion rapida sobre cada caso."
                      rows={citasRows}
                      columns={[
                        { key: 'horario', label: 'Horario' },
                        {
                          key: 'paciente',
                          label: 'Paciente',
                          render: (row) => (
                            <span className="inline-flex items-center gap-1.5">
                              {row.esUrgencia && <span title="Urgencia">⚡</span>}
                              {row.paciente}
                            </span>
                          ),
                        },
                        { key: 'tutor', label: 'Tutor' },
                        { key: 'motivo', label: 'Motivo' },
                        { key: 'profesional', label: 'Profesional' },
                        {
                          key: 'estado',
                          label: 'Estado',
                          render: (row) => (
                            <div className="flex items-center gap-2">
                              <StatusBadge variant={row.estado} showDot size="sm" />
                              {row.sinHistoria && (
                                <StatusPill tone="border-red-300 bg-red-50 text-red-700">
                                  Sin historia
                                </StatusPill>
                              )}
                            </div>
                          ),
                        },
                        {
                          key: 'accion',
                          label: 'Gestion',
                          render: (row) => (
                            <button
                              type="button"
                              onClick={() => setSelectedAppointment(row.raw)}
                              className="text-sm font-semibold text-primary hover:text-primary"
                            >
                              Gestionar
                            </button>
                          ),
                        },
                      ]}
                      emptyTitle="No hay citas para este filtro"
                      emptyBody="Ajusta la fecha o los filtros, o crea la primera cita desde la pestana Recepcion."
                      action={
                        <StatusPill tone="border-border bg-muted text-foreground">
                          {formatLongDate(fecha)}
                        </StatusPill>
                      }
                    />

                    {(citasQuery.data?.paginas || 1) > 1 && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                        <p className="text-sm text-muted-foreground">
                          Pagina {citasQuery.data?.paginaActual || 1} de {citasQuery.data?.paginas || 1}
                        </p>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setPagina((current) => Math.max(current - 1, 1))}
                            disabled={(citasQuery.data?.paginaActual || 1) <= 1}
                            className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Anterior
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPagina((current) =>
                                Math.min(current + 1, citasQuery.data?.paginas || 1)
                              )
                            }
                            disabled={
                              (citasQuery.data?.paginaActual || 1) >= (citasQuery.data?.paginas || 1)
                            }
                            className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    )}
                  </DashboardPanel>
                )
              })()}
            </div>
          )}

          {/* ══════════════════════════════
              Tab: Recepción
          ══════════════════════════════ */}
          {activeTab === 'recepcion' && (
            <RecepcionTab
              fecha={fecha}
              prefill={recepcionPrefill}
              usuario={usuario}
              puedeProgramar={puedeProgramar}
              puedeGestionarEstado={puedeGestionarEstado}
            />
          )}

          {/* ══════════════════════════════
              Tab: Analítica
          ══════════════════════════════ */}
          {activeTab === 'analitica' && (
            <div className="space-y-5 pt-5">
              <div className="grid gap-5 2xl:grid-cols-3">
                <DonutCard
                  title={puedeVerAnalitica ? 'Estado mensual de citas' : 'Estado del dia'}
                  subtitle={
                    puedeVerAnalitica
                      ? 'Lectura del periodo actual para medir avance y asistencia.'
                      : 'Distribucion de la agenda visible en la fecha seleccionada.'
                  }
                  data={estadoChartData}
                  centerLabel={puedeVerAnalitica ? 'Mes actual' : 'Dia activo'}
                  centerValue={
                    puedeVerAnalitica
                      ? formatNumber(reporteQuery.data?.totalCitas || 0)
                      : formatNumber(citasDelDia)
                  }
                  formatter={formatNumber}
                  emptyMessage="Aun no hay citas para mostrar."
                />
                <DonutCard
                  title={puedeVerAnalitica ? 'Tipo de cita del mes' : 'Tipo de cita del dia'}
                  subtitle="Ayuda a leer el mix operativo que mas se esta moviendo."
                  data={tipoChartData}
                  centerLabel="Tipos"
                  centerValue={
                    puedeVerAnalitica
                      ? formatNumber(reporteQuery.data?.totalCitas || 0)
                      : formatNumber(citasDelDia)
                  }
                  formatter={formatNumber}
                  emptyMessage="Aun no hay tipos de cita para mostrar."
                />
                <BarPanel
                  title="Carga del dia por profesional"
                  subtitle="Distribucion visible de citas por medico en la fecha seleccionada."
                  data={cargaProfesionales}
                  dataKey="total"
                  color="#0f4c81"
                  formatter={formatNumber}
                  emptyMessage="Aun no hay citas para medir carga por profesional."
                />
              </div>

              {!puedeVerAnalitica && (
                <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                  Estas viendo la lectura del dia seleccionado. Con el plan Profesional o superior
                  accedes a reportes mensuales completos, tendencias y exportables.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <CitaDetailDialog
        cita={selectedAppointment}
        open={Boolean(selectedAppointment)}
        onClose={() => setSelectedAppointment(null)}
        puedeGestionarEstado={puedeGestionarEstado}
        puedeReprogramar={puedeReprogramar}
        onUpdateStatus={handleCalendarUpdateStatus}
        onReschedule={handleCalendarReschedule}
        isUpdating={actualizarEstadoMutation.isPending}
        isRescheduling={reprogramarMutation.isPending}
      />

      <UrgenciaRetroactivaDialog
        open={urgenciaOpen}
        onOpenChange={setUrgenciaOpen}
        veterinarios={veterinarios}
        mascotas={mascotas}
        usuario={usuario}
        crearCitaUrgenciaMutation={crearCitaUrgenciaMutation}
      />
    </AdminShell>
  )
}
