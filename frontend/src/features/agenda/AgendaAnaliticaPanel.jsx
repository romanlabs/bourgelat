import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, UserPlus } from 'lucide-react'

import {
  BarPanel,
  DashboardPanel,
  DonutCard,
  KpiGrid,
  LinePanel,
} from '@/features/dashboard/dashboardComponents'
import { PERIODO_PRESETS, formatNumber } from '@/features/dashboard/dashboardUtils'
import { EmptyState, SkeletonPanel } from '@/components/shared'
import { useAgendaAnalitica } from './useAgendaAnalitica'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const formatPercent = (value) => `${Number(value || 0).toFixed(1).replace('.', ',')}%`
const formatMinutos = (value) =>
  value === null || value === undefined ? 'Sin datos' : `${formatNumber(value)} min`

function Leyenda({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1 w-4 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

/**
 * Barra de proporción con etiqueta. Se usa para el mix de servicios: con diez
 * tipos de cita un donut se vuelve ilegible, y lo que importa es el orden.
 */
function BarraProporcion({ name, value, total, color }) {
  const porcentaje = total > 0 ? (value / total) * 100 : 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm text-card-foreground">{name}</span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {formatNumber(value)} · {Math.round(porcentaje)}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full transition-all duration-normal"
          style={{ width: `${porcentaje}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

/**
 * Tab de analítica de la agenda.
 *
 * Lectura de arriba abajo: indicadores → tendencia diaria → desgloses del
 * periodo → carga del equipo y fugas de agenda. Todo cuelga del mismo rango de
 * fechas (el selector de la cabecera), a diferencia de la versión anterior, que
 * mezclaba conteos del mes con la carga del día seleccionado.
 */
export function AgendaAnaliticaPanel({ puedeVerAnalitica }) {
  const {
    preset,
    setPreset,
    query,
    resumen,
    estadoChartData,
    tipoChartData,
    origenChartData,
    serieDiaria,
    franjaHoraria,
    cargaProfesionales,
    totalTipos,
    topMotivosCancelacion,
  } = useAgendaAnalitica({ habilitado: puedeVerAnalitica })

  if (!puedeVerAnalitica) {
    return (
      <div className="pt-5">
        <EmptyState
          icon={<CalendarClock />}
          title="Analítica no disponible para tu rol"
          description="Los reportes de agenda están disponibles para administración y para el equipo veterinario. Si necesitas acceso, pídeselo a quien administra la clínica."
        />
      </div>
    )
  }

  const cargando = query.isLoading
  const maxCargaProfesional = Math.max(1, ...cargaProfesionales.map((item) => item.total))

  const kpis = [
    {
      id: 'total',
      icon: CalendarClock,
      label: 'Citas del periodo',
      value: formatNumber(resumen?.totalCitas || 0),
      helper: 'Todas las citas agendadas dentro del rango seleccionado.',
      tone: 'text-primary',
      badge: `${formatNumber(resumen?.completadas || 0)} completadas`,
    },
    {
      id: 'asistencia',
      icon: CheckCircle2,
      label: 'Tasa de asistencia',
      value: formatPercent(resumen?.tasaAsistencia),
      helper:
        'Completadas sobre las citas ya resueltas (completadas, canceladas y no asistió). Las que siguen programadas no cuentan.',
      tone: 'text-emerald-700 dark:text-emerald-300',
      badge: 'sobre citas resueltas',
      badgeTone: 'bg-secondary text-secondary-foreground',
    },
    {
      id: 'no-show',
      icon: AlertTriangle,
      label: 'No asistió',
      value: formatPercent(resumen?.tasaNoShow),
      helper: 'Pacientes que nunca llegaron. Cada uno es un cupo que quedó vacío.',
      tone: 'text-amber-700 dark:text-amber-300',
      borderTone: 'border-amber-200 dark:border-amber-700',
      badge: `${formatNumber(resumen?.noAsistio || 0)} cupos perdidos`,
      badgeTone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    },
    {
      id: 'espera',
      icon: Clock3,
      label: 'Espera media',
      value: formatMinutos(resumen?.esperaMediaMin),
      helper:
        'Desde que el paciente llega a recepción hasta que entra a consulta. Solo cuenta las citas con llegada y atención registradas.',
      tone: 'text-violet-700 dark:text-violet-300',
      badge: `consulta media ${formatMinutos(resumen?.duracionMediaMin)}`,
    },
    {
      id: 'walk-in',
      icon: UserPlus,
      label: 'Llegada espontánea',
      value: formatPercent(resumen?.walkInPct),
      helper: 'Proporción de la agenda que llegó sin cita previa.',
      tone: 'text-blue-700 dark:text-blue-300',
      badge: `${formatNumber(resumen?.walkIn || 0)} sin cita previa`,
      badgeTone: 'bg-accent text-accent-foreground',
    },
  ]

  const selectorPeriodo = (
    <div className="flex overflow-hidden rounded-full border border-border bg-muted">
      {PERIODO_PRESETS.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          onClick={() => setPreset(opcion.id)}
          className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
            preset === opcion.id
              ? 'bg-card text-primary shadow-panel'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opcion.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-5 pt-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Lectura del periodo
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Cuánto se agenda, cuánto se resuelve, cuánto se cae y a qué horas se satura la sala.
          </p>
        </div>
        {selectorPeriodo}
      </div>

      {query.isError && (
        <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          {getErrorMessage(query.error, 'No fue posible cargar la analítica de la agenda.')}
        </div>
      )}

      {cargando ? (
        <div className="space-y-5">
          <SkeletonPanel height="h-[220px]" />
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            <SkeletonPanel height="h-[240px]" />
            <SkeletonPanel height="h-[240px]" />
            <SkeletonPanel height="h-[240px]" className="lg:col-span-2 2xl:col-span-1" />
          </div>
        </div>
      ) : (
        <>
          <KpiGrid items={kpis} columns={5} />

          <LinePanel
            title="Volumen diario de citas"
            subtitle="Agendadas contra efectivamente atendidas. La brecha entre las dos líneas es lo que se cancela o no se presenta."
            data={serieDiaria}
            dataKey="total"
            series={[
              { dataKey: 'total', name: 'Agendadas', color: '#0f4c81' },
              { dataKey: 'completadas', name: 'Completadas', color: '#10b981' },
            ]}
            formatter={formatNumber}
            height="h-[260px]"
            action={
              <Leyenda
                items={[
                  { label: 'Agendadas', color: '#0f4c81' },
                  { label: 'Completadas', color: '#10b981' },
                ]}
              />
            }
            emptyMessage="Aún no hay citas en el periodo seleccionado."
          />

          <div className="grid items-stretch gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            <DonutCard
              title="Estado de las citas"
              subtitle="Cómo cierra el periodo."
              data={estadoChartData}
              centerLabel="Total"
              centerValue={formatNumber(resumen?.totalCitas || 0)}
              formatter={formatNumber}
              layout="stacked"
              chartSize={148}
              emptyMessage="Sin citas."
            />

            <BarPanel
              title="Saturación por hora"
              subtitle="Dónde se acumula la demanda a lo largo del día."
              data={franjaHoraria}
              dataKey="total"
              color="#0f4c81"
              formatter={formatNumber}
              height="h-[260px]"
              emptyMessage="Aún no hay citas para medir la carga horaria."
            />

            <DashboardPanel
              title="Mix de servicios"
              subtitle="Qué se está atendiendo."
              className="lg:col-span-2 2xl:col-span-1"
            >
              {tipoChartData.length > 0 ? (
                <div className="flex flex-col gap-3.5">
                  {tipoChartData
                    .slice()
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 6)
                    .map((item) => (
                      <BarraProporcion
                        key={item.key}
                        name={item.name}
                        value={item.value}
                        total={totalTipos}
                        color={item.color}
                      />
                    ))}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
                  Aún no hay tipos de cita para mostrar.
                </div>
              )}
            </DashboardPanel>
          </div>

          <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <DashboardPanel
              title="Carga por profesional"
              subtitle="Citas del periodo por veterinario, con la porción que no se presentó."
              action={
                <Leyenda
                  items={[
                    { label: 'Atendidas', color: '#10b981' },
                    { label: 'No asistió', color: '#fbbf24' },
                  ]}
                />
              }
            >
              {cargaProfesionales.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {cargaProfesionales.map((profesional) => (
                    <div key={profesional.id || profesional.nombre} className="flex items-center gap-4">
                      <span className="w-40 shrink-0 truncate text-sm font-medium text-card-foreground">
                        {profesional.nombre}
                      </span>
                      <div className="flex h-5 flex-1 overflow-hidden rounded-md bg-muted">
                        <div
                          className="bg-primary transition-all duration-normal"
                          style={{
                            width: `${(profesional.completadas / maxCargaProfesional) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-amber-400 transition-all duration-normal dark:bg-amber-500"
                          style={{
                            width: `${(profesional.noAsistio / maxCargaProfesional) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-card-foreground">
                        {formatNumber(profesional.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
                  Aún no hay citas para medir la carga del equipo.
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel title="Fugas de agenda" subtitle="Por qué se pierden los cupos.">
              <div className="flex h-full flex-col gap-4">
                {topMotivosCancelacion.length > 0 ? (
                  <div className="flex flex-col">
                    {topMotivosCancelacion.map((motivo) => (
                      <div
                        key={motivo.motivo}
                        className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
                      >
                        <span className="min-w-0 flex-1 text-sm capitalize text-card-foreground [overflow-wrap:anywhere]">
                          {motivo.motivo}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-card-foreground">
                          {formatNumber(motivo.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                    No se registraron cancelaciones con motivo en el periodo.
                  </p>
                )}

                <div className="mt-auto rounded-2xl border border-border bg-muted px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Origen de la demanda
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {origenChartData.map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-sm text-card-foreground">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.name}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-card-foreground">
                          {formatNumber(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DashboardPanel>
          </div>
        </>
      )}
    </div>
  )
}
