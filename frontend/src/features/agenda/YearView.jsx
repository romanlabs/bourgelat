import { useMemo } from 'react'
import {
  eachMonthOfInterval,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const WEEK_OPTS = { weekStartsOn: 0 }
const DIAS_HEADER = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function MesMini({ mes, getCitasDelDia, onVerDia }) {
  const dias = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(mes), WEEK_OPTS),
        end: endOfWeek(endOfMonth(mes), WEEK_OPTS),
      }),
    [mes]
  )

  return (
    <div>
      <p className="mb-2 text-[15px] font-semibold capitalize tracking-[-0.01em] text-foreground">
        {format(mes, 'MMMM', { locale: es })}
      </p>

      <div className="grid grid-cols-7 gap-y-1">
        {DIAS_HEADER.map((dia, idx) => (
          <span
            key={`${dia}-${idx}`}
            className="text-center text-[13px] font-medium text-muted-foreground"
          >
            {dia}
          </span>
        ))}

        {dias.map((dia) => {
          const delMes = isSameMonth(dia, mes)
          const total = delMes ? getCitasDelDia(dia).length : 0
          const esHoy = isToday(dia)

          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => onVerDia(dia)}
              aria-label={`${format(dia, "d 'de' MMMM", { locale: es })}${total ? ` — ${total} citas` : ''}`}
              className={cn(
                'mx-auto flex h-7 w-7 items-center justify-center rounded-md text-[13px] tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !delMes && 'text-muted-foreground/40',
                delMes && 'text-foreground hover:bg-muted',
                total > 0 && !esHoy && 'bg-accent font-semibold text-accent-foreground',
                esHoy && 'bg-primary font-semibold text-primary-foreground hover:bg-primary'
              )}
            >
              {format(dia, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Vista anual tipo Google: 12 mini-meses; los días con citas quedan resaltados. */
export function YearView({ fechaBase, getCitasDelDia, onVerDia, isLoading, insetLeft = false }) {
  const meses = useMemo(
    () => eachMonthOfInterval({ start: startOfYear(fechaBase), end: endOfYear(fechaBase) }),
    [fechaBase]
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6 p-4 md:grid-cols-3 lg:grid-cols-4">
        {meses.map((mes) => (
          <div
            key={mes.toISOString()}
            className="h-40 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-6 gap-y-7 overflow-y-auto rounded-2xl bg-card p-5 md:grid-cols-3 lg:grid-cols-4',
        // deja libre el gutter donde flota el boton "Crear" cuando el panel esta cerrado
        insetLeft && 'pl-20'
      )}
      style={{ height: 'max(480px, calc(100vh - 300px))' }}
    >
      {meses.map((mes) => (
        <MesMini
          key={mes.toISOString()}
          mes={mes}
          getCitasDelDia={getCitasDelDia}
          onVerDia={onVerDia}
        />
      ))}
    </div>
  )
}
