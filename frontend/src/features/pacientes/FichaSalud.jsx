import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { urlGmailRecordatorio } from './recordatorioVacuna'
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartColors } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { hoyLocal } from '@/lib/fecha'
import { aFechaLocal, fechaCorta, formatoNumero, medicionesDe, mesBarra, mesCorto, soloDia } from './fichaSaludUtils'

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const COLOR_PESO = chartColors.categorica[0]

function TooltipPeso({ active, payload }) {
  if (!active || !payload?.length) return null
  const punto = payload[0].payload
  return (
    <div className="rounded-xl bg-card px-3 py-2 shadow-dropdown">
      <p className="text-xs text-muted-foreground">{fechaCorta(punto.fecha)}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{formatoNumero(punto.valor, 2)} kg</p>
    </div>
  )
}

// Punto de cada consulta; el de la más reciente va relleno y más grande.
function PuntoPeso({ cx, cy, index, ultimo }) {
  if (cx == null || cy == null) return null
  const esUltimo = index === ultimo
  return (
    <circle
      cx={cx}
      cy={cy}
      r={esUltimo ? 5.5 : 4}
      fill={esUltimo ? COLOR_PESO : 'hsl(var(--card))'}
      stroke={COLOR_PESO}
      strokeWidth={2}
    />
  )
}

