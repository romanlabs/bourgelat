import { useEffect, useRef, useState } from 'react'
import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  TOTAL_SLOTS,
  SLOT_HEIGHT_MAX,
  SLOT_HEIGHT_MIN,
  timeToTop,
} from './calendarConstants'
import { CitaChip } from './CitaChip'

/** "07:00" -> "7 AM", "13:00" -> "1 PM" — formato compacto tipo Google Calendar */
function formatHourLabel(slot) {
  const hour = parseInt(slot.slice(0, 2), 10)
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12} ${hour < 12 ? 'AM' : 'PM'}`
}

/** Alto de slot fluido: intenta que el día completo quepa en el contenedor. */
function useSlotHeight(containerRef) {
  const [slotHeight, setSlotHeight] = useState(SLOT_HEIGHT_MAX)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const medir = () => {
      const disponible = el.clientHeight
      if (!disponible) return
      const ideal = Math.floor(disponible / TOTAL_SLOTS)
      setSlotHeight(Math.min(SLOT_HEIGHT_MAX, Math.max(SLOT_HEIGHT_MIN, ideal)))
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  return slotHeight
}

function NowLine({ slotHeight }) {
  const getNowTop = () => {
    const now = new Date()
    const str = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return timeToTop(str, slotHeight)
  }

  const [top, setTop] = useState(getNowTop)

  useEffect(() => {
    setTop(getNowTop())
    const id = setInterval(() => setTop(getNowTop()), 60_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotHeight])

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-30"
      style={{ top: `${top}px` }}
    >
      <div className="flex items-center">
        <div className="h-2 w-2 flex-shrink-0 -translate-x-1 rounded-full bg-red-500" />
        <div className="h-[1.5px] flex-1 bg-red-400/70" />
      </div>
    </div>
  )
}

/**
 * Grilla horaria genérica: 7 columnas para semana, 1 para día.
 */
export function TimeGridView({
  days,
  slots,
  getCitasDelDia,
  proximaCitaId,
  puedeProgramar,
  onSlotClick,
  onCitaClick,
  isLoading,
}) {
  const scrollRef = useRef(null)
  const slotHeight = useSlotHeight(scrollRef)
  const gridHeight = TOTAL_SLOTS * slotHeight
  const esDia = days.length === 1
  const gridCols = `52px repeat(${days.length}, minmax(0, 1fr))`

  // Auto-scroll inicial a la hora actual cuando la grilla no cabe completa
  useEffect(() => {
    const el = scrollRef.current
    if (!el || el.scrollHeight <= el.clientHeight) return
    const now = new Date()
    const str = `${String(now.getHours()).padStart(2, '0')}:00`
    el.scrollTop = Math.max(0, timeToTop(str, slotHeight) - 80)
    // Solo al montar / cambiar densidad — no perseguir el reloj
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotHeight])

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto overflow-x-hidden rounded-sm border border-border"
      style={{ height: 'max(480px, calc(100vh - 300px))' }}
    >
      {/* Cabecera: nombres de día */}
      <div
        className="sticky top-0 z-20 grid border-b border-border bg-card"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div className="flex items-end justify-start border-r border-border pb-1 pl-1.5">
          <span className="text-[9px] font-medium text-muted-foreground/70">GMT-05</span>
        </div>
        {days.map((day) => {
          const esHoy = isToday(day)
          const count = getCitasDelDia(day).length
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'border-r border-border py-2 text-center last:border-r-0',
                esHoy && 'bg-primary/5'
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {format(day, esDia ? 'EEEE' : 'EEE', { locale: es })}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-sm font-semibold leading-none',
                  esHoy
                    ? 'mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white'
                    : 'text-foreground'
                )}
              >
                {format(day, 'd')}
              </p>
              {!isLoading && count > 0 && (
                <span
                  className={cn(
                    'mt-1 inline-flex h-4 items-center justify-center rounded-full px-1.5 text-[9px] font-bold',
                    count >= 4 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Cuerpo: columna de horas + columnas de días */}
      <div className="grid" style={{ gridTemplateColumns: gridCols }}>
        {/* Columna de horas: sin lineas propias (solo las columnas de dia las tienen),
            la etiqueta flota debajo de la altura de su hora, como en Google */}
        <div className="relative border-r border-border">
          {slots.map((slot, idx) => (
            <div key={slot} style={{ height: `${slotHeight}px` }}>
              {slot.endsWith(':00') && idx > 0 && (
                <span
                  className="absolute right-1.5 whitespace-nowrap text-[10px] tabular-nums text-muted-foreground"
                  style={{ top: `${idx * slotHeight + 4}px` }}
                >
                  {formatHourLabel(slot)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Columnas de cada día */}
        {days.map((day) => {
          const esHoy = isToday(day)
          const citasDelDia = getCitasDelDia(day)

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'relative border-r border-border last:border-r-0',
                esHoy && 'bg-primary/[0.025]'
              )}
              style={{ height: `${gridHeight}px` }}
            >
              {/* Fondos de slot (clickeables para nueva cita) */}
              {slots.map((slot, idx) => (
                <div
                  key={slot}
                  role={puedeProgramar ? 'button' : undefined}
                  tabIndex={puedeProgramar ? 0 : undefined}
                  aria-label={
                    puedeProgramar
                      ? `Nueva cita el ${format(day, "d 'de' MMMM", { locale: es })} a las ${slot}`
                      : undefined
                  }
                  className={cn(
                    'absolute w-full border-b border-border/40',
                    slot.endsWith(':00') && 'border-border/70',
                    puedeProgramar && 'hover:bg-accent/30 cursor-pointer transition-colors'
                  )}
                  style={{
                    top: `${idx * slotHeight}px`,
                    height: `${slotHeight}px`,
                  }}
                  onClick={() => {
                    if (puedeProgramar && onSlotClick) {
                      onSlotClick(format(day, 'yyyy-MM-dd'), slot)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (puedeProgramar && onSlotClick && (e.key === 'Enter' || e.key === ' ')) {
                      onSlotClick(format(day, 'yyyy-MM-dd'), slot)
                    }
                  }}
                />
              ))}

              {/* Skeleton de carga */}
              {isLoading &&
                [40, 60, 80].map((top) => (
                  <div
                    key={top}
                    className="absolute left-0.5 right-0.5 animate-pulse rounded-sm bg-muted"
                    style={{ top: `${top}%`, height: '28px', opacity: 0.5 }}
                  />
                ))}

              {/* Indicador de hora actual */}
              {!isLoading && esHoy && <NowLine slotHeight={slotHeight} />}

              {/* Chips de citas */}
              {!isLoading &&
                citasDelDia.map((cita) => (
                  <CitaChip
                    key={cita.id}
                    cita={cita}
                    onClick={onCitaClick}
                    esProxima={esHoy && cita.id === proximaCitaId}
                    slotHeight={slotHeight}
                  />
                ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
