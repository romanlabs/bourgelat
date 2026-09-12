import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, FileText, Lock, Search, Stethoscope } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { NavCtaLink } from '@/components/shared/NavCta'
import {
  DashboardPanel,
  DataTable,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatLongDate, formatNumber } from '@/features/dashboard/dashboardUtils'
import { agendaApi } from '@/features/agenda/agendaApi'
import { historiasApi } from '@/features/historias/historiasApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import { useHistoriasResumen } from '@/features/historias/useHistoriasResumen'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Cada chip es una pregunta operativa, no una metrica: al tocarlo filtra la
// tabla de abajo. 'pendientes' es el default porque una historia sin cerrar es
// inventario sin descontar y una consulta que todavia no se puede cobrar.
const FILTROS = {
  pendientes: { bloqueada: 'false' },
  controles: { conControlPendiente: 'true' },
  mes: {},
  todas: {},
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const buildHistoryStatusTone = (bloqueada) =>
  bloqueada
    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300'

const getCurrentMonthRange = () => {
  const now = new Date()
  const serialize = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  return {
    fechaInicio: serialize(new Date(now.getFullYear(), now.getMonth(), 1)),
    fechaFin: serialize(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

function FiltroChip({ icon, label, value, helper, tone, activo, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'w-full rounded-xl text-left transition',
        activo ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:opacity-80'
      )}
    >
      <KpiCard icon={icon} label={label} value={value} helper={helper} tone={tone} />
    </button>
  )
}

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
  const [searchParams, setSearchParams] = useSearchParams()

  // El Dashboard entra aqui con ?estado=pendientes desde sus alertas.
  const estadoInicial = FILTROS[searchParams.get('estado')] ? searchParams.get('estado') : 'pendientes'

  const [filtro, setFiltro] = useState(estadoInicial)
  const [pagina, setPagina] = useState(1)
  const [veterinarioId, setVeterinarioId] = useState('todos')
  const [buscar, setBuscar] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const buscarDiferido = useDebouncedValue(buscar.trim())

  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario', 'auxiliar'])
  // Todos los planes incluyen historias clínicas.
  const puedeVerHistorias = true

  useEffect(() => {
    document.title = 'Historias clinicas | Bourgelat'
  }, [])

  const aplicarFiltro = (siguiente) => {
    setFiltro(siguiente)
    setPagina(1)

    // El rango del mes es el unico chip que precarga fechas; los demas las
    // limpian para no arrastrar un recorte que esconda pendientes viejos.
    if (siguiente === 'mes') {
      const rango = getCurrentMonthRange()
      setFechaInicio(rango.fechaInicio)
      setFechaFin(rango.fechaFin)
    } else {
      setFechaInicio('')
      setFechaFin('')
    }

    setSearchParams(siguiente === 'pendientes' ? {} : { estado: siguiente }, { replace: true })
  }

  const filtrosActivos = FILTROS[filtro] || {}

  const historiasQuery = useQuery({
    queryKey: [
      'historias-listado',
      filtro,
      veterinarioId,
      buscarDiferido,
      fechaInicio,
      fechaFin,
      pagina,
    ],
    queryFn: () =>
      historiasApi.obtenerHistorias({
        ...filtrosActivos,
        veterinarioId: veterinarioId !== 'todos' ? veterinarioId : undefined,
        buscar: buscarDiferido || undefined,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
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

  const resumen = useHistoriasResumen({ enabled: rolPermitido && puedeVerHistorias })

  const veterinarios = veterinariosQuery.data?.usuarios || []

  const historiasRows = useMemo(
    () =>
      (historiasQuery.data?.historias || []).map((historia) => ({
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
        proximaConsulta: historia.proximaConsulta
          ? formatLongDate(historia.proximaConsulta)
          : 'Sin control',
        bloqueada: historia.bloqueada,
        mascotaId: historia.mascota?.id || null,
      })),
    [historiasQuery.data]
  )

  if (!rolPermitido) {
    return <RestrictedHistoriasPage />
  }

  const totalResultados = historiasQuery.data?.total || 0

  return (
    <AdminShell
      currentKey="historias"
      title="Historias clinicas"
      description="Bandeja de trabajo clínico: consultas sin cerrar, controles pendientes y búsqueda por diagnóstico."
      headerBadge={
        <StatusPill tone="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-300">
          Consulta documentada
        </StatusPill>
      }
      asideNote="Cerrar una historia descuenta el inventario clínico aplicado y registra su costo como gasto. Mientras siga abierta, la consulta no se puede facturar."
    >
      <div className="space-y-5 pt-5">
        <div className="grid gap-4 xl:grid-cols-4">
          <FiltroChip
            icon={Lock}
            label="Sin cerrar"
            value={formatNumber(resumen.pendientesPorCerrar)}
            helper="Consultas que siguen editables: su inventario no se ha descontado y no se pueden facturar."
            tone="text-amber-700 dark:text-amber-300"
            activo={filtro === 'pendientes'}
            onClick={() => aplicarFiltro('pendientes')}
          />
          <FiltroChip
            icon={CalendarClock}
            label="Controles vencidos"
            value={formatNumber(resumen.controlesPendientes)}
            helper="Pacientes con próxima consulta ya cumplida que aún no han vuelto."
            tone="text-rose-700 dark:text-rose-300"
            activo={filtro === 'controles'}
            onClick={() => aplicarFiltro('controles')}
          />
          <FiltroChip
            icon={FileText}
            label="Del mes"
            value={formatNumber(resumen.totalMes)}
            helper="Consultas documentadas en el mes actual."
            tone="text-cyan-700 dark:text-cyan-300"
            activo={filtro === 'mes'}
            onClick={() => aplicarFiltro('mes')}
          />
          <KpiCard
            icon={Stethoscope}
            label="Profesionales"
            value={formatNumber(resumen.profesionalesActivos)}
            helper="Medicos con consultas registradas este mes."
            tone="text-violet-700 dark:text-violet-300"
          />
        </div>

        {historiasQuery.isError || veterinariosQuery.isError ? (
          <div className="grid gap-4">
            {historiasQuery.isError && (
              <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300">
                {getErrorMessage(historiasQuery.error, 'No fue posible cargar el listado de historias clinicas.')}
              </div>
            )}
            {veterinariosQuery.isError && (
              <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                {getErrorMessage(veterinariosQuery.error, 'No fue posible cargar el equipo veterinario.')}
              </div>
            )}
          </div>
        ) : null}

        <DashboardPanel
          title={
            filtro === 'pendientes'
              ? 'Consultas sin cerrar'
              : filtro === 'controles'
                ? 'Controles pendientes'
                : 'Listado clinico'
          }
          subtitle={
            filtro === 'pendientes'
              ? 'Ciérralas para descontar el inventario aplicado y habilitar el cobro. Abre cada una en el historial del paciente.'
              : filtro === 'controles'
                ? 'Pacientes citados a control que aún no han vuelto. Útil para la llamada de seguimiento.'
                : 'Consulta por profesional, periodo o diagnóstico.'
          }
          action={
            <div className="flex flex-wrap gap-3">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={buscar}
                  onChange={(e) => { setBuscar(e.target.value); setPagina(1) }}
                  placeholder="Motivo o diagnóstico"
                  aria-label="Buscar por motivo o diagnóstico"
                  className="h-10 border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
                />
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => { setFechaInicio(e.target.value); setPagina(1) }}
                aria-label="Desde"
                className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
              />
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => { setFechaFin(e.target.value); setPagina(1) }}
                aria-label="Hasta"
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
            </div>
          }
        >
          <DataTable
            title="Historias"
            subtitle={`${formatNumber(totalResultados)} resultado${totalResultados === 1 ? '' : 's'}`}
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
                    to={row.mascotaId ? `/pacientes/${row.mascotaId}/historial?historiaId=${row.id}` : undefined}
                    disabled={!row.mascotaId}
                  >
                    {row.bloqueada ? 'Ver' : 'Abrir y cerrar'}
                  </NavCtaLink>
                ),
              },
            ]}
            emptyTitle={
              filtro === 'pendientes'
                ? 'No hay consultas sin cerrar'
                : filtro === 'controles'
                  ? 'No hay controles pendientes'
                  : 'No hay historias para este filtro'
            }
            emptyBody={
              filtro === 'pendientes'
                ? 'Todas las consultas documentadas están cerradas y listas para facturar.'
                : filtro === 'controles'
                  ? 'Ningún paciente tiene un control vencido sin atender.'
                  : 'Ajusta el periodo, el profesional o la búsqueda para encontrar una consulta existente.'
            }
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
    </AdminShell>
  )
}
