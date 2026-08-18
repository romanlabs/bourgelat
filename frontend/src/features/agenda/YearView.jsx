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
      <p className="mb-2 text-sm font-medium capitalize text-foreground">
        {format(mes, 'MMMM', { locale: es })}
      </p>

      <div className="grid grid-cols-7 gap-y-1">
        {DIAS_HEADER.map((dia, idx) => (
          <span
            key={`${dia}-${idx}`}
            className="text-center text-[10px] font-medium text-muted-foreground"
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
                'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition',
                !delMes && 'text-muted-foreground/40',
                delMes && 'text-foreground hover:bg-muted',
                total > 0 && !esHoy && 'bg-primary/15 font-semibold text-primary',
                esHoy && 'bg-primary font-semibold text-white hover:bg-primary'
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
            className="h-40 animate-pulse rounded-md bg-muted opacity-50"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-6 gap-y-7 overflow-y-auto p-4 md:grid-cols-3 lg:grid-cols-4',
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
