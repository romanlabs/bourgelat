import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { formatCurrency, formatNumber, formatShortDate } from '@/features/dashboard/dashboardUtils'
import { useMediosPago } from '@/features/finanzas/useAdministracion'
import { PAYMENT_METHOD_ICONS } from '@/features/finanzas/finanzasConstants'
import { badgeVariacion, etiquetaAnterior, etiquetaPeriodo } from '@/features/finanzas/analisisPeriodo'
import { hastaHoy } from '@/features/finanzas/resumenFinanzas'
import {
  CONFIG_MEDIOS,
  colorMedio,
  etiquetaMedio,
  mediosVisibles,
  netoDelGrupo,
  semanaDesdeLunes,
} from '@/features/finanzas/mediosPago'
import SelectorPeriodo from '@/features/finanzas/SelectorPeriodo'
import {
  botonSegmento,
  pesosCompactos,
  segmentado,
  tarjeta,
  usePeriodoAnalisis,
} from '@/features/finanzas/finanzasUi'
import { hasAnyRole } from '@/lib/permissions'
import { tieneFuncionalidad, FUNCIONALIDAD_REPORTES_COMPLETOS } from '@/lib/suscripcion'
import { hoyLocal } from '@/lib/fecha'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'

const MotionDiv = motion.div
const MotionSpan = motion.span
const MotionLi = motion.li

// Movimiento corto y sin rebote: son cifras de dinero.
const SUAVE = [0.22, 1, 0.36, 1]
const CLAVE_MEDIO = 'bourgelat.finanzas.medio'

const leerMedioGuardado = () => {
  try {
    return localStorage.getItem(CLAVE_MEDIO) || 'todos'
  } catch {
    return 'todos'
  }
}

const guardarMedio = (id) => {
  try {
    localStorage.setItem(CLAVE_MEDIO, id)
  } catch {
    // Sin almacenamiento solo se pierde recordar el último medio.
  }
}

// La cifra titular cuenta hasta su nuevo valor al cambiar de medio o periodo.
// Va por un MotionValue: el conteo no re-renderiza el panel en cada cuadro.
function CifraAnimada({ valor }) {
  const reducir = useReducedMotion()
  const cifra = useMotionValue(valor)
  const texto = useTransform(cifra, (v) => formatCurrency(Math.round(v)))

  useEffect(() => {
    if (reducir) {
      cifra.set(valor)
      return undefined
    }
    const control = animate(cifra, valor, { duration: 0.4, ease: SUAVE })
    return () => control.stop()
  }, [cifra, valor, reducir])

  return <MotionSpan className="tabular-nums">{texto}</MotionSpan>
}

// Barra de largo proporcional que crece desde cero al aparecer.
function BarraCrece({ porcentaje, color, className = 'h-1.5', claseRelleno = '' }) {
  const reducir = useReducedMotion()
  const ancho = `${Math.max(porcentaje > 0 ? 2 : 0, porcentaje)}%`
  return (
    <span aria-hidden className={`flex rounded-full bg-muted ${className}`}>
      <MotionSpan
        className={`rounded-full ${className} ${claseRelleno}`}
        style={color ? { backgroundColor: color } : undefined}
        initial={reducir ? false : { width: 0 }}
        animate={{ width: ancho }}
        transition={{ duration: 0.45, ease: SUAVE }}
      />
    </span>
  )
}

