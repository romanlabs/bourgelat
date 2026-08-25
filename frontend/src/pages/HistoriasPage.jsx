import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Lock, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { NavCta, NavCtaLink } from '@/components/shared/NavCta'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  DashboardPanel,
  DataTable,
  DonutCard,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatLongDate, formatNumber, getCurrentMonthRange } from '@/features/dashboard/dashboardUtils'
import { agendaApi } from '@/features/agenda/agendaApi'
import { historiasApi } from '@/features/historias/historiasApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import { useHistoriasResumen } from '@/features/historias/useHistoriasResumen'
import { Select } from '@/components/ui/select'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'historial', label: 'Historial' },
]

const BLOCK_OPTIONS = [
  { value: 'todos', label: 'Todas' },
  { value: 'false', label: 'Editables' },
  { value: 'true', label: 'Bloqueadas' },
]

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const buildHistoryStatusTone = (bloqueada) =>
  bloqueada
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'

function RestrictedHistoriasPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Historias clinicas"
          subtitle="Esta sección se muestra a veterinarios, auxiliares o administración autorizada."
        >
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene visibilidad sobre la historia clinica. Solicita permisos al
            administrador o al medico responsable.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function HistoriasPage() {
  const usuario = useAuthStore((state) => state.usuario)

  const [activeTab, setActiveTab] = useState('resumen')
  const rangoMes = useMemo(() => getCurrentMonthRange(), [])
  const [pagina, setPagina] = useState(1)
  const [veterinarioId, setVeterinarioId] = useState('todos')
  const [bloqueada, setBloqueada] = useState('todos')
  const [fechaInicio, setFechaInicio] = useState(rangoMes.fechaInicio)
  const [fechaFin, setFechaFin] = useState(rangoMes.fechaFin)

  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario', 'auxiliar'])
  // Todos los planes incluyen historias clínicas.
  const puedeVerHistorias = true

  useEffect(() => {
    document.title = 'Historias clinicas | Bourgelat'
  }, [])

  const historiasQuery = useQuery({
    queryKey: [
      'historias-listado',
      'todas',
      veterinarioId,
      bloqueada,
      fechaInicio,
      fechaFin,
      pagina,
    ],
    queryFn: () =>
      historiasApi.obtenerHistorias({
        veterinarioId: veterinarioId !== 'todos' ? veterinarioId : undefined,
        bloqueada: bloqueada !== 'todos' ? bloqueada : undefined,
        fechaInicio,
        fechaFin,
        pagina,
        limite: 20,
      }),
    enabled: rolPermitido && puedeVerHistorias,
    placeholderData: (previousData) => previousData,
  })

  const veterinariosQuery = useQuery({
    queryKey: ['historias-equipo'],
    queryFn: agendaApi.obtenerEquipoAgenda,
    enabled: rolPermitido && puedeVerHistorias,
    placeholderData: (previousData) => previousData,
  })

  const resumenHook = useHistoriasResumen({ enabled: rolPermitido && puedeVerHistorias })

  const veterinarios = veterinariosQuery.data?.usuarios || []
  const historias = historiasQuery.data?.historias || []

  const historiasRows = historias.map((historia) => ({
    id: historia.id,
    fecha: new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(historia.fechaConsulta)),
    paciente: historia.mascota?.nombre || 'Paciente',
    tutor: historia.propietario?.nombre || 'Sin tutor',
    profesional: historia.veterinario?.nombre || 'Sin profesional',
    diagnostico: historia.diagnostico,
    proximaConsulta: historia.proximaConsulta ? formatLongDate(historia.proximaConsulta) : 'Sin control',
    bloqueada: historia.bloqueada,
    mascotaId: historia.mascota?.id || null,
  }))

  if (!rolPermitido) {
    return <RestrictedHistoriasPage />
  }

  return (
    <AdminShell
      currentKey="historias"
      title="Historias clinicas"
      description="Vista administrativa de consultas documentadas. Para registrar o editar una historia, abre el historial del paciente."
      headerBadge={
        <StatusPill tone="border-rose-200 bg-rose-50 text-rose-700">
          Consulta documentada
        </StatusPill>
      }
      asideNote="Para crear o editar una historia clínica ve al historial del paciente desde la sección Pacientes o desde la Agenda al completar una cita."
    >
      {!puedeVerHistorias ? (
        <EmptyState
          icon={<Sparkles />}
          title="Historias clinicas no disponibles en el plan actual"
          description="La consulta medica y su trazabilidad dependen de la funcionalidad de historias clinicas. Si no aparece activa, conviene revisar el plan de la clinica."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
        />
      ) : (
        <div className="space-y-0">
          {/* Tabs */}
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

          {/* Tab: Resumen */}
          {activeTab === 'resumen' && (
            <div className="space-y-5 pt-5">
              <div className="grid gap-4 xl:grid-cols-4">
                <KpiCard
                  icon={FileText}
                  label="Historias del mes"
                  value={formatNumber(resumenHook.totalHistorias)}
                  helper="Total de consultas documentadas en el mes actual."
                  tone="text-cyan-700"
                />
                <KpiCard
                  icon={Lock}
                  label="Bloqueadas"
                  value={formatNumber(resumenHook.historiasBloqueadas)}
                  helper="Consultas que ya no admiten modificaciones."
                  tone="text-amber-700"
                />
                <KpiCard
                  icon={ShieldCheck}
                  label="Con control"
                  value={formatNumber(resumenHook.conControl)}
                  helper="Historias del mes con proxima consulta programada."
                  tone="text-emerald-700"
                />
                <KpiCard
                  icon={Stethoscope}
                  label="Profesionales"
                  value={formatNumber(resumenHook.profesionalesActivos)}
                  helper="Medicos con consultas registradas este mes."
                  tone="text-violet-700"
                />
              </div>

              <div className="grid gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
                <DonutCard
                  title="Estado de documentacion"
                  subtitle="Balance entre historias editables y bloqueadas en el mes actual."
                  data={resumenHook.statusData}
                  centerLabel="Historias"
                  centerValue={formatNumber(resumenHook.totalHistorias)}
                  formatter={formatNumber}
                  emptyMessage="Aun no hay historias para mostrar."
                />
              </div>
            </div>
          )}

          {/* Tab: Historial */}
          {activeTab === 'historial' && (
            <div className="space-y-5 pt-5">
              {historiasQuery.isError || veterinariosQuery.isError ? (
                <div className="grid gap-4">
                  {historiasQuery.isError && (
                    <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                      {getErrorMessage(historiasQuery.error, 'No fue posible cargar el listado de historias clinicas.')}
                    </div>
                  )}
                  {veterinariosQuery.isError && (
                    <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                      {getErrorMessage(veterinariosQuery.error, 'No fue posible cargar el equipo veterinario.')}
                    </div>
                  )}
                </div>
              ) : null}

              <DashboardPanel
                title="Listado clinico"
                subtitle="Consulta recientes por profesional, periodo y estado de bloqueo. Haz clic en Ver para abrir el historial completo del paciente."
                action={
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => { setFechaInicio(e.target.value); setPagina(1) }}
                      className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => { setFechaFin(e.target.value); setPagina(1) }}
                      className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
                    />
                    <Select
                      aria-label="Filtrar por médico"
                      value={veterinarioId}
                      onValueChange={(value) => { setVeterinarioId(value); setPagina(1) }}
                      options={[
                        { value: 'todos', label: 'Todos los medicos' },
                        ...veterinarios.map((v) => ({ value: v.id, label: v.nombre })),
                      ]}
                    />
                    <Select
                      aria-label="Filtrar por estado de la historia"
                      value={bloqueada}
                      onValueChange={(value) => { setBloqueada(value); setPagina(1) }}
                      options={BLOCK_OPTIONS}
                    />
                  </div>
                }
              >
                <DataTable
                  title="Historias"
                  subtitle="Vista administrativa de las consultas documentadas."
                  rows={historiasRows}
                  columns={[
                    { key: 'fecha', label: 'Fecha' },
                    { key: 'paciente', label: 'Paciente' },
                    { key: 'tutor', label: 'Tutor' },
                    { key: 'profesional', label: 'Profesional' },
                    { key: 'proximaConsulta', label: 'Control' },
                    {
                      key: 'bloqueada',
                      label: 'Estado',
                      render: (row) => (
                        <StatusPill tone={buildHistoryStatusTone(row.bloqueada)}>
                          {row.bloqueada ? 'Bloqueada' : 'Editable'}
                        </StatusPill>
                      ),
                    },
                    {
                      key: 'accion',
                      label: 'Historial',
                      render: (row) => (
                        <NavCtaLink
                          to={row.mascotaId ? `/pacientes/${row.mascotaId}/historial` : undefined}
                          disabled={!row.mascotaId}
                        >
                          Ver
                        </NavCtaLink>
                      ),
                    },
                  ]}
                  emptyTitle="No hay historias para este filtro"
                  emptyBody="Ajusta el periodo, el profesional o el estado para encontrar una consulta existente."
                />

                {(historiasQuery.data?.paginas || 1) > 1 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">
                      Pagina {historiasQuery.data?.paginaActual || 1} de {historiasQuery.data?.paginas || 1}
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                        disabled={(historiasQuery.data?.paginaActual || 1) <= 1}
                        className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => setPagina((p) => Math.min(p + 1, historiasQuery.data?.paginas || 1))}
                        disabled={(historiasQuery.data?.paginaActual || 1) >= (historiasQuery.data?.paginas || 1)}
                        className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </DashboardPanel>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  )
}
