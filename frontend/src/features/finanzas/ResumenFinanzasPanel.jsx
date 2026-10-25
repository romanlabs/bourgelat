import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line, Rectangle, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatCurrency, formatNumber, formatShortDate } from '@/features/dashboard/dashboardUtils'
import { useAnalisisPeriodo } from '@/features/finanzas/useAdministracion'
import { finanzasApi } from '@/features/finanzas/finanzasApi'
import { CATEGORIAS_GASTO } from '@/features/finanzas/finanzasConstants'
import { ESTADO_LABELS, getEstadoTone } from '@/features/finanzas/useFinanzasHistorial'
import {
  PRESETS_ANALISIS,
  aniosDisponibles,
  badgeVariacion,
  etiquetaAnterior,
  etiquetaPeriodo,
  rangoDelAnio,
  rangoTrimestreActual,
  rangoUltimos12Meses,
  variacion,
} from '@/features/finanzas/analisisPeriodo'
import {
  CONFIG_SERIE,
  agruparMetodosPago,
  curvaAcumulada,
  diasDesde,
  estadoMes,
  hastaHoy,
  leerSerieDiaria,
  mesAnterior,
  nombreDia,
  nombreMes,
  rangoDelMes,
} from '@/features/finanzas/resumenFinanzas'
import { Select } from '@/components/ui/select'
import { canAccessModule, hasAnyRole } from '@/lib/permissions'
import { tieneFuncionalidad, FUNCIONALIDAD_REPORTES_COMPLETOS } from '@/lib/suscripcion'
import { mesLocal, hoyLocal } from '@/lib/fecha'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'

const ETIQUETAS_CATEGORIA = Object.fromEntries(CATEGORIAS_GASTO.map((c) => [c.value, c.label]))
const TOP_CATEGORIAS = 5

const compacto = (valor) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(valor || 0))
const pesosCompactos = (valor) => `${Number(valor) < 0 ? '−' : ''}$${compacto(Math.abs(Number(valor || 0)))}`

const tarjeta = 'rounded-2xl bg-card p-5 sm:p-6'
const segmentado = 'flex gap-1 rounded-lg bg-secondary p-1'
const botonSegmento = (activo) =>
  `h-8 rounded-md px-3 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    activo ? 'bg-card font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
  }`
const inputFecha =
  'h-10 rounded-lg border border-input bg-card px-3 text-sm tabular-nums text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function SelectorPeriodo({ preset, onPreset, mes, onMes, anio, onAnio, personalizado, onPersonalizado, completo, avisoBloqueo }) {
  const anios = useMemo(() => aniosDisponibles().map((a) => ({ value: String(a), label: String(a) })), [])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Desplegable y no botones: cabe junto a la cifra sin bajar a otra fila. */}
      <Select
        aria-label="Periodo"
        value={preset}
        onValueChange={onPreset}
        options={PRESETS_ANALISIS.map((opcion) => ({
          value: opcion.id,
          label: opcion.largo && !completo ? `${opcion.label} · ${avisoBloqueo}` : opcion.label,
          disabled: opcion.largo && !completo,
        }))}
      />

      {preset === 'mes' ? (
        <input
          type="month"
          value={mes}
          max={mesLocal()}
          onChange={(e) => e.target.value && onMes(e.target.value)}
          aria-label="Mes"
          className={inputFecha}
        />
      ) : null}

      {preset === 'anio' ? (
        <Select aria-label="Año" value={String(anio)} onValueChange={(valor) => onAnio(Number(valor))} options={anios} />
      ) : null}

      {preset === 'personalizado' ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={personalizado.fechaInicio}
            max={personalizado.fechaFin}
            onChange={(e) => e.target.value && onPersonalizado({ ...personalizado, fechaInicio: e.target.value })}
            aria-label="Fecha inicial del periodo"
            className={inputFecha}
          />
          <span className="text-sm text-muted-foreground">a</span>
          <input
            type="date"
            value={personalizado.fechaFin}
            min={personalizado.fechaInicio}
            onChange={(e) => e.target.value && onPersonalizado({ ...personalizado, fechaFin: e.target.value })}
            aria-label="Fecha final del periodo"
            className={inputFecha}
          />
        </div>
      ) : null}

    </div>
  )
}