function SelectorMedio({ medios, seleccionado, onSeleccionar, oscuro }) {
  const reducir = useReducedMotion()
  const opciones = [{ id: 'todos', label: 'Todos', participacion: null }, ...medios.map((m) => ({ ...m, label: etiquetaMedio(m.id) }))]

  return (
    <LayoutGroup id="selector-medio">
      <div role="radiogroup" aria-label="Medio de pago" className="flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl bg-secondary p-1">
        {opciones.map((opcion) => {
          const activo = seleccionado === opcion.id
          const Icono = PAYMENT_METHOD_ICONS[opcion.id]
          return (
            <motion.button
              key={opcion.id}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onSeleccionar(opcion.id)}
              whileTap={reducir ? undefined : { scale: 0.98 }}
              className={`relative flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activo ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
              }`}
            >
              {/* El fondo del medio activo se desliza de un chip al otro. */}
              {activo ? (
                <MotionSpan
                  layoutId="medio-activo"
                  aria-hidden
                  className="absolute inset-0 rounded-lg bg-card"
                  transition={reducir ? { duration: 0 } : { duration: 0.25, ease: SUAVE }}
                />
              ) : null}
              <span className="relative flex items-center gap-2">
                {Icono ? (
                  <Icono aria-hidden className="h-4 w-4" style={{ color: colorMedio(opcion.id, { oscuro }) }} />
                ) : null}
                {opcion.label}
                {opcion.participacion !== null && opcion.participacion !== undefined ? (
                  <span className="text-[12px] font-medium tabular-nums text-muted-foreground">
                    {opcion.participacion < 1 && opcion.participacion > 0 ? '<1' : Math.round(opcion.participacion)} %
                  </span>
                ) : null}
              </span>
            </motion.button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

function Vacio({ children }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-muted px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

// ── Vista «Todos»: comparar los medios ─────────────────────────────────────

function Reparto({ medios, total, oscuro, onSeleccionar, nombreAnterior }) {
  const reducir = useReducedMotion()
  const mayor = Math.max(1, ...medios.map((m) => m.cobrado))

  return (
    <section aria-labelledby="m-reparto" className={`${tarjeta} flex min-w-0 flex-col gap-5`}>
      <div>
        <h2 id="m-reparto" className="text-lg font-semibold tracking-[-0.02em] text-card-foreground">Dónde entra la plata</h2>
        <p className="mt-1 text-sm text-muted-foreground">Lo cobrado de contado más los abonos, por el medio con que se pagó. Toca un medio para ver su detalle.</p>
      </div>

      {total > 0 ? (
        <div aria-hidden className="flex h-4 gap-[2px] overflow-hidden rounded-full">
          {medios.filter((m) => m.cobrado > 0).map((m, i) => (
            <MotionSpan
              key={m.id}
              style={{ backgroundColor: colorMedio(m.id, { oscuro }), flexGrow: m.cobrado }}
              initial={reducir ? false : { scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: reducir ? 0 : i * 0.05, ease: SUAVE }}
            />
          ))}
        </div>
      ) : null}

      <motion.ol
        className="flex flex-col gap-1"
        initial={reducir ? false : 'oculto'}
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
      >
        {medios.map((m) => {
          const cambio = badgeVariacion(m.cobrado, m.anterior, nombreAnterior)
          return (
            <MotionLi
              key={m.id}
              variants={{ oculto: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: SUAVE } } }}
            >
              <button
                type="button"
                onClick={() => onSeleccionar(m.id)}
                className="flex w-full flex-col gap-1.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: colorMedio(m.id, { oscuro }) }} />
                    {etiquetaMedio(m.id)}
                    <span className="text-[13px] font-normal text-muted-foreground">
                      {formatNumber(m.operaciones)} {m.operaciones === 1 ? 'pago' : 'pagos'}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${cambio.badgeTone}`}>{cambio.badge}</span>
                    <span className="font-semibold">{formatCurrency(m.cobrado)}</span>
                  </span>
                </span>
                <BarraCrece porcentaje={(m.cobrado / mayor) * 100} color={colorMedio(m.id, { oscuro })} />
              </button>
            </MotionLi>
          )
        })}
      </motion.ol>
    </section>
  )
}

function SerieTodos({ serie, medios, porMes }) {
  const reducir = useReducedMotion()
  const [verTabla, setVerTabla] = useState(false)
  const filas = useMemo(() => hastaHoy(serie, hoyLocal()), [serie])
  const usados = medios.filter((m) => m.cobrado > 0)

  return (
    <section aria-labelledby="m-serie" className={`${tarjeta} flex min-w-0 flex-col gap-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="m-serie" className="text-lg font-semibold tracking-[-0.02em] text-card-foreground">
            {porMes ? 'Mes a mes por medio' : 'Día a día por medio'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Cada barra es lo cobrado en el {porMes ? 'mes' : 'día'}, partida por medio.</p>
        </div>
        <div role="group" aria-label="Vista" className={segmentado}>
          <button type="button" aria-pressed={!verTabla} onClick={() => setVerTabla(false)} className={botonSegmento(!verTabla)}>Gráfica</button>
          <button type="button" aria-pressed={verTabla} onClick={() => setVerTabla(true)} className={botonSegmento(verTabla)}>Tabla</button>
        </div>
      </div>

      {!usados.length ? (
        <Vacio>Aún no hay cobros en este periodo.</Vacio>
      ) : verTabla ? (
        <div className="max-h-[300px] overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="sticky top-0 bg-card text-left text-[13px] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">{porMes ? 'Mes' : 'Día'}</th>
                {usados.map((m) => (
                  <th key={m.id} scope="col" className="px-4 py-2 text-right font-medium">{etiquetaMedio(m.id)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {filas
                .filter((fila) => porMes || usados.some((m) => fila[m.id] > 0))
                .map((fila) => (
                  <tr key={fila.periodo} className="border-t border-border">
                    <td className="px-4 py-2 capitalize">{etiquetaPeriodo(fila.periodo)}</td>
                    {usados.map((m) => (
                      <td key={m.id} className="px-4 py-2 text-right">{fila[m.id] ? formatCurrency(fila[m.id]) : '—'}</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ChartContainer config={CONFIG_MEDIOS} className="aspect-auto h-[280px] w-full">
          <BarChart accessibilityLayer data={filas} margin={{ left: 0, right: 4, top: 8 }} barCategoryGap={porMes ? '30%' : '20%'}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="periodo" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} tickFormatter={etiquetaPeriodo} />
            <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={pesosCompactos} />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => <span className="capitalize">{etiquetaPeriodo(payload?.[0]?.payload?.periodo)}</span>}
                  valueFormatter={(valor) => formatCurrency(valor)}
                />
              }
            />
            {usados.map((m, i) => (
              <Bar
                key={m.id}
                dataKey={m.id}
                stackId="medios"
                fill={`var(--color-${m.id})`}
                radius={i === usados.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={44}
                isAnimationActive={!reducir}
                animationDuration={500}
              />
            ))}
          </BarChart>
        </ChartContainer>
      )}
    </section>
  )
}

// ── Vista de un medio ──────────────────────────────────────────────────────

function SerieMedio({ serie, medio, porMes }) {
  const reducir = useReducedMotion()
  const [verTabla, setVerTabla] = useState(false)
  const filas = useMemo(() => hastaHoy(serie, hoyLocal()), [serie])
  const conCobro = filas.filter((fila) => fila[medio.id] > 0)
  const mejor = conCobro.reduce((elegido, fila) => (!elegido || fila[medio.id] > elegido[medio.id] ? fila : elegido), null)
  const etiqueta = etiquetaMedio(medio.id)

  return (
    <section aria-labelledby="m-serie-medio" className={`${tarjeta} flex min-w-0 flex-col gap-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="m-serie-medio" className="text-lg font-semibold tracking-[-0.02em] text-card-foreground">
            {etiqueta} {porMes ? 'mes a mes' : 'día a día'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mejor ? (
              <>
                Mejor {porMes ? 'mes' : 'día'}: <span className="capitalize">{etiquetaPeriodo(mejor.periodo)}</span>,{' '}
                <span className="font-semibold text-foreground">{formatCurrency(mejor[medio.id])}</span>
              </>
            ) : (
              'Sin cobros por este medio en el periodo.'
            )}
          </p>
        </div>
        {conCobro.length ? (
          <div role="group" aria-label="Vista" className={segmentado}>
            <button type="button" aria-pressed={!verTabla} onClick={() => setVerTabla(false)} className={botonSegmento(!verTabla)}>Gráfica</button>
            <button type="button" aria-pressed={verTabla} onClick={() => setVerTabla(true)} className={botonSegmento(verTabla)}>Tabla</button>
          </div>
        ) : null}
      </div>

      {!conCobro.length ? (
        <Vacio>Nadie pagó con {etiqueta.toLowerCase()} en este periodo.</Vacio>
      ) : verTabla ? (
        <div className="max-h-[280px] overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-left text-[13px] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">{porMes ? 'Mes' : 'Día'}</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Cobrado</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {(porMes ? filas : conCobro).map((fila) => (
                <tr key={fila.periodo} className="border-t border-border">
                  <td className="px-4 py-2 capitalize">{etiquetaPeriodo(fila.periodo)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(fila[medio.id])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ChartContainer config={CONFIG_MEDIOS} className="aspect-auto h-[260px] w-full">
          {porMes ? (
            <BarChart accessibilityLayer data={filas} margin={{ left: 0, right: 4, top: 8 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} />
              <XAxis dataKey="periodo" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={etiquetaPeriodo} />
              <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={pesosCompactos} />
              <ChartTooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                content={<ChartTooltipContent hideIndicator labelFormatter={(_, p) => <span className="capitalize">{etiquetaPeriodo(p?.[0]?.payload?.periodo)}</span>} valueFormatter={(v) => formatCurrency(v)} />}
              />
              <Bar dataKey={medio.id} fill={`var(--color-${medio.id})`} radius={[5, 5, 0, 0]} maxBarSize={44} isAnimationActive={!reducir} animationDuration={500} />
            </BarChart>
          ) : (
            <AreaChart accessibilityLayer data={filas} margin={{ left: 0, right: 8, top: 8 }}>
              <defs>
                <linearGradient id={`relleno-${medio.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${medio.id})`} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={`var(--color-${medio.id})`} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="periodo" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} tickFormatter={etiquetaPeriodo} />
              <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={pesosCompactos} />
              <ChartTooltip
                content={<ChartTooltipContent indicator="line" labelFormatter={(_, p) => <span className="capitalize">{etiquetaPeriodo(p?.[0]?.payload?.periodo)}</span>} valueFormatter={(v) => formatCurrency(v)} />}
              />
              <Area
                dataKey={medio.id}
                type="monotone"
                stroke={`var(--color-${medio.id})`}
                strokeWidth={2.5}
                fill={`url(#relleno-${medio.id})`}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                isAnimationActive={!reducir}
                animationDuration={500}
              />
            </AreaChart>
          )}
        </ChartContainer>
      )}

      <motion.dl
        className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4"
        initial={reducir ? false : 'oculto'}
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {[
          ['Pago promedio', formatCurrency(medio.ticketPromedio)],
          ['Pagos', formatNumber(medio.operaciones)],
          ['De ventas de contado', formatCurrency(medio.deVentas)],
          ['De abonos a crédito', formatCurrency(medio.deAbonos)],
        ].map(([dt, dd]) => (
          <MotionDiv
            key={dt}
            className="flex flex-col gap-0.5"
            variants={{ oculto: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: SUAVE } } }}
          >
            <dt className="text-[13px] text-muted-foreground">{dt}</dt>
            <dd className="text-lg font-semibold tabular-nums text-card-foreground">{dd}</dd>
          </MotionDiv>
        ))}
      </motion.dl>
    </section>
  )
}

// Lo que queda por este medio después de los gastos pagados con él. Los gastos
// se registran por grupo, así que el neto es del grupo (Nequi suma con
// transferencia y Daviplata).
function NetoDelMedio({ neto }) {
  const varios = neto.medios.length > 1
  return (
    <section aria-labelledby="m-neto" className="flex h-fit min-w-0 flex-col gap-4 rounded-2xl bg-primary p-5 text-primary-foreground sm:p-6">
      <h2 id="m-neto" className="text-lg font-semibold">Lo que queda en {neto.nombre}</h2>
      <div className="flex flex-col gap-1">
        <span className="text-[40px] font-semibold leading-none tracking-[-0.04em]">
          <CifraAnimada valor={neto.neto} />
        </span>
        <span className="text-sm text-primary-foreground/80">
          {neto.neto >= 0 ? 'Cobrado menos lo que se pagó por este medio' : 'Por este medio salió más de lo que entró'}
        </span>
      </div>
      <dl className="flex flex-col gap-2 text-[15px] tabular-nums">
        <div className="flex justify-between gap-4">
          <dt className="text-primary-foreground/80">Cobrado{varios ? ` (${neto.medios.map(etiquetaMedio).join(', ')})` : ''}</dt>
          <dd className="font-semibold">{formatCurrency(neto.cobrado)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-primary-foreground/80">Gastos pagados así</dt>
          <dd className="font-semibold">{neto.gastos > 0 ? '−' : ''}{formatCurrency(neto.gastos)}</dd>
        </div>
      </dl>
      {neto.grupo === 'efectivo' ? (
        <p className="text-[13px] text-primary-foreground/80">Es la plata física que debió quedar entre las cajas del periodo, sin contar el fondo.</p>
      ) : varios ? (
        <p className="text-[13px] text-primary-foreground/80">Los gastos se registran por grupo: este neto suma todos sus medios.</p>
      ) : null}
    </section>
  )
}

function QueDias({ medio, oscuro }) {
  const semana = semanaDesdeLunes(medio.porDiaSemana)
  const mayor = Math.max(1, ...semana.map((d) => d.valor))
  const color = colorMedio(medio.id, { oscuro })

  return (
    <section aria-labelledby="m-dias" className={`${tarjeta} flex flex-col gap-4`}>
      <div>
        <h2 id="m-dias" className="text-lg font-semibold text-card-foreground">Qué días pagan así</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Lo cobrado por {etiquetaMedio(medio.id).toLowerCase()} según el día de la semana.</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {semana.map((dia) => (
          <li key={dia.id} className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
            <span className="text-muted-foreground">{dia.label}</span>
            <BarraCrece porcentaje={(dia.valor / mayor) * 100} color={color} className="h-2" />
            <span className="text-right font-semibold tabular-nums">{dia.valor ? formatCurrency(dia.valor) : '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function MediosPagoPanel() {
  const reducir = useReducedMotion()
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const oscuro = useThemeStore((state) => state.dark)
  const completo =
    hasAnyRole(usuario, ['admin', 'superadmin']) && tieneFuncionalidad(suscripcion, FUNCIONALIDAD_REPORTES_COMPLETOS)

  const periodo = usePeriodoAnalisis()
  const { preset, rango, nombrePeriodo } = periodo
  const [seleccionado, setSeleccionado] = useState(leerMedioGuardado)
  const consulta = useMediosPago(rango)
  const data = consulta.data

  const visibles = useMemo(() => mediosVisibles(data?.medios), [data])
  const medio = seleccionado === 'todos' ? null : data?.medios.find((m) => m.id === seleccionado) || null
  // Un medio elegido antes sigue en el selector aunque este periodo no tenga cobros.
  const enSelector = medio && !visibles.some((m) => m.id === medio.id) ? [...visibles, medio] : visibles
  const neto = medio ? netoDelGrupo(data.medios, medio.id) : null
  const porMes = data?.periodo?.granularidad === 'mes'

  const valor = medio ? medio.cobrado : data?.total || 0
  const anterior = medio ? medio.anterior : data?.totalAnterior || 0
  const nombreAnterior = data ? etiquetaAnterior(preset, data.periodo.anterior) : ''
  const comparacion = data && (valor || anterior) ? badgeVariacion(valor, anterior, nombreAnterior) : null
  const operaciones = medio ? medio.operaciones : visibles.reduce((suma, m) => suma + m.operaciones, 0)
  const finVisible = rango.fechaFin > hoyLocal() ? hoyLocal() : rango.fechaFin

  const seleccionar = (id) => {
    setSeleccionado(id)
    guardarMedio(id)
  }

  return (
    <div className={`space-y-5 transition-opacity ${consulta.isFetching && data ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        {!data ? (
          <div aria-hidden className="h-[76px] w-80 max-w-full animate-pulse rounded-2xl bg-card" />
        ) : (
          <header className="flex flex-col gap-2">
            <p className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-foreground sm:text-5xl">
              <CifraAnimada valor={valor} />
              <span className="ml-3 text-xl font-medium tracking-[-0.01em] text-muted-foreground sm:text-2xl">
                {medio ? `cobrados por ${etiquetaMedio(medio.id).toLowerCase()}` : 'cobrados'} en {nombrePeriodo}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-muted-foreground">
              <span>
                Del {formatShortDate(rango.fechaInicio)} al {formatShortDate(finVisible)} · {formatNumber(operaciones)}{' '}
                {operaciones === 1 ? 'pago' : 'pagos'}
                {medio && data.total > 0 ? ` · ${medio.participacion.toLocaleString('es-CO')} % de lo cobrado` : ''}
              </span>
              {!medio && data.porCobrarDelPeriodo > 0 ? (
                <span title="Ventas a crédito del periodo que aún no se pagan: no entraron por ningún medio.">
                  · Quedó por cobrar <span className="font-semibold text-foreground">{formatCurrency(data.porCobrarDelPeriodo)}</span>
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
          onPreset={periodo.setPreset}
          mes={periodo.mes}
          onMes={periodo.setMes}
          anio={periodo.anio}
          onAnio={periodo.setAnio}
          personalizado={periodo.personalizado}
          onPersonalizado={periodo.setPersonalizado}
          completo={completo}
          avisoBloqueo="plan Clínica"
        />
      </div>

      {data ? <SelectorMedio medios={enSelector} seleccionado={medio ? medio.id : 'todos'} onSeleccionar={seleccionar} oscuro={oscuro} /> : null}

      {consulta.isError ? (
        <div className="rounded-xl bg-danger-soft px-4 py-4 text-sm leading-6 text-danger">
          {consulta.error?.response?.data?.message || 'No fue posible cargar los medios de pago del periodo.'}
        </div>
      ) : null}
      {!data && consulta.isLoading ? <div className="h-72 animate-pulse rounded-2xl bg-card" /> : null}

      {data ? (
        <AnimatePresence mode="wait" initial={false}>
          <MotionDiv
            key={medio ? medio.id : 'todos'}
            initial={reducir ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducir ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: SUAVE }}
            className="space-y-5"
          >
            {medio ? (
              <>
                <div className={neto ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]' : ''}>
                  <SerieMedio serie={data.serie} medio={medio} porMes={porMes} />
                  {neto ? <NetoDelMedio neto={neto} /> : null}
                </div>
                {medio.cobrado > 0 ? <QueDias medio={medio} oscuro={oscuro} /> : null}
              </>
            ) : (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {visibles.length ? (
                  <Reparto medios={visibles} total={data.total} oscuro={oscuro} onSeleccionar={seleccionar} nombreAnterior={nombreAnterior} />
                ) : (
                  <section className={tarjeta}>
                    <Vacio>Aún no hay cobros en este periodo.</Vacio>
                  </section>
                )}
                <SerieTodos serie={data.serie} medios={visibles} porMes={porMes} />
              </div>
            )}
          </MotionDiv>
        </AnimatePresence>
      ) : null}
    </div>
  )
}
