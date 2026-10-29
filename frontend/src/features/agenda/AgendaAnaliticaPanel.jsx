import { chartColors } from '@/lib/theme'
import { CalendarClock } from 'lucide-react'

import { BarPanel, DashboardPanel, LinePanel } from '@/features/dashboard/dashboardComponents'
import { PERIODO_PRESETS, formatNumber } from '@/features/dashboard/dashboardUtils'
import { EmptyState, SkeletonPanel } from '@/components/shared'
import { useAgendaAnalitica } from './useAgendaAnalitica'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const formatPercent = (value) => `${Number(value || 0).toFixed(1).replace('.', ',')}%`
// 0 es una espera real de menos de un minuto (llegada y atención casi juntas),
// distinta de null, que es no tener ninguna cita con los dos tiempos registrados.
const formatMinutos = (value) =>
  value === null || value === undefined ? 'Sin datos' : value < 1 ? '< 1 min' : `${formatNumber(value)} min`

// Segmentos de la barra por profesional: los mismos colores que su leyenda. El
// resto (programadas, en espera, canceladas) también se dibuja, para que dos
// profesionales con el mismo total tengan barras del mismo largo.
const SEGMENTOS_PROFESIONAL = [
  { key: 'completadas', label: 'Atendidas', color: chartColors.estados.success },
  { key: 'noAsistio', label: 'No asistió', color: chartColors.estados.dangerSuave },
  { key: 'otras', label: 'Por atender o canceladas', color: chartColors.estados.neutro },
]

