import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { hoyLocal } from '@/lib/fecha'
import { aFechaLocal, fechaCorta, formatoNumero, medicionesDe, mesBarra, mesCorto, soloDia } from './fichaSaludUtils'

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function PesoEnElTiempo({ historias }) {
  const pesos = medicionesDe(historias, 'peso').slice(-6)
  if (pesos.length === 0) return null

  const primero = pesos[0]
  const ultimo = pesos[pesos.length - 1]
  const diferencia = ultimo.valor - primero.valor
  const max = Math.max(...pesos.map((p) => p.valor))
  const min = Math.min(...pesos.map((p) => p.valor))

  const resumen =
    pesos.length === 1
      ? 'Una sola medición'
      : Math.abs(diferencia) < 0.05
        ? `Estable desde ${mesCorto(primero.fecha)}`
        : `${diferencia > 0 ? '+' : '−'}${formatoNumero(Math.abs(diferencia))} kg desde ${mesCorto(primero.fecha)}`

  return (
    <section aria-labelledby="ficha-peso" className="flex flex-col gap-4 rounded-2xl bg-card p-6">
      <div>
        <h2 id="ficha-peso" className="text-lg font-semibold text-foreground">Peso</h2>
        <p className={cn('mt-0.5 text-sm', diferencia < -0.05 ? 'text-warning' : 'text-muted-foreground')}>{resumen}</p>
      </div>
      <ol className="flex h-28 items-end gap-2" aria-label="Peso en cada consulta">
        {pesos.map((p, i) => {
          // Escala entre el mínimo y el máximo para que se note el cambio.
          const alto = max === min ? 70 : 30 + ((p.valor - min) / (max - min)) * 70
          const esUltimo = i === pesos.length - 1
          return (
            <li key={`${p.fecha}-${i}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-xs font-semibold tabular-nums text-foreground">{formatoNumero(p.valor)}</span>
              <span
                className={cn('w-full max-w-9 rounded-md', esUltimo ? 'bg-primary' : 'bg-primary/25')}
                style={{ height: `${alto}%` }}
              />
              <span className="truncate text-[11px] text-muted-foreground">
                {p.fecha === hoyLocal() ? 'hoy' : mesBarra(p.fecha)}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// Última aplicación de cada vacuna o desparasitación, con su estado según la
// próxima fecha registrada en antecedentes.
function itemsPreventivos(antecedentes) {
  const vacunas = (antecedentes?.vacunas || []).map((v) => ({
    nombre: v.nombre || 'Vacuna',
    fecha: v.fecha,
    proxima: v.proximaDosis,
  }))
  const desparasitaciones = (antecedentes?.desparasitaciones || []).map((d) => ({
    nombre: d.tipo ? `Desparasitación ${String(d.tipo).toLowerCase()}` : 'Desparasitación',
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

export function VacunasYDesparasitacion({ antecedentes, cargando, mascotaId, mascotaNombre }) {
  const items = itemsPreventivos(antecedentes)

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
