import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CalendarClock,
  CircleAlert,
  Clock3,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import {
  BarPanel,
  DashboardPanel,
  DataTable,
  DonutCard,
  EmptyModuleState,
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
import { useAuthStore } from '@/store/authStore'

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'programada', label: 'Programada' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_asistio', label: 'No asistio' },
]

const TYPE_OPTIONS = [
  { value: 'consulta_general', label: 'Consulta general' },
  { value: 'vacunacion', label: 'Vacunacion' },
  { value: 'cirugia', label: 'Cirugia' },
  { value: 'desparasitacion', label: 'Desparasitacion' },
  { value: 'control', label: 'Control' },
  { value: 'urgencia', label: 'Urgencia' },
  { value: 'peluqueria', label: 'Peluqueria' },
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'radiografia', label: 'Radiografia' },
  { value: 'otro', label: 'Otro' },
]

const getToday = () => new Date().toISOString().slice(0, 10)

const DEFAULT_APPOINTMENT_FORM = {
  fecha: getToday(),
  horaInicio: '09:00',
  horaFin: '09:30',
  motivo: '',
  tipoCita: 'consulta_general',
  observaciones: '',
  propietarioId: '',
  mascotaId: '',
  veterinarioId: '',
}

const DEFAULT_STATUS_FORM = {
  estado: 'confirmada',
  motivoCancelacion: '',
}