function Leyenda({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="h-1 w-4 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

/**
 * Barra de proporción con etiqueta. Se usa para el estado de las citas y los
 * tipos de cita: con diez categorías un donut se vuelve ilegible, y lo que
 * importa es el orden.
 */
function BarraProporcion({ name, value, total, color }) {
  const porcentaje = total > 0 ? (value / total) * 100 : 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm text-card-foreground">{name}</span>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-muted-foreground">
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

function ListaProporcion({ items, limite }) {
  const total = items.reduce((suma, item) => suma + item.value, 0)
  const ordenados = items.slice().sort((a, b) => b.value - a.value)

  return (
    <div className="flex flex-col gap-3.5">
      {(limite ? ordenados.slice(0, limite) : ordenados).map((item) => (
        <BarraProporcion key={item.key} name={item.name} value={item.value} total={total} color={item.color} />
      ))}
    </div>
  )
}

/**
 * Resumen del periodo: un solo bloque con las cifras separadas por líneas, en
 * vez de cinco tarjetas con iconos y chips que competían entre sí.
 */
function ResumenPeriodo({ items }) {
  return (
    <div className="grid grid-cols-2 gap-y-5 rounded-2xl bg-card px-2 py-5 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-border">
      {items.map((item) => (
        <div key={item.id} title={item.ayuda} className="flex min-w-0 flex-col gap-1.5 px-4">
          <span className="text-sm text-muted-foreground">{item.label}</span>
          <span
            className={`text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums ${item.tono || 'text-card-foreground'}`}
          >
            {item.valor}
          </span>
          <span className="text-[13px] leading-5 text-muted-foreground">{item.detalle}</span>
        </div>
      ))}
    </div>
  )
}

function Vacio({ children }) {
  return (
    <div className="flex h-[160px] items-center justify-center rounded-xl bg-muted px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

/**
 * Tab de analítica de la agenda.
 *
 * Lectura de arriba abajo: resumen → tendencia diaria → cómo terminan las citas
 * y qué se atiende → cuándo llegan y quién las atiende. Todo cuelga del mismo
 * rango de fechas (el selector de la cabecera).
 */
export function AgendaAnaliticaPanel({ puedeVerAnalitica }) {
  const {
    preset,
    setPreset,
    query,
    resumen,
    estadoChartData,
    tipoChartData,
    serieDiaria,
    franjaHoraria,
    cargaProfesionales,
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
  const noAsistio = resumen?.noAsistio || 0

  const resumenItems = [
    {
      id: 'total',
      label: 'Citas',
      valor: formatNumber(resumen?.totalCitas || 0),
      detalle: `${formatNumber(resumen?.completadas || 0)} completadas`,
      ayuda: 'Todas las citas agendadas dentro del rango seleccionado.',
    },
    {
      id: 'asistencia',
      label: 'Asistencia',
      valor: formatPercent(resumen?.tasaAsistencia),
      detalle: 'de las citas ya resueltas',
      ayuda:
        'Completadas sobre las citas ya resueltas (completadas, canceladas y no asistió). Las que siguen programadas no cuentan.',
    },
    {
      id: 'no-show',
      label: 'No asistió',
      valor: formatPercent(resumen?.tasaNoShow),
      detalle: noAsistio === 1 ? '1 cupo perdido' : `${formatNumber(noAsistio)} cupos perdidos`,
      tono: noAsistio > 0 ? 'text-warning' : undefined,
      ayuda: 'Pacientes que nunca llegaron. Cada uno es un cupo que quedó vacío.',
    },
    {
      id: 'espera',
      label: 'Espera media',
      valor: formatMinutos(resumen?.esperaMediaMin),
      detalle: `consulta de ${formatMinutos(resumen?.duracionMediaMin)}`,
      ayuda:
        'Desde que el paciente llega a recepción hasta que entra a consulta. Solo cuenta las citas con llegada y atención registradas.',
    },
    {
      id: 'walk-in',
      label: 'Sin cita previa',
      valor: formatPercent(resumen?.walkInPct),
      detalle: `${formatNumber(resumen?.walkIn || 0)} llegaron sin agendar`,
      ayuda: 'Proporción de la agenda que llegó sin cita previa.',
    },
  ]

  // Control segmentado sobre la hoja (no sobre el fondo de la página, donde se
  // perdía): el periodo elegido queda marcado con el tono de acento.
  const selectorPeriodo = (
    <div
      role="group"
      aria-label="Periodo"
      className="inline-flex w-fit shrink-0 gap-1 rounded-xl border border-border bg-card p-1"
    >
      {PERIODO_PRESETS.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          onClick={() => setPreset(opcion.id)}
          aria-pressed={preset === opcion.id}
          className={`h-8 whitespace-nowrap rounded-lg px-3 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            preset === opcion.id
              ? 'bg-accent font-semibold text-accent-foreground'
              : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {opcion.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-5 pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
            Lectura del periodo
          </h2>
          <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
            Cuánto se agenda, cuánto se atiende y a qué horas se llena la sala.
          </p>
        </div>
        {selectorPeriodo}
      </div>

      {query.isError && (
        <div className="rounded-xl bg-warning-soft px-4 py-3.5 text-sm font-medium leading-6 text-warning">
          {getErrorMessage(query.error, 'No fue posible cargar la analítica de la agenda.')}
        </div>
      )}

      {cargando ? (
        <div className="space-y-5">
          <SkeletonPanel height="h-[110px]" />
          <SkeletonPanel height="h-[260px]" />
          <div className="grid gap-5 lg:grid-cols-2">
            <SkeletonPanel height="h-[240px]" />
            <SkeletonPanel height="h-[240px]" />
          </div>
        </div>
      ) : (
        <>
          <ResumenPeriodo items={resumenItems} />

          <LinePanel
            title="Volumen diario de citas"
            subtitle="Agendadas contra atendidas. La brecha entre las dos líneas es lo que se cancela o no se presenta."
            data={serieDiaria}
            dataKey="total"
            series={[
              { dataKey: 'total', name: 'Agendadas', color: chartColors.categorica[1] },
              { dataKey: 'completadas', name: 'Completadas', color: chartColors.estados.success },
            ]}
            formatter={formatNumber}
            height="h-[260px]"
            action={
              <Leyenda
                items={[
                  { label: 'Agendadas', color: chartColors.categorica[1] },
                  { label: 'Completadas', color: chartColors.estados.success },
                ]}
              />
            }
            emptyMessage="Aún no hay citas en el periodo seleccionado."
          />

          <div className="grid items-stretch gap-5 lg:grid-cols-2">
            <DashboardPanel title="Cómo terminan las citas" subtitle="Estado de las citas del periodo.">
              {estadoChartData.length > 0 ? (
                <div className="flex flex-col gap-5">
                  <ListaProporcion items={estadoChartData} />
                  {/* Solo si hubo cancelaciones con motivo: un recuadro vacío
                      ocupaba media fila sin decir nada. */}
                  {topMotivosCancelacion.length > 0 ? (
                    <div className="border-t border-border pt-4">
                      <p className="text-[13px] font-semibold text-muted-foreground">Por qué se cancelan</p>
                      <div className="mt-1 flex flex-col divide-y divide-border">
                        {topMotivosCancelacion.map((motivo) => (
                          <div key={motivo.motivo} className="flex items-center justify-between gap-3 py-2.5">
                            <span className="min-w-0 flex-1 text-sm capitalize text-card-foreground [overflow-wrap:anywhere]">
                              {motivo.motivo}
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-card-foreground">
                              {formatNumber(motivo.total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Vacio>Sin citas en el periodo.</Vacio>
              )}
            </DashboardPanel>

            <DashboardPanel title="Qué se atiende" subtitle="Tipos de cita, de más a menos frecuente.">
              {tipoChartData.length > 0 ? (
                <ListaProporcion items={tipoChartData} limite={8} />
              ) : (
                <Vacio>Aún no hay tipos de cita para mostrar.</Vacio>
              )}
            </DashboardPanel>
          </div>

          <div className="grid items-stretch gap-5 lg:grid-cols-2">
            <BarPanel
              title="Cuándo llegan"
              subtitle="Citas por hora del día. Las barras altas son las horas en que se llena la sala."
              data={franjaHoraria}
              dataKey="total"
              color={chartColors.categorica[1]}
              formatter={formatNumber}
              height="h-[240px]"
              emptyMessage="Aún no hay citas para medir la carga horaria."
            />

            <DashboardPanel
              title="Carga por profesional"
              subtitle="Citas del periodo por veterinario y cómo terminaron."
            >
              {cargaProfesionales.length > 0 ? (
                <div className="flex flex-col gap-5">
                  <Leyenda items={SEGMENTOS_PROFESIONAL} />
                  <div className="flex flex-col gap-4">
                    {cargaProfesionales.map((profesional) => (
                      <div key={profesional.id || profesional.nombre} className="flex items-center gap-4">
                        <span className="w-32 shrink-0 truncate text-sm font-medium text-card-foreground">
                          {profesional.nombre}
                        </span>
                        <div className="flex h-5 flex-1 overflow-hidden rounded-md bg-muted">
                          {SEGMENTOS_PROFESIONAL.map((segmento) => {
                            const valor =
                              segmento.key === 'otras'
                                ? profesional.total - profesional.completadas - profesional.noAsistio
                                : profesional[segmento.key]
                            return (
                              <div
                                key={segmento.key}
                                title={`${segmento.label}: ${formatNumber(valor)}`}
                                className="transition-all duration-normal"
                                style={{
                                  width: `${(Math.max(0, valor) / maxCargaProfesional) * 100}%`,
                                  backgroundColor: segmento.color,
                                }}
                              />
                            )
                          })}
                        </div>
                        <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-card-foreground">
                          {formatNumber(profesional.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Vacio>Aún no hay citas para medir la carga del equipo.</Vacio>
              )}
            </DashboardPanel>
          </div>
        </>
      )}
    </div>
  )
}
