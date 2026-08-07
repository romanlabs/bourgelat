import { useState, useEffect } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  isSameDay,
  isSameMonth,
  isToday,
  format,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEK_OPTS = { weekStartsOn: 1 }
const DIAS_HEADER = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/**
 * Mini calendario de navegacion rapida (estilo Google Calendar lateral):
 * muestra el mes de fechaBase, resalta hoy/seleccionado y permite saltar de fecha.
 */
export function MiniCalendar({ fechaBase, onSelectDay }) {
  const [mesVisible, setMesVisible] = useState(() => startOfMonth(fechaBase))

  // Si la fecha activa cambia de mes (navegacion desde la toolbar), sincroniza el mes mostrado
  useEffect(() => {
    setMesVisible((prev) => (isSameMonth(prev, fechaBase) ? prev : startOfMonth(fechaBase)))
  }, [fechaBase])

  const dias = eachDayOfInterval({
    start: startOfWeek(startOfMonth(mesVisible), WEEK_OPTS),
    end: endOfWeek(endOfMonth(mesVisible), WEEK_OPTS),
  })

  return (
    <div className="w-full select-none">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold capitalize text-foreground">
          {format(mesVisible, 'MMMM yyyy', { locale: es })}
        </p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setMesVisible((prev) => addMonths(prev, -1))}
            className="flex h-6 w-6 items-center justify-center text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMesVisible((prev) => addMonths(prev, 1))}
            className="flex h-6 w-6 items-center justify-center text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {DIAS_HEADER.map((d) => (
          <div key={d} className="text-center text-[9px] font-semibold text-muted-foreground">
            {d}
          </div>
        ))}

        {dias.map((day) => {
          const delMes = isSameMonth(day, mesVisible)
          const esHoy = isToday(day)
          const esSeleccionado = isSameDay(day, fechaBase)

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition',
                !delMes && 'text-muted-foreground/40',
                delMes && !esSeleccionado && 'text-foreground hover:bg-muted',
                esHoy && !esSeleccionado && 'font-bold text-primary',
                esSeleccionado && 'bg-primary font-semibold text-white hover:bg-primary'
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