const DEFAULT_RESCHEDULE_FORM = {
  fecha: '',
  horaInicio: '',
  horaFin: '',
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const formatTimeRange = (horaInicio, horaFin) => `${horaInicio?.slice(0, 5)} - ${horaFin?.slice(0, 5)}`

const buildStateTone = (estado) => {
  switch (estado) {
    case 'confirmada':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700'
    case 'en_curso':
      return 'border-violet-200 bg-violet-50 text-violet-700'
    case 'completada':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'cancelada':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'no_asistio':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700'
  }
}

const getOwnerPets = (owner, fallbackPets) => {
  if (!owner) return []

  const directPets = owner.Mascotas || owner.Mascota || owner.mascotas || []
  if (Array.isArray(directPets) && directPets.length > 0) {
    return directPets
  }

  return (fallbackPets || []).filter((pet) => pet.Propietario?.id === owner.id)
}

function RestrictedAgendaPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Agenda"
          subtitle="Este modulo se muestra a recepcion, veterinarios o perfiles administrativos."
        >
          <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
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
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const queryClient = useQueryClient()

  const [fecha, setFecha] = useState(getToday())
  const [estado, setEstado] = useState('todos')
  const [veterinarioId, setVeterinarioId] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [ownerSearch, setOwnerSearch] = useState('')
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [appointmentForm, setAppointmentForm] = useState(DEFAULT_APPOINTMENT_FORM)
  const [statusForm, setStatusForm] = useState(DEFAULT_STATUS_FORM)
  const [rescheduleForm, setRescheduleForm] = useState(DEFAULT_RESCHEDULE_FORM)

  const rangoMes = useMemo(() => getCurrentMonthRange(), [])
  const rolPermitido = ['admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'].includes(
    usuario?.rol
  )
  const featureSet = new Set(
    Array.isArray(suscripcion?.funcionalidades) ? suscripcion.funcionalidades : []
  )
  const puedeVerAgenda = featureSet.has('citas')
  const puedeProgramar = ['admin', 'superadmin', 'recepcionista', 'veterinario'].includes(usuario?.rol)
  const puedeGestionarEstado = ['admin', 'superadmin', 'recepcionista', 'veterinario'].includes(
    usuario?.rol
  )
  const puedeReprogramar = ['admin', 'superadmin', 'recepcionista'].includes(usuario?.rol)
  const puedeVerAnalitica =
    ['admin', 'superadmin', 'veterinario'].includes(usuario?.rol) &&
    featureSet.has('reportes_operativos')

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

  const propietariosQuery = useQuery({
    queryKey: ['agenda-propietarios', ownerSearch.trim()],
    queryFn: () =>
      pacientesApi.obtenerPropietarios({
        buscar: ownerSearch.trim() || undefined,
        pagina: 1,
        limite: 8,
      }),
    enabled: rolPermitido && puedeVerAgenda && puedeProgramar,
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

  const crearCitaMutation = useMutation({
    mutationFn: agendaApi.crearCita,
    onSuccess: (data) => {
      toast.success(data?.message || 'Cita creada exitosamente')
      setAppointmentForm((current) => ({
        ...DEFAULT_APPOINTMENT_FORM,
        fecha: current.fecha,
        veterinarioId: current.veterinarioId,
      }))
      setSelectedOwner(null)
      queryClient.invalidateQueries({ queryKey: ['agenda-citas'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-reporte-mensual'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear la cita.'))
    },
  })

  const actualizarEstadoMutation = useMutation({
    mutationFn: ({ citaId, payload }) => agendaApi.actualizarEstadoCita(citaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Estado actualizado')
      setSelectedAppointment(null)
      queryClient.invalidateQueries({ queryKey: ['agenda-citas'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-reporte-mensual'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
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
  const propietarios = useMemo(
    () => propietariosQuery.data?.propietarios || [],
    [propietariosQuery.data?.propietarios]
  )
  const mascotas = useMemo(() => mascotasQuery.data?.mascotas || [], [mascotasQuery.data?.mascotas])
  const citas = useMemo(() => citasQuery.data?.citas || [], [citasQuery.data?.citas])
  const preferredVeterinarioId =
    veterinarios.find((item) => item.id === usuario?.id)?.id || veterinarios[0]?.id || ''

  const mascotasDelTutor = useMemo(
    () => getOwnerPets(selectedOwner, mascotas),
    [mascotas, selectedOwner]
  )
  const mascotaSeleccionadaId = useMemo(() => {
    const mascotaExiste = mascotasDelTutor.some((pet) => pet.id === appointmentForm.mascotaId)
    if (mascotaExiste) {
      return appointmentForm.mascotaId
    }

    return mascotasDelTutor[0]?.id || ''
  }, [appointmentForm.mascotaId, mascotasDelTutor])

  const citasDelDia = citas.length
  const confirmadas = citas.filter((item) => item.estado === 'confirmada').length
  const pendientes = citas.filter((item) =>
    ['programada', 'confirmada', 'en_curso'].includes(item.estado)
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
        raw: cita,
      })),
    [citas]
  )

  const handleCreateAppointment = (event) => {
    event.preventDefault()

    if (
      !appointmentForm.fecha ||
      !appointmentForm.horaInicio ||
      !appointmentForm.horaFin ||
      !appointmentForm.motivo.trim() ||
      !appointmentForm.propietarioId ||
      !mascotaSeleccionadaId ||
      !(appointmentForm.veterinarioId || preferredVeterinarioId)
    ) {
      toast.error('Completa fecha, horario, motivo, tutor, paciente y profesional.')
      return
    }

    if (appointmentForm.horaFin <= appointmentForm.horaInicio) {
      toast.error('La hora de fin debe ser mayor a la hora de inicio.')
      return
    }

    crearCitaMutation.mutate({
      fecha: appointmentForm.fecha,
      horaInicio: appointmentForm.horaInicio,
      horaFin: appointmentForm.horaFin,
      motivo: appointmentForm.motivo.trim(),
      tipoCita: appointmentForm.tipoCita,
      observaciones: appointmentForm.observaciones.trim() || undefined,
      propietarioId: appointmentForm.propietarioId,
      mascotaId: mascotaSeleccionadaId,
      veterinarioId: appointmentForm.veterinarioId || preferredVeterinarioId,
    })
  }

  const handleUpdateStatus = (event) => {
    event.preventDefault()

    if (!selectedAppointment) {
      toast.error('Selecciona primero una cita desde la tabla.')
      return
    }

    if (statusForm.estado === 'cancelada' && !statusForm.motivoCancelacion.trim()) {
      toast.error('Indica el motivo de cancelacion antes de guardar.')
      return
    }

    actualizarEstadoMutation.mutate({
      citaId: selectedAppointment.id,
      payload: {
        estado: statusForm.estado,
        motivoCancelacion:
          statusForm.estado === 'cancelada' ? statusForm.motivoCancelacion.trim() : undefined,
      },
    })
  }

  const handleReschedule = (event) => {
    event.preventDefault()

    if (!selectedAppointment) {
      toast.error('Selecciona una cita antes de reprogramar.')
      return
    }

    if (!rescheduleForm.fecha || !rescheduleForm.horaInicio || !rescheduleForm.horaFin) {
      toast.error('Completa fecha y horario para reprogramar.')
      return
    }

    if (rescheduleForm.horaFin <= rescheduleForm.horaInicio) {
      toast.error('La hora de fin debe ser mayor a la hora de inicio.')
      return
    }

    reprogramarMutation.mutate({
      citaId: selectedAppointment.id,
      payload: {
        fecha: rescheduleForm.fecha,
        horaInicio: rescheduleForm.horaInicio,
        horaFin: rescheduleForm.horaFin,
      },
    })
  }

  if (!rolPermitido) {
    return <RestrictedAgendaPage />
  }

  return (
    <AdminShell
      currentKey="agenda"
      title="Agenda y coordinacion de citas"
      description="Organiza el dia por profesional, programa nuevas citas y resuelve confirmaciones o reprogramaciones sin salir del modulo administrativo."
      headerBadge={
        <StatusPill tone="border-cyan-200 bg-cyan-50 text-cyan-700">
          Operacion diaria
        </StatusPill>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            to="/pacientes"
            className="inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Abrir pacientes
          </Link>
          <Link
            to="/historias"
            className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir historias
          </Link>
        </div>
      }
      asideNote="Recepcion y consulta pueden operar desde aqui con filtros simples, una agenda diaria clara y acciones directas sobre cada cita."
    >
      {!puedeVerAgenda ? (
        <EmptyModuleState
          title="Agenda no disponible en el plan actual"
          body="La agenda de citas hace parte del producto base. Si esta clinica no la tiene activa, revisa la configuracion comercial antes de continuar."
          ctaLabel="Revisar planes"
        />
      ) : (
        <div className="space-y-5">
          {citasQuery.isError || veterinariosQuery.isError || reporteQuery.isError ? (
            <div className="grid gap-4">
              {citasQuery.isError ? (
                <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                  {getErrorMessage(citasQuery.error, 'No fue posible cargar la agenda seleccionada.')}
                </div>
              ) : null}
              {veterinariosQuery.isError ? (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  {getErrorMessage(
                    veterinariosQuery.error,
                    'No fue posible cargar el equipo veterinario disponible.'
                  )}
                </div>
              ) : null}
              {reporteQuery.isError ? (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  {getErrorMessage(
                    reporteQuery.error,
                    'No fue posible cargar la lectura mensual de agenda.'
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-4">
            <KpiCard
              icon={CalendarClock}
              label="Citas del dia"
              value={formatNumber(citasDelDia)}
              helper={`Agenda visible para ${formatLongDate(fecha)}.`}
              tone="text-cyan-700"
            />
            <KpiCard
              icon={ShieldCheck}
              label="Confirmadas"
              value={formatNumber(confirmadas)}
              helper="Citas ya confirmadas dentro del dia seleccionado."
              tone="text-emerald-700"
            />
            <KpiCard
              icon={Clock3}
              label="Pendientes"
              value={formatNumber(pendientes)}
              helper="Programadas, confirmadas o en curso aun sin cierre definitivo."
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

          <div className="grid gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
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

            <DashboardPanel
              title="Agenda del dia"
              subtitle="Tabla operativa para recepcion, confirmacion y seguimiento rapido por profesional."
              action={
                <div className="flex flex-wrap gap-3">
                  <input
                    type="date"
                    value={fecha}
                    onChange={(event) => {
                      setFecha(event.target.value)
                      setPagina(1)
                    }}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <select
                    value={estado}
                    onChange={(event) => {
                      setEstado(event.target.value)
                      setPagina(1)
                    }}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={veterinarioId}
                    onChange={(event) => {
                      setVeterinarioId(event.target.value)
                      setPagina(1)
                    }}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  >
                    <option value="todos">Todos los profesionales</option>
                    {veterinarios.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              <DataTable
                title="Citas programadas"
                subtitle="Lectura diaria con accion rapida sobre cada caso."
                rows={citasRows}
                columns={[
                  { key: 'horario', label: 'Horario' },
                  { key: 'paciente', label: 'Paciente' },
                  { key: 'tutor', label: 'Tutor' },
                  { key: 'motivo', label: 'Motivo' },
                  { key: 'profesional', label: 'Profesional' },
                  {
                    key: 'estado',
                    label: 'Estado',
                    render: (row) => (
                      <StatusPill tone={buildStateTone(row.estado)}>{row.estado}</StatusPill>
                    ),
                  },
                  {
                    key: 'accion',
                    label: 'Gestion',
                    render: (row) => (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAppointment(row.raw)
                          setStatusForm({
                            estado: row.raw.estado,
                            motivoCancelacion: row.raw.motivoCancelacion || '',
                          })
                          setRescheduleForm({
                            fecha: row.raw.fecha,
                            horaInicio: row.raw.horaInicio?.slice(0, 5) || '',
                            horaFin: row.raw.horaFin?.slice(0, 5) || '',
                          })
                        }}
                        className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                      >
                        Gestionar
                      </button>
                    ),
                  },
                ]}
                emptyTitle="No hay citas para este filtro"
                emptyBody="Ajusta la fecha o los filtros, o crea la primera cita desde el panel operativo."
                action={
                  <StatusPill tone="border-slate-200 bg-slate-100 text-slate-700">
                    {formatLongDate(fecha)}
                  </StatusPill>
                }
              />

              {(citasQuery.data?.paginas || 1) > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-600">
                    Pagina {citasQuery.data?.paginaActual || 1} de {citasQuery.data?.paginas || 1}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPagina((current) => Math.max(current - 1, 1))}
                      disabled={(citasQuery.data?.paginaActual || 1) <= 1}
                      className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPagina((current) => Math.min(current + 1, citasQuery.data?.paginas || 1))
                      }
                      disabled={(citasQuery.data?.paginaActual || 1) >= (citasQuery.data?.paginas || 1)}
                      className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ) : null}
            </DashboardPanel>
          </div>

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <BarPanel
              title="Carga del dia por profesional"
              subtitle="Distribucion visible de citas por medico en la fecha seleccionada."
              data={cargaProfesionales}
              dataKey="total"
              color="#0f4c81"
              formatter={formatNumber}
              emptyMessage="Aun no hay citas para medir carga por profesional."
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
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_420px]">
            <DashboardPanel
              title="Nueva cita"
              subtitle="Programa la agenda sin salir del backoffice. Primero selecciona tutor, luego paciente y profesional."
              action={<Plus className="h-4 w-4 text-cyan-700" />}
            >
              {!puedeProgramar ? (
                <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                  Tu rol actual puede consultar la agenda, pero no crear nuevas citas.
                </div>
              ) : (
                <form className="grid gap-4" onSubmit={handleCreateAppointment}>
                  <div className="border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Search className="h-3.5 w-3.5" />
                      Buscar tutor
                    </div>
                    <input
                      type="text"
                      value={ownerSearch}
                      onChange={(event) => setOwnerSearch(event.target.value)}
                      placeholder="Nombre, documento o telefono"
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
                              setAppointmentForm((current) => ({
                                ...current,
                                propietarioId: '',
                                mascotaId: '',
                              }))
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
                                setAppointmentForm((current) => ({
                                  ...current,
                                  propietarioId: owner.id,
                                  mascotaId: '',
                                }))
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

                      {!selectedOwner && ownerSearch.trim() && propietarios.length === 0 ? (
                        <div className="border border-dashed border-slate-300 bg-white px-3 py-3 text-sm leading-7 text-slate-600">
                          No encontramos un tutor con esa busqueda. Puedes crearlo desde el modulo de pacientes.
                          <Link to="/pacientes" className="ml-2 font-semibold text-cyan-700 hover:text-cyan-800">
                            Abrir pacientes
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="date"
                      value={appointmentForm.fecha}
                      onChange={(event) =>
                        setAppointmentForm((current) => ({ ...current, fecha: event.target.value }))
                      }
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <select
                      value={appointmentForm.tipoCita}
                      onChange={(event) =>
                        setAppointmentForm((current) => ({ ...current, tipoCita: event.target.value }))
                      }
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="time"
                      value={appointmentForm.horaInicio}
                      onChange={(event) =>
                        setAppointmentForm((current) => ({ ...current, horaInicio: event.target.value }))
                      }
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="time"
                      value={appointmentForm.horaFin}
                      onChange={(event) =>
                        setAppointmentForm((current) => ({ ...current, horaFin: event.target.value }))
                      }
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </div>

                  <select
                    value={mascotaSeleccionadaId}
                    onChange={(event) =>
                      setAppointmentForm((current) => ({ ...current, mascotaId: event.target.value }))
                    }
                    disabled={!selectedOwner}
                    className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="">
                      {selectedOwner ? 'Selecciona el paciente' : 'Selecciona primero un tutor'}
                    </option>
                    {mascotasDelTutor.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.nombre}
                      </option>
                    ))}
                  </select>

                  <select
                    value={appointmentForm.veterinarioId || preferredVeterinarioId}
                    onChange={(event) =>
                      setAppointmentForm((current) => ({
                        ...current,
                        veterinarioId: event.target.value,
                      }))
                    }
                    className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  >
                    <option value="">Selecciona el profesional</option>
                    {veterinarios.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={appointmentForm.motivo}
                    onChange={(event) =>
                      setAppointmentForm((current) => ({ ...current, motivo: event.target.value }))
                    }
                    placeholder="Motivo principal de la cita"
                    className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />

                  <textarea
                    value={appointmentForm.observaciones}
                    onChange={(event) =>
                      setAppointmentForm((current) => ({
                        ...current,
                        observaciones: event.target.value,
                      }))
                    }
                    placeholder="Observaciones operativas para recepcion o consulta"
                    className="min-h-[120px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />

                  {selectedOwner && mascotasDelTutor.length === 0 ? (
                    <div className="border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-7 text-amber-800">
                      Este tutor aun no tiene pacientes activos. Primero registra la mascota en el modulo de pacientes.
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={crearCitaMutation.isPending || veterinarios.length === 0}
                    className="border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {crearCitaMutation.isPending ? 'Guardando...' : 'Guardar cita'}
                  </button>
                </form>
              )}
            </DashboardPanel>

            <div className="space-y-5">
              <DashboardPanel
                title="Gestionar cita"
                subtitle="Actualiza estado y confirma la evolucion de la cita seleccionada."
                action={<CircleAlert className="h-4 w-4 text-cyan-700" />}
              >
                {!selectedAppointment ? (
                  <div className="border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                    Selecciona una cita desde la tabla para confirmar, iniciar, completar, cancelar o marcar no asistencia.
                  </div>
                ) : !puedeGestionarEstado ? (
                  <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                    Tu rol actual puede ver el detalle, pero no cambiar el estado de la cita.
                  </div>
                ) : (
                  <form className="grid gap-4" onSubmit={handleUpdateStatus}>
                    <div className="border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
                      <p className="font-semibold text-slate-950">
                        {selectedAppointment.mascota?.nombre || 'Paciente'}
                      </p>
                      <p>{selectedAppointment.propietario?.nombre || 'Sin tutor'}</p>
                      <p>{formatTimeRange(selectedAppointment.horaInicio, selectedAppointment.horaFin)}</p>
                    </div>

                    <select
                      value={statusForm.estado}
                      onChange={(event) =>
                        setStatusForm((current) => ({ ...current, estado: event.target.value }))
                      }
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      {STATUS_OPTIONS.filter((item) => item.value !== 'todos').map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {statusForm.estado === 'cancelada' ? (
                      <textarea
                        value={statusForm.motivoCancelacion}
                        onChange={(event) =>
                          setStatusForm((current) => ({
                            ...current,
                            motivoCancelacion: event.target.value,
                          }))
                        }
                        placeholder="Motivo de cancelacion"
                        className="min-h-[110px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                      />
                    ) : null}

                    <button
                      type="submit"
                      disabled={actualizarEstadoMutation.isPending}
                      className="border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actualizarEstadoMutation.isPending ? 'Guardando...' : 'Actualizar estado'}
                    </button>
                  </form>
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Reprogramar"
                subtitle="Mueve la cita si recepcion necesita reorganizar el horario del dia."
                action={<RefreshCcw className="h-4 w-4 text-cyan-700" />}
              >
                {!selectedAppointment ? (
                  <div className="border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                    Selecciona una cita desde la tabla para cambiar fecha u horario.
                  </div>
                ) : !puedeReprogramar ? (
                  <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                    Solo administracion y recepcion pueden reprogramar una cita desde este panel.
                  </div>
                ) : (
                  <form className="grid gap-4" onSubmit={handleReschedule}>
                    <input
                      type="date"
                      value={rescheduleForm.fecha}
                      onChange={(event) =>
                        setRescheduleForm((current) => ({ ...current, fecha: event.target.value }))
                      }
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        type="time"
                        value={rescheduleForm.horaInicio}
                        onChange={(event) =>
                          setRescheduleForm((current) => ({
                            ...current,
                            horaInicio: event.target.value,
                          }))
                        }
                        className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                      />
                      <input
                        type="time"
                        value={rescheduleForm.horaFin}
                        onChange={(event) =>
                          setRescheduleForm((current) => ({ ...current, horaFin: event.target.value }))
                        }
                        className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={reprogramarMutation.isPending}
                      className="border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reprogramarMutation.isPending ? 'Guardando...' : 'Reprogramar cita'}
                    </button>
                  </form>
                )}
              </DashboardPanel>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
