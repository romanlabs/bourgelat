import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ComparativoPanel, StatusPill } from '@/features/dashboard/dashboardComponents'
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
} from '@/features/finanzas/analisisPeriodo'
import {
  agruparMetodosPago,
  coloresSerie,
  diasDesde,
  leerSerieDiaria,
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

const formatoEje = (valor) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(valor || 0))

const tarjeta = 'rounded-2xl bg-card p-5 sm:p-6'
const botonSecundario =
  'inline-flex h-9 items-center rounded-lg bg-secondary px-3.5 text-[13px] font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const inputFecha =
  'h-10 rounded-lg border border-input bg-card px-3 text-sm tabular-nums text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function SelectorPeriodo({ preset, onPreset, mes, onMes, anio, onAnio, personalizado, onPersonalizado, completo, avisoBloqueo }) {
  const anios = useMemo(() => aniosDisponibles().map((a) => ({ value: String(a), label: String(a) })), [])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Periodo" className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-secondary p-1">
        {PRESETS_ANALISIS.map((opcion) => {
          const bloqueado = opcion.largo && !completo
          return (
            <button
              key={opcion.id}
              type="button"
              onClick={() => onPreset(opcion.id)}
              disabled={bloqueado}
              aria-pressed={preset === opcion.id}
              title={bloqueado ? avisoBloqueo : undefined}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55 ${
                preset === opcion.id
                  ? 'bg-card font-semibold text-foreground'
                  : 'font-medium text-muted-foreground hover:text-foreground'
              }`}
            >
              {bloqueado ? <Lock aria-hidden className="h-3.5 w-3.5" /> : null}
              {opcion.label}
            </button>
          )
        })}
      </div>

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

      {!completo ? (
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Lock aria-hidden className="h-3.5 w-3.5" />
          {avisoBloqueo}
        </p>
      ) : null}
    </div>
  )
}

function TooltipDia({ active, payload }) {
  if (!active || !payload?.length) return null
  const fila = payload[0].payload
  return (
    <div className="min-w-[160px] rounded-xl bg-card px-3.5 py-2.5 shadow-dropdown">
      <p className="mb-1.5 border-b border-border pb-1.5 text-[13px] font-semibold capitalize text-muted-foreground">
        {nombreDia(fila.periodo)} {etiquetaPeriodo(fila.periodo).split(' ')[1]}
      </p>
      <p className="flex justify-between gap-4 text-xs text-muted-foreground">
        Cobrado <span className="font-semibold text-card-foreground">{formatCurrency(fila.ingresos)}</span>
      </p>
      <p className="flex justify-between gap-4 text-xs text-muted-foreground">
        Ventas <span className="font-semibold text-card-foreground">{formatNumber(fila.ventas)}</span>
      </p>
      {fila.vendido > fila.ingresos ? (
        <p className="flex justify-between gap-4 text-xs text-muted-foreground">
          Vendido <span className="font-semibold text-card-foreground">{formatCurrency(fila.vendido)}</span>
        </p>
      ) : null}
    </div>
  )
}

// Una sola serie: no lleva leyenda, el título dice qué es. Hoy va resaltado.
function CobradoPorDia({ serie, colores, ticketPromedio }) {
  const [verTabla, setVerTabla] = useState(false)
  const hoy = hoyLocal()
  const lectura = leerSerieDiaria(serie)
  const datos = serie.map((fila) => ({ ...fila, dia: String(Number(fila.periodo.slice(8, 10))) }))
  const hayDatos = lectura.diasConVentas > 0

  return (
    <section aria-labelledby="f-dias" className={`${tarjeta} flex min-w-0 flex-col gap-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id="f-dias" className="text-lg font-semibold tracking-[-0.02em] text-card-foreground">
          Cobrado por día
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {lectura.mejor ? (
            <span className="text-sm text-muted-foreground">
              Mejor día: {nombreDia(lectura.mejor.periodo)},{' '}
              <span className="font-semibold text-foreground">{formatCurrency(lectura.mejor.ingresos)}</span>
            </span>
          ) : null}
          {hayDatos ? (
            <button type="button" onClick={() => setVerTabla((v) => !v)} aria-expanded={verTabla} className={botonSecundario}>
              {verTabla ? 'Ver gráfica' : 'Ver como tabla'}
            </button>
          ) : null}
        </div>
      </div>

      {!hayDatos ? (
        <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
          Aún no hay ventas en este periodo.
        </div>
      ) : verTabla ? (
        <div className="max-h-[260px] overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-left text-[13px] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Día</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Cobrado</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Ventas</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {serie.filter((f) => f.ingresos > 0 || f.ventas > 0).map((fila) => (
                <tr key={fila.periodo} className="border-t border-border">
                  <td className="px-4 py-2 capitalize">{nombreDia(fila.periodo)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(fila.ingresos)}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(fila.ventas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
            <BarChart data={datos} margin={{ left: 0, right: 4, top: 8, bottom: 0 }} barCategoryGap="18%">
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="dia"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                interval="preserveStartEnd"
                minTickGap={6}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={48}
                tickFormatter={formatoEje}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<TooltipDia />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="ingresos" name="Cobrado" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {datos.map((fila) => (
                  <Cell key={fila.periodo} fill={fila.periodo === hoy ? colores.resalte : colores.ingresos} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <div className="flex gap-1.5">
          <dt>Promedio por día con ventas</dt>
          <dd className="font-semibold text-foreground">{formatCurrency(lectura.promedioDiaConVentas)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Venta promedio</dt>
          <dd className="font-semibold text-foreground">{formatCurrency(ticketPromedio)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Días con ventas</dt>
          <dd className="font-semibold text-foreground">{formatNumber(lectura.diasConVentas)}</dd>
        </div>
      </dl>
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
    <section aria-labelledby="f-queda" className="flex min-w-0 flex-col gap-4 rounded-2xl bg-primary p-5 text-primary-foreground sm:p-6">
      <h2 id="f-queda" className="text-lg font-semibold">{titulo}</h2>
      <div className="flex flex-col gap-1">
        <span className="text-[40px] font-semibold leading-none tracking-[-0.04em]">{formatCurrency(ganancia)}</span>
        <span className="text-sm text-primary-foreground/80">
          {ganancia >= 0 ? 'Ganancia' : 'Pérdida'}
          {resumen.margen !== null && resumen.margen !== undefined
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
          <dd className="font-semibold">−{formatCurrency(resumen.gastos)}</dd>
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
                  {g.porcentaje} % · {formatCurrency(g.valor)}
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

function Destacados({ destacados, porMes }) {
  const tramo = porMes ? 'mes' : 'día'
  const items = [
    { id: 'mejor', label: `Mejor ${tramo}`, dato: destacados?.mejor, ayuda: 'de ganancia' },
    { id: 'peor', label: `${porMes ? 'Mes' : 'Día'} más flojo`, dato: destacados?.peor, ayuda: 'de ganancia' },
    { id: 'gasto', label: `${porMes ? 'Mes' : 'Día'} de más gasto`, dato: destacados?.masGasto, ayuda: 'gastados' },
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
              {formatCurrency(item.dato.valor)} {item.ayuda}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

// Una lista = una serie: todas las barras del mismo color, largo por lo facturado.
function ListaTop({ id, titulo, filas, sinCatalogo, etiquetaSinCatalogo, color }) {
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
                <span className="h-1.5 rounded-full" style={{ width: `${Math.max(2, (f.total / mayor) * 100)}%`, backgroundColor: color }} />
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
  const colores = coloresSerie(oscuro)

  const esAdmin = hasAnyRole(usuario, ['admin', 'superadmin'])
  const completo = esAdmin && tieneFuncionalidad(suscripcion, FUNCIONALIDAD_REPORTES_COMPLETOS)
  const avisoBloqueo = esAdmin
    ? 'Trimestre, año, gastos y ganancia: plan Clínica'
    : 'Los periodos largos y la ganancia los ve administración'
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
  const variacion = data ? badgeVariacion(resumen.ingresos, data.anterior.ingresos, etiquetaAnterior(preset, data.periodo.anterior)) : null
  const serieComparativo = useMemo(
    () => (data?.serie || []).map((fila) => ({ ...fila, name: etiquetaPeriodo(fila.periodo) })),
    [data]
  )

  const irACaja = (tab) => navigate('/caja', { state: { tab } })

  return (
    <div className={`space-y-5 transition-opacity ${analisis.isFetching && data ? 'opacity-70' : ''}`}>
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

      {analisis.isError ? (
        <div className="rounded-xl bg-danger-soft px-4 py-4 text-sm leading-6 text-danger">
          {analisis.error?.response?.data?.message || 'No fue posible cargar el resumen del periodo.'}
        </div>
      ) : null}

      <header className="flex flex-col gap-2">
        <p className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-foreground sm:text-5xl">
          {data ? formatCurrency(resumen.ingresos) : '—'}
          <span className="ml-3 text-xl font-medium tracking-[-0.01em] text-muted-foreground sm:text-2xl">
            cobrados en {nombrePeriodo}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-muted-foreground">
          <span>
            Del {formatShortDate(rango.fechaInicio)} al {formatShortDate(finVisible)}
            {data ? ` · ${formatNumber(resumen.ventas)} ${resumen.ventas === 1 ? 'venta' : 'ventas'}` : ''}
          </span>
          {data && resumen.vendido !== resumen.ingresos ? (
            <span title="Lo facturado incluye las ventas a crédito; lo cobrado, los abonos recibidos.">
              · Vendido <span className="font-semibold text-foreground">{formatCurrency(resumen.vendido)}</span>
            </span>
          ) : null}
          {variacion ? (
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[13px] font-semibold ${variacion.badgeTone}`}>
              {variacion.badge}
            </span>
          ) : null}
        </div>
      </header>

      {!data && analisis.isLoading ? <div className="h-72 animate-pulse rounded-2xl bg-card" /> : null}

      {data ? (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            {porMes ? (
              <ComparativoPanel
                title="Cobrado vs gastos por mes"
                subtitle="La línea es la ganancia de cada mes."
                data={serieComparativo}
                barras={[
                  { dataKey: 'ingresos', name: 'Cobrado', color: colores.ingresos },
                  { dataKey: 'gastos', name: 'Gastos', color: colores.gastos },
                ]}
                linea={{ dataKey: 'ganancia', name: 'Ganancia', color: colores.ganancia }}
                formatter={formatCurrency}
                axisFormatter={formatoEje}
                emptyMessage="No hay movimiento en este periodo."
              />
            ) : (
              <CobradoPorDia serie={data.serie} colores={colores} ticketPromedio={resumen.ticketPromedio} />
            )}
            {verCompleto ? (
              <LoQueQueda
                titulo={preset === 'mes' ? 'Lo que queda del mes' : 'Lo que queda del periodo'}
                resumen={resumen}
                gastosPorCategoria={data.gastosPorCategoria}
              />
            ) : (
              <ComoPagan grupos={grupos} cargando={metodosQuery.isLoading} />
            )}
          </div>

          {verCompleto && porMes ? <Destacados destacados={data.destacados} porMes /> : null}

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
                  color={colores.ingresos}
                />
                <ListaTop
                  id="f-top-productos"
                  titulo="Productos más vendidos"
                  filas={data.topProductos || []}
                  sinCatalogo={data.sinCatalogo?.producto || 0}
                  etiquetaSinCatalogo="Otros productos escritos a mano"
                  color={colores.ingresos}
                />
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