function TablaSerie({ filas, etiqueta, columnaTramo, conGastos }) {
  return (
    <div className="max-h-[280px] overflow-y-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card text-left text-[13px] text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">{columnaTramo}</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Cobrado</th>
            {conGastos ? <th scope="col" className="px-4 py-2 text-right font-medium">Gastos</th> : null}
            {conGastos ? <th scope="col" className="px-4 py-2 text-right font-medium">Ganancia</th> : null}
            <th scope="col" className="px-4 py-2 text-right font-medium">Ventas</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {filas.map((fila) => (
            <tr key={fila.periodo} className="border-t border-border">
              <td className="px-4 py-2 capitalize">{etiqueta(fila.periodo)}</td>
              <td className="px-4 py-2 text-right font-semibold">{formatCurrency(fila.ingresos)}</td>
              {conGastos ? <td className="px-4 py-2 text-right">{formatCurrency(fila.gastos)}</td> : null}
              {conGastos ? (
                <td className={`px-4 py-2 text-right font-semibold ${fila.ganancia < 0 ? 'text-danger' : 'text-success'}`}>
                  {formatCurrency(fila.ganancia)}
                </td>
              ) : null}
              <td className="px-4 py-2 text-right">{formatNumber(fila.ventas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Curva de lo cobrado acumulado contra el mes anterior y, en el mes en curso,
// la proyección al ritmo que va. Responde «¿voy mejor o peor?» aunque haya
// pocos días con ventas.
function CobradoAcumulado({ serie, serieAnterior, nombreAnterior, ticketPromedio }) {
  const [verTabla, setVerTabla] = useState(false)
  const hoy = hoyLocal()
  const lectura = leerSerieDiaria(serie)
  const curva = useMemo(() => curvaAcumulada(serie, serieAnterior || [], hoy), [serie, serieAnterior, hoy])
  const hayDatos = lectura.diasConVentas > 0
  const conAnterior = (serieAnterior || []).some((fila) => fila.ingresos > 0) && curva.anteriorALaFecha !== null
  const diferencia = conAnterior ? curva.llevado - curva.anteriorALaFecha : null
  const ultimoDia = curva.filas.length
  const ticks = [1, 5, 10, 15, 20, 25, ultimoDia].filter((d, i, arr) => d <= ultimoDia && arr.indexOf(d) === i)

  return (
    <section aria-labelledby="f-dias" className={`${tarjeta} flex min-w-0 flex-col gap-4`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex flex-col gap-1">
          <h2 id="f-dias" className="text-lg font-semibold tracking-[-0.02em] text-card-foreground">Cobrado en el mes</h2>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {conAnterior ? (
              <>
                {nombreAnterior} a esta fecha: <span className="font-semibold text-foreground">{formatCurrency(curva.anteriorALaFecha)}</span>
                {' · '}
                <span className={`font-semibold ${diferencia < 0 ? 'text-danger' : 'text-success'}`}>
                  {diferencia < 0 ? '−' : '+'}{formatCurrency(Math.abs(diferencia))}
                </span>
              </>
            ) : lectura.mejor ? (
              <>
                Mejor día: <span className="capitalize">{nombreDia(lectura.mejor.periodo)}</span>,{' '}
                <span className="font-semibold text-foreground">{formatCurrency(lectura.mejor.ingresos)}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {curva.cierre !== null && hayDatos ? (
            <span className="rounded-lg bg-secondary px-3 py-1.5 text-[13px] text-muted-foreground">
              A este ritmo cierras en <span className="font-semibold text-foreground">{formatCurrency(curva.cierre)}</span>
            </span>
          ) : null}
          {hayDatos ? (
            <div role="group" aria-label="Vista" className={segmentado}>
              <button type="button" aria-pressed={!verTabla} onClick={() => setVerTabla(false)} className={botonSegmento(!verTabla)}>
                Gráfica
              </button>
              <button type="button" aria-pressed={verTabla} onClick={() => setVerTabla(true)} className={botonSegmento(verTabla)}>
                Tabla
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!hayDatos ? (
        <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
          Aún no hay ventas en este periodo.
        </div>
      ) : verTabla ? (
        <TablaSerie
          filas={hastaHoy(serie, hoy).filter((f) => f.ingresos > 0 || f.ventas > 0)}
          etiqueta={nombreDia}
          columnaTramo="Día"
        />
      ) : (
        <ChartContainer config={CONFIG_SERIE} className="aspect-auto h-[260px] w-full">
          <ComposedChart accessibilityLayer data={curva.filas} margin={{ left: 0, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="relleno-cobrado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-ingresos)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--color-ingresos)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="dia" type="number" domain={[1, ultimoDia]} ticks={ticks} tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={pesosCompactos} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const fila = payload?.[0]?.payload
                    if (!fila) return null
                    const dif = fila.ingresos !== null && fila.anterior !== null ? fila.ingresos - fila.anterior : null
                    return (
                      <span className="flex flex-col gap-0.5">
                        <span className="capitalize">{nombreDia(fila.periodo)}</span>
                        {dif !== null ? (
                          <span className={dif < 0 ? 'text-danger' : 'text-success'}>
                            {dif < 0 ? '−' : '+'}{formatCurrency(Math.abs(dif))} vs {nombreAnterior}
                          </span>
                        ) : null}
                      </span>
                    )
                  }}
                  valueFormatter={(valor) => formatCurrency(valor)}
                />
              }
            />
            <ChartLegend verticalAlign="top" itemSorter={null} content={<ChartLegendContent verticalAlign="top" className="justify-start" />} />
            <Area
              dataKey="ingresos"
              name="ingresos"
              type="monotone"
              stroke="var(--color-ingresos)"
              strokeWidth={2.5}
              fill="url(#relleno-cobrado)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
            />
            {conAnterior ? (
              <Line dataKey="anterior" name="anterior" type="monotone" stroke="var(--color-anterior)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ) : null}
            {curva.cierre !== null ? (
              <Line
                dataKey="proyeccion"
                name="proyeccion"
                type="linear"
                stroke="var(--color-proyeccion)"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                dot={false}
                activeDot={false}
              />
            ) : null}
          </ComposedChart>
        </ChartContainer>
      )}

      <dl className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
        {[
          ['Promedio por día con ventas', formatCurrency(lectura.promedioDiaConVentas)],
          ['Venta promedio', formatCurrency(ticketPromedio)],
          ['Días con ventas', formatNumber(lectura.diasConVentas)],
        ].map(([dt, dd]) => (
          <div key={dt} className="flex flex-col gap-0.5">
            <dt className="text-[13px] text-muted-foreground">{dt}</dt>
            <dd className="text-lg font-semibold text-card-foreground">{dd}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// Cifra de la ganancia en el extremo de cada barra: arriba si se ganó, abajo
// si se perdió. Texto en tinta, no en el color de la barra.
function EtiquetaGanancia({ x, y, width, height, value }) {
  if (value === null || value === undefined) return null
  const arriba = Math.min(y, y + height)
  const abajo = Math.max(y, y + height)
  return (
    <text x={x + width / 2} y={value >= 0 ? arriba - 6 : abajo + 14} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
      {pesosCompactos(value)}
    </text>
  )
}

// Redondea el extremo de la barra (arriba en ganancia, abajo en pérdida) y deja
// recto el lado que toca el cero.
function BarraGanancia(props) {
  const { payload } = props
  const positiva = (payload?.ganancia ?? 0) >= 0
  return (
    <Rectangle
      {...props}
      fill={positiva ? "var(--color-positivo)" : "var(--color-negativo)"}
      radius={positiva ? [5, 5, 0, 0] : [0, 0, 5, 5]}
    />
  )
}

function TarjetaMes({ fila, mayor, onAbrir }) {
  const estado = estadoMes(fila)
  const futuro = estado === 'futuro'
  const apagado = futuro || estado === 'sinMovimiento'
  const nombre = nombreMes(fila.periodo)

  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir(fila.periodo)}
        disabled={futuro}
        aria-label={`Ver ${nombre} ${fila.periodo.slice(0, 4)}`}
        className={`flex h-full w-full flex-col gap-2 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          estado === 'actual'
            ? 'border-primary/40 bg-card'
            : futuro
              ? 'cursor-default border-dashed border-border bg-transparent'
              : apagado
                ? 'border-transparent bg-muted/60 hover:border-border'
                : 'border-border bg-card hover:border-primary/40'
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold capitalize ${apagado ? 'text-muted-foreground' : 'text-card-foreground'}`}>{nombre}</span>
          {estado === 'actual' ? (
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">En curso</span>
          ) : null}
        </span>
        {futuro ? (
          <span className="text-sm text-muted-foreground">Aún no llega</span>
        ) : estado === 'sinMovimiento' ? (
          <span className="text-sm text-muted-foreground">Sin movimiento</span>
        ) : (
          <>
            <span className="text-xl font-semibold tracking-[-0.02em] text-card-foreground">{formatCurrency(fila.ingresos)}</span>
            <span aria-hidden className="flex h-1.5 rounded-full bg-muted">
              <span className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(fila.ingresos > 0 ? 3 : 0, (fila.ingresos / mayor) * 100)}%` }} />
            </span>
            <span className="flex flex-wrap justify-between gap-x-3 text-[13px] tabular-nums">
              <span className="text-muted-foreground">Gastos {formatCurrency(fila.gastos)}</span>
              <span className={`font-semibold ${fila.ganancia < 0 ? 'text-danger' : 'text-success'}`}>
                {fila.ganancia < 0 ? 'Pérdida' : 'Ganancia'} {formatCurrency(Math.abs(fila.ganancia))}
              </span>
            </span>
          </>
        )}
      </button>
    </li>
  )
}

function PeriodoPorMes({ serie, onAbrirMes }) {
  const [vista, setVista] = useState('meses')
  const pasados = useMemo(() => hastaHoy(serie), [serie])
  const mayor = Math.max(1, ...serie.map((f) => f.ingresos))
  // Un mes sin movimiento no tiene barra: no es «ganancia cero».
  const conMovimiento = useMemo(
    () => pasados.map((f) => ({ ...f, ganancia: f.ingresos || f.gastos ? f.ganancia : null })),
    [pasados]
  )
  const columnas = serie.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-3 lg:grid-cols-4'

  return (
    <section aria-labelledby="f-meses" className={`${tarjeta} flex min-w-0 flex-col gap-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="f-meses" className="text-lg font-semibold tracking-[-0.02em] text-card-foreground">Mes a mes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {vista === 'meses'
              ? 'Toca un mes para ver su detalle.'
              : vista === 'grafica'
                ? 'Ganancia o pérdida de cada mes. Pasa el cursor para ver cobrado y gastos.'
                : 'Las mismas cifras, mes por mes.'}
          </p>
        </div>
        <div role="group" aria-label="Vista" className={segmentado}>
          {[['meses', 'Meses'], ['grafica', 'Gráfica'], ['tabla', 'Tabla']].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={vista === id} onClick={() => setVista(id)} className={botonSegmento(vista === id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {vista === 'meses' ? (
        <ol className={`grid grid-cols-2 gap-3 ${columnas}`}>
          {serie.map((fila) => (
            <TarjetaMes key={fila.periodo} fila={fila} mayor={mayor} onAbrir={onAbrirMes} />
          ))}
        </ol>
      ) : vista === 'tabla' ? (
        <TablaSerie filas={pasados} etiqueta={etiquetaPeriodo} columnaTramo="Mes" conGastos />
      ) : (
        <ChartContainer config={CONFIG_SERIE} className="aspect-auto h-[300px] w-full">
          <BarChart accessibilityLayer data={conMovimiento} margin={{ left: 0, right: 4, top: 22, bottom: 8 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="periodo"
              tickLine={false}
              axisLine={false}
              interval={0}
              tickMargin={8}
              tickFormatter={(periodo) => etiquetaPeriodo(periodo).split(" ")[0]}
              className="capitalize"
            />
            {/* Aire arriba y abajo para que la cifra de la barra no pise el eje. */}
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={pesosCompactos}
              domain={[(min) => Math.min(0, min * 1.18), (max) => Math.max(0, max * 1.18)]}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideIndicator
                  labelFormatter={(_, payload) => {
                    const fila = payload?.[0]?.payload
                    if (!fila) return null
                    return (
                      <span className="flex flex-col gap-1">
                        <span className="capitalize">{etiquetaPeriodo(fila.periodo)}</span>
                        <span className="flex justify-between gap-4 font-normal text-muted-foreground">
                          Cobrado <span className="font-semibold text-card-foreground">{formatCurrency(fila.ingresos)}</span>
                        </span>
                        <span className="flex justify-between gap-4 font-normal text-muted-foreground">
                          Gastos <span className="font-semibold text-card-foreground">{formatCurrency(fila.gastos)}</span>
                        </span>
                      </span>
                    )
                  }}
                  valueFormatter={(valor) => (
                    <span className={valor < 0 ? "text-danger" : "text-success"}>{formatCurrency(valor)}</span>
                  )}
                />
              }
            />
            <Bar dataKey="ganancia" name="positivo" shape={<BarraGanancia />} maxBarSize={44}>
              <LabelList dataKey="ganancia" content={<EtiquetaGanancia />} />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </section>
  )
}

function LoQueQueda({ titulo, resumen, gastosPorCategoria }) {
  const ganancia = Number(resumen.ganancia || 0)
  const categorias = Object.entries(gastosPorCategoria || {})
    .map(([id, valor]) => ({ id, label: ETIQUETAS_CATEGORIA[id] || id, valor: Number(valor || 0) }))
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor)
  const principales = categorias.slice(0, TOP_CATEGORIAS)
  const resto = categorias.slice(TOP_CATEGORIAS).reduce((suma, c) => suma + c.valor, 0)
  if (resto > 0) principales.push({ id: 'resto', label: 'Otras categorías', valor: resto })
  const mayor = principales[0]?.valor || 1

  return (
    <section aria-labelledby="f-queda" className="flex min-w-0 flex-col gap-4 self-start rounded-2xl bg-primary p-5 text-primary-foreground sm:p-6">
      <h2 id="f-queda" className="text-lg font-semibold">{titulo}</h2>
      <div className="flex flex-col gap-1">
        <span className="text-[40px] font-semibold leading-none tracking-[-0.04em]">{formatCurrency(ganancia)}</span>
        <span className="text-sm text-primary-foreground/80">
          {ganancia >= 0 ? 'Ganancia' : 'Pérdida: los gastos superan lo cobrado'}
          {ganancia >= 0 && resumen.margen !== null && resumen.margen !== undefined
            ? ` · ${resumen.margen.toLocaleString('es-CO')} % de lo cobrado`
            : ''}
        </span>
      </div>
      <dl className="flex flex-col gap-2 text-[15px] tabular-nums">
        <div className="flex justify-between gap-4">
          <dt className="text-primary-foreground/80">Cobrado</dt>
          <dd className="font-semibold">{formatCurrency(resumen.ingresos)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-primary-foreground/80">Gastos</dt>
          <dd className="font-semibold">{resumen.gastos > 0 ? '−' : ''}{formatCurrency(resumen.gastos)}</dd>
        </div>
      </dl>
      {principales.length ? (
        <ul aria-label="Gastos por categoría" className="flex flex-col gap-3 pt-1">
          {principales.map((c) => (
            <li key={c.id} className="flex flex-col gap-1.5">
              <span className="flex justify-between gap-3 text-sm">
                <span>{c.label}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(c.valor)}</span>
              </span>
              <span aria-hidden className="flex h-1.5 rounded-full bg-primary-foreground/15">
                <span className="h-1.5 rounded-full bg-primary-foreground" style={{ width: `${Math.max(2, (c.valor / mayor) * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-primary-foreground/80">No hay gastos registrados en el periodo.</p>
      )}
    </section>
  )
}

function ComoPagan({ grupos, cargando }) {
  return (
    <section aria-labelledby="f-metodos" className={`${tarjeta} flex flex-col gap-4`}>
      <div>
        <h2 id="f-metodos" className="text-lg font-semibold text-card-foreground">Cómo pagan</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Sobre lo vendido en el periodo.</p>
      </div>
      {grupos.length ? (
        <>
          <div aria-hidden className="flex h-3 gap-[2px] overflow-hidden rounded-full">
            {grupos.map((g) => (
              <span key={g.id} style={{ flexGrow: g.valor, backgroundColor: g.color }} />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-3 text-sm">
            {grupos.map((g) => (
              <li key={g.id} className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: g.color }} />
                  {g.label}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {g.porcentaje === 0 ? '<1' : g.porcentaje} % · {formatCurrency(g.valor)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{cargando ? 'Cargando…' : 'Sin ventas en el periodo.'}</p>
      )}
    </section>
  )
}

function PorCobrar({ resumen, onVerCuentas }) {
  const monto = Number(resumen?.porCobrar || 0)
  const dias = diasDesde(resumen?.creditoMasAntiguo)
  const creditos = Number(resumen?.creditosPendientes || 0)

  return (
    <section aria-labelledby="f-cobrar" className="flex flex-col gap-2 rounded-2xl bg-warning-soft p-5 text-warning sm:p-6">
      <h2 id="f-cobrar" className="text-lg font-semibold">Por cobrar</h2>
      <span className="text-[34px] font-semibold leading-none tracking-[-0.03em]">{formatCurrency(monto)}</span>
      <span className="text-sm">
        {creditos === 0
          ? 'No hay ventas a crédito pendientes.'
          : `${formatNumber(creditos)} ${creditos === 1 ? 'venta' : 'ventas'} a crédito${
              dias !== null ? ` · la más antigua de hace ${dias} ${dias === 1 ? 'día' : 'días'}` : ''
            }`}
      </span>
      {creditos > 0 && onVerCuentas ? (
        <button
          type="button"
          onClick={onVerCuentas}
          className="mt-2 inline-flex h-10 w-fit items-center rounded-lg bg-card px-4 text-sm font-semibold text-warning transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver cuentas
        </button>
      ) : null}
    </section>
  )
}

function VentasRecientes({ facturas, cargando, onVerHistorial }) {
  return (
    <section aria-labelledby="f-recientes" className="min-w-0 overflow-hidden rounded-2xl bg-card">
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5 sm:px-6">
        <h2 id="f-recientes" className="text-lg font-semibold text-card-foreground">Ventas recientes</h2>
        {onVerHistorial ? (
          <button type="button" onClick={onVerHistorial} className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Ver historial
          </button>
        ) : null}
      </div>
      {facturas.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-[13px] text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium sm:px-6">Venta</th>
                <th scope="col" className="px-3 py-2 font-medium">Cliente · responsable</th>
                <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                <th scope="col" className="px-5 py-2 text-right font-medium sm:px-6">Total</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-5 py-3 sm:px-6">
                    <span className="block font-semibold">{f.numero}</span>
                    <span className="block text-[13px] text-muted-foreground">{formatShortDate(f.fecha)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="block">{f.propietario?.nombre || 'Mostrador'}</span>
                    <span className="block text-[13px] text-muted-foreground">{f.usuario?.nombre || '—'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill tone={getEstadoTone(f.estado)}>{ESTADO_LABELS[f.estado] || f.estado}</StatusPill>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums sm:px-6">
                    {formatCurrency(f.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 pb-6 pt-2 text-sm text-muted-foreground sm:px-6">
          {cargando ? 'Cargando…' : 'Aún no hay ventas en este periodo.'}
        </p>
      )}
    </section>
  )
}

function Destacados({ destacados }) {
  const items = [
    { id: 'mejor', label: 'Mejor mes', dato: destacados?.mejor, ayuda: 'de ganancia' },
    { id: 'peor', label: 'Mes más flojo', dato: destacados?.peor, ayuda: 'de ganancia' },
    { id: 'gasto', label: 'Mes de más gasto', dato: destacados?.masGasto, ayuda: 'gastados' },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.id} className={`${tarjeta} flex flex-col gap-1`}>
          <span className="text-sm text-muted-foreground">{item.label}</span>
          <span className="text-xl font-semibold capitalize text-card-foreground">
            {item.dato ? etiquetaPeriodo(item.dato.periodo) : '—'}
          </span>
          {item.dato ? (
            <span className="text-[13px] text-muted-foreground">
              {item.dato.valor < 0 && item.ayuda === 'de ganancia'
                ? `${formatCurrency(Math.abs(item.dato.valor))} de pérdida`
                : `${formatCurrency(item.dato.valor)} ${item.ayuda}`}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

// Una lista = una serie: todas las barras del mismo color, largo por lo facturado.
function ListaTop({ id, titulo, filas, sinCatalogo, etiquetaSinCatalogo }) {
  const mayor = Math.max(1, ...filas.map((f) => f.total))
  return (
    <section aria-labelledby={id} className={`${tarjeta} flex min-w-0 flex-col gap-3`}>
      <h3 id={id} className="text-base font-semibold text-card-foreground">{titulo}</h3>
      {filas.length ? (
        <ol className="flex flex-col gap-3">
          {filas.map((f) => (
            <li key={f.id} className="flex flex-col gap-1.5">
              <span className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{f.nombre}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="text-muted-foreground">{formatNumber(f.cantidad)} · </span>
                  <span className="font-semibold">{formatCurrency(f.total)}</span>
                </span>
              </span>
              <span aria-hidden className="flex h-1.5 rounded-full bg-muted">
                <span className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(2, (f.total / mayor) * 100)}%` }} />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Sin ventas en el periodo.</p>
      )}
      {sinCatalogo > 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {etiquetaSinCatalogo}: <span className="font-semibold text-foreground">{formatCurrency(sinCatalogo)}</span>
        </p>
      ) : null}
    </section>
  )
}

export default function ResumenFinanzasPanel() {
  const navigate = useNavigate()
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const oscuro = useThemeStore((state) => state.dark)

  const esAdmin = hasAnyRole(usuario, ['admin', 'superadmin'])
  const completo = esAdmin && tieneFuncionalidad(suscripcion, FUNCIONALIDAD_REPORTES_COMPLETOS)
  const avisoBloqueo = esAdmin
    ? 'plan Clínica'
    : 'solo administración'
  const puedeVerCaja = canAccessModule(usuario, 'caja')

  const [preset, setPreset] = useState('mes')
  const [mes, setMes] = useState(() => mesLocal())
  const [anio, setAnio] = useState(() => new Date().getFullYear())
  const [personalizado, setPersonalizado] = useState(() => rangoUltimos12Meses())

  const rango = useMemo(() => {
    if (preset === 'trimestre') return rangoTrimestreActual()
    if (preset === 'anio') return rangoDelAnio(anio)
    if (preset === '12m') return rangoUltimos12Meses()
    if (preset === 'personalizado') return personalizado
    return rangoDelMes(mes)
  }, [preset, mes, anio, personalizado])

  const analisis = useAnalisisPeriodo(rango)
  // La curva del mes se compara día a día con el mes anterior completo.
  const mesPrevio = mesAnterior(mes)
  const analisisPrevio = useAnalisisPeriodo(rangoDelMes(mesPrevio), { enabled: preset === 'mes' })
  const metodosQuery = useQuery({
    queryKey: ['finanzas-ingresos', rango.fechaInicio, rango.fechaFin],
    queryFn: () => finanzasApi.obtenerReporteIngresos(rango),
    placeholderData: (prev) => prev,
  })
  const recientesQuery = useQuery({
    queryKey: ['finanzas-facturas-resumen', 'recientes', rango.fechaInicio, rango.fechaFin],
    queryFn: () => finanzasApi.obtenerFacturas({ ...rango, pagina: 1, limite: 6 }),
    placeholderData: (prev) => prev,
  })

  const data = analisis.data
  const resumen = data?.resumen
  const verCompleto = data?.alcance === 'completo'
  const porMes = data?.periodo?.granularidad === 'mes'
  const grupos = useMemo(
    () => agruparMetodosPago(metodosQuery.data?.ingresosPorMetodoPago, { oscuro }),
    [metodosQuery.data, oscuro]
  )

  const nombrePeriodo =
    preset === 'mes' ? nombreMes(mes)
      : preset === 'anio' ? String(anio)
        : preset === 'trimestre' ? 'el trimestre'
          : preset === '12m' ? 'los últimos 12 meses'
            : 'el periodo'
  const finVisible = rango.fechaFin > hoyLocal() ? hoyLocal() : rango.fechaFin
  // Sin datos del periodo anterior no hay comparación: no se muestra un aviso vacío.
  const hayComparacion = data && variacion(resumen.ingresos, data.anterior.ingresos) !== null
  const comparacion = hayComparacion
    ? badgeVariacion(resumen.ingresos, data.anterior.ingresos, etiquetaAnterior(preset, data.periodo.anterior))
    : null

  const irACaja = (tab) => navigate('/caja', { state: { tab } })
  const abrirMes = (periodo) => {
    setMes(periodo)
    setPreset('mes')
  }

  return (
    <div className={`space-y-5 transition-opacity ${analisis.isFetching && data ? 'opacity-70' : ''}`}>
      {/* La cifra y el periodo en una sola fila: el número es el titular. */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        {!data ? (
          <div aria-hidden className="h-[76px] w-80 max-w-full animate-pulse rounded-2xl bg-card" />
        ) : (
          <header className="flex flex-col gap-2">
            <p className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-foreground sm:text-5xl">
              {formatCurrency(resumen.ingresos)}
              <span className="ml-3 text-xl font-medium tracking-[-0.01em] text-muted-foreground sm:text-2xl">
                cobrados en {nombrePeriodo}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-muted-foreground">
              <span>
                Del {formatShortDate(rango.fechaInicio)} al {formatShortDate(finVisible)} · {formatNumber(resumen.ventas)}{' '}
                {resumen.ventas === 1 ? 'venta' : 'ventas'}
              </span>
              {resumen.vendido !== resumen.ingresos ? (
                <span title="Lo facturado incluye las ventas a crédito; lo cobrado, los abonos recibidos.">
                  · Vendido <span className="font-semibold text-foreground">{formatCurrency(resumen.vendido)}</span>
                </span>
              ) : null}
              {comparacion ? (
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[13px] font-semibold ${comparacion.badgeTone}`}>
                  {comparacion.badge}
                </span>
              ) : null}
            </div>
          </header>
        )}
        <SelectorPeriodo
          preset={preset}
          onPreset={setPreset}
          mes={mes}
          onMes={setMes}
          anio={anio}
          onAnio={setAnio}
          personalizado={personalizado}
          onPersonalizado={setPersonalizado}
          completo={completo}
          avisoBloqueo={avisoBloqueo}
        />
      </div>

      {analisis.isError ? (
        <div className="rounded-xl bg-danger-soft px-4 py-4 text-sm leading-6 text-danger">
          {analisis.error?.response?.data?.message || 'No fue posible cargar el resumen del periodo.'}
        </div>
      ) : null}
      {!data && analisis.isLoading ? <div className="h-72 animate-pulse rounded-2xl bg-card" /> : null}

      {data ? (
        <>
          <div className={porMes ? 'space-y-5' : 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]'}>
            {porMes ? (
              <PeriodoPorMes serie={data.serie} onAbrirMes={abrirMes} />
            ) : (
              <CobradoAcumulado
                serie={data.serie}
                serieAnterior={preset === 'mes' ? analisisPrevio.data?.serie : null}
                nombreAnterior={nombreMes(mesPrevio)}
                ticketPromedio={resumen.ticketPromedio}
              />
            )}
            {verCompleto && !porMes ? (
              <LoQueQueda titulo="Lo que queda del mes" resumen={resumen} gastosPorCategoria={data.gastosPorCategoria} />
            ) : null}
            {!verCompleto ? <ComoPagan grupos={grupos} cargando={metodosQuery.isLoading} /> : null}
          </div>

          {verCompleto && porMes ? (
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <Destacados destacados={data.destacados} />
              <LoQueQueda
                titulo={`Lo que queda ${preset === 'anio' ? 'del año' : preset === 'trimestre' ? 'del trimestre' : 'del periodo'}`}
                resumen={resumen}
                gastosPorCategoria={data.gastosPorCategoria}
              />
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <VentasRecientes
              facturas={recientesQuery.data?.facturas || []}
              cargando={recientesQuery.isLoading}
              onVerHistorial={puedeVerCaja ? () => irACaja('historial') : null}
            />
            <div className="flex flex-col gap-5">
              {verCompleto ? <ComoPagan grupos={grupos} cargando={metodosQuery.isLoading} /> : null}
              <PorCobrar resumen={resumen} onVerCuentas={puedeVerCaja ? () => irACaja('cobrar') : null} />
            </div>
          </div>

          {verCompleto ? (
            <section aria-labelledby="f-vendes" className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="f-vendes" className="text-lg font-semibold text-foreground">Qué vendes</h2>
                <p className="text-sm text-muted-foreground">
                  Servicios <span className="font-semibold text-foreground">{formatCurrency(data.ingresosPorTipo?.servicio)}</span>
                  {' · '}Productos <span className="font-semibold text-foreground">{formatCurrency(data.ingresosPorTipo?.producto)}</span>
                  {' · '}antes de descuentos generales
                </p>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <ListaTop
                  id="f-top-servicios"
                  titulo="Servicios que más facturan"
                  filas={data.topServicios || []}
                  sinCatalogo={data.sinCatalogo?.servicio || 0}
                  etiquetaSinCatalogo="Otros servicios escritos a mano"
                />
                <ListaTop
                  id="f-top-productos"
                  titulo="Productos más vendidos"
                  filas={data.topProductos || []}
                  sinCatalogo={data.sinCatalogo?.producto || 0}
                  etiquetaSinCatalogo="Otros productos escritos a mano"
                />
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