export function PesoEnElTiempo({ historias }) {
  const pesos = medicionesDe(historias, 'peso').slice(-8)
  if (pesos.length === 0) return null

  const primero = pesos[0]
  const ultimo = pesos[pesos.length - 1]
  const diferencia = ultimo.valor - primero.valor
  const datos = pesos.map((p) => ({
    ...p,
    etiqueta: p.fecha === hoyLocal() ? 'hoy' : mesBarra(p.fecha),
  }))

  const resumen =
    pesos.length === 1
      ? 'Una sola medición'
      : Math.abs(diferencia) < 0.05
        ? `Estable desde ${mesCorto(primero.fecha)}`
        : `${diferencia > 0 ? '+' : '−'}${formatoNumero(Math.abs(diferencia))} kg desde ${mesCorto(primero.fecha)}`

  return (
    <section aria-labelledby="ficha-peso" className="flex flex-col gap-3 rounded-2xl bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="ficha-peso" className="text-lg font-semibold text-foreground">Peso</h2>
          <p className={cn('mt-0.5 text-sm', diferencia < -0.05 ? 'text-warning' : 'text-muted-foreground')}>{resumen}</p>
        </div>
        <p className="shrink-0 text-lg font-semibold tabular-nums text-foreground">{formatoNumero(ultimo.valor, 2)} kg</p>
      </div>
      {pesos.length > 1 ? (
        <div className="relative h-40" role="img" aria-label={`Peso en las últimas ${pesos.length} consultas: ${resumen}`}>
          {/* Fondo solo detrás de las líneas: termina donde empiezan las fechas (eje de 30 px). */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 bottom-[30px] rounded-t-xl bg-muted" />
          <ResponsiveContainer className="relative" width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
            <LineChart data={datos} margin={{ top: 0, right: 12, bottom: 0, left: 12 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 4" />
              <XAxis
                dataKey="etiqueta"
                height={30}
                tickLine={false}
                axisLine={false}
                interval={0}
                padding={{ left: 12, right: 12 }}
                fontSize={11}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                dy={4}
              />
              {/* Margen arriba para que el valor sobre cada punto quepa dentro del fondo. */}
              <YAxis
                hide
                domain={([min, max]) => {
                  const rango = Math.max(max - min, 0.5)
                  return [min - rango * 0.3, max + rango * 0.6]
                }}
              />
              <Tooltip content={<TooltipPeso />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="valor"
                stroke={COLOR_PESO}
                strokeWidth={2.5}
                dot={(props) => <PuntoPeso key={props.index} {...props} ultimo={datos.length - 1} />}
                activeDot={{ r: 6, fill: COLOR_PESO, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="valor"
                  position="top"
                  offset={10}
                  fontSize={11}
                  fontWeight={600}
                  fill="hsl(var(--foreground))"
                  formatter={(valor) => formatoNumero(valor)}
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </section>
  )
}

// Última aplicación de cada vacuna o desparasitación, con su estado según la
// próxima fecha registrada en antecedentes.
function itemsPreventivos(antecedentes) {
  const vacunas = (antecedentes?.vacunas || []).map((v) => ({
    nombre: v.nombre || 'Vacuna',
    tratamiento: v.nombre ? `Vacuna ${v.nombre}` : 'Vacuna',
    fecha: v.fecha,
    proxima: v.proximaDosis,
  }))
  const desparasitaciones = (antecedentes?.desparasitaciones || []).map((d) => ({
    nombre: d.tipo ? `Desparasitación ${String(d.tipo).toLowerCase()}` : 'Desparasitación',
    tratamiento: d.tipo ? `Desparasitación ${String(d.tipo).toLowerCase()}` : 'Desparasitación',
    fecha: d.fecha,
    proxima: d.proximaFecha,
  }))

  const ultimos = new Map()
  for (const item of [...vacunas, ...desparasitaciones]) {
    const clave = item.nombre.trim().toLowerCase()
    const previo = ultimos.get(clave)
    if (!previo || soloDia(item.fecha) > soloDia(previo.fecha)) ultimos.set(clave, item)
  }
  return [...ultimos.values()]
}

const ESTADO = {
  vencida: { label: 'Vencida', clase: 'bg-danger-soft text-danger' },
  pronto: { label: 'Pronto', clase: 'bg-warning-soft text-warning' },
  alDia: { label: 'Al día', clase: 'bg-success-soft text-success' },
}

function estadoDe(proxima) {
  if (!proxima) return null
  const dia = soloDia(proxima)
  if (dia < hoyLocal()) return 'vencida'
  const enUnMes = new Date()
  enUnMes.setDate(enUnMes.getDate() + 30)
  return aFechaLocal(dia) <= enUnMes ? 'pronto' : 'alDia'
}

export function VacunasYDesparasitacion({ antecedentes, cargando, mascotaId, mascotaNombre, tutor }) {
  const items = itemsPreventivos(antecedentes)
  const clinica = useAuthStore((state) => state.clinica)

  return (
    <section aria-labelledby="ficha-vacunas" className="flex flex-col gap-3 rounded-2xl bg-card p-6">
      <h2 id="ficha-vacunas" className="text-lg font-semibold text-foreground">Vacunas y desparasitación</h2>
      {cargando ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      ) : items.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          Aún no hay vacunas ni desparasitaciones registradas para {mascotaNombre}.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => {
            const estado = estadoDe(item.proxima)
            const texto =
              estado === 'vencida'
                ? `Tocaba el ${fechaCorta(item.proxima)}`
                : item.fecha
                  ? `Aplicada el ${fechaCorta(item.fecha)}`
                  : item.proxima
                    ? `Próxima el ${fechaCorta(item.proxima)}`
                    : 'Sin fecha'
            return (
              <li key={item.nombre} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-foreground">{item.nombre}</span>
                  <span className="block text-[13px] text-muted-foreground">{texto}</span>
                  {(estado === 'vencida' || estado === 'pronto') && tutor ? (
                    tutor.email ? (
                      <a
                        href={urlGmailRecordatorio({
                          tutorEmail: tutor.email,
                          tutorNombre: tutor.nombre,
                          mascotaNombre,
                          tratamiento: item.tratamiento,
                          proxima: item.proxima,
                          clinica,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`mt-1 inline-flex items-center gap-1.5 rounded text-[13px] font-semibold text-primary hover:underline ${FOCO}`}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Recordar al tutor
                      </a>
                    ) : (
                      <span className="mt-1 block text-[13px] text-muted-foreground">El tutor no tiene correo registrado</span>
                    )
                  ) : null}
                </span>
                {estado ? (
                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', ESTADO[estado].clase)}>
                    {ESTADO[estado].label}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      <Link
        to={`/antecedentes?mascotaId=${mascotaId}`}
        className={`inline-flex h-10 items-center justify-center self-start rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px ${FOCO}`}
      >
        {items.length === 0 ? 'Registrar antecedentes' : 'Ver antecedentes'}
      </Link>
    </section>
  )
}
