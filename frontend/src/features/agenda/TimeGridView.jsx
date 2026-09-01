import { useEffect, useRef, useState } from 'react'
import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  HORA_INICIO,
  HORA_FIN,
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

/** Alto de slot fluido: intenta que la grilla completa quepa en el contenedor. */
function useSlotHeight(containerRef, totalSlots) {
  const [slotHeight, setSlotHeight] = useState(SLOT_HEIGHT_MAX)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !totalSlots) return
    const medir = () => {
      const disponible = el.clientHeight
      if (!disponible) return
      const ideal = Math.floor(disponible / totalSlots)
      setSlotHeight(Math.min(SLOT_HEIGHT_MAX, Math.max(SLOT_HEIGHT_MIN, ideal)))
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, totalSlots])

  return slotHeight
}

function NowLine({ slotHeight, gridInicio }) {
  // Incluye segundos como fraccion de minuto para que la linea avance
  // de forma continua, no a saltos de un minuto completo.
  const getNowTop = () => {
    const now = new Date()
    const str = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const base = timeToTop(str, slotHeight, gridInicio)
    const fraccionMinuto = now.getSeconds() / 60
    return base + (fraccionMinuto * slotHeight) / 30
  }

  const [top, setTop] = useState(getNowTop)

  useEffect(() => {
    setTop(getNowTop())
    const id = setInterval(() => setTop(getNowTop()), 1_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotHeight, gridInicio])

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-10"
      style={{ top: `${top}px` }}
    >
      <div className="flex items-center">
        <div className="h-3 w-3 flex-shrink-0 -translate-x-1.5 rounded-full bg-[#db372d]" />
        <div className="h-[2px] flex-1 bg-[#db372d]" />
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
  showTimezoneLabel = true,
  gridInicio = HORA_INICIO,
  gridFin = HORA_FIN,
  esHabil,
  getBloqueoDelDia,
}) {
  const scrollRef = useRef(null)
  const slotHeight = useSlotHeight(scrollRef, slots.length)
  const gridHeight = slots.length * slotHeight
  const esDia = days.length === 1
  const gridCols = `64px repeat(${days.length}, minmax(0, 1fr))`

  // Auto-scroll inicial a la hora actual cuando la grilla no cabe completa
  useEffect(() => {
    const el = scrollRef.current
    if (!el || el.scrollHeight <= el.clientHeight) return
    const now = new Date()
    const str = `${String(now.getHours()).padStart(2, '0')}:00`
    el.scrollTop = Math.max(0, timeToTop(str, slotHeight, gridInicio) - 80)
    // Solo al montar / cambiar densidad — no perseguir el reloj
  }, [slotHeight, gridInicio])

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto overflow-x-hidden"
      style={{ height: 'max(480px, calc(100vh - 300px))' }}
    >
      {/* Cabecera: nombres de día */}
      <div
        className="sticky top-0 z-20 grid border-b border-border bg-card"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div className="flex items-end justify-start pb-1 pl-1.5">
          {showTimezoneLabel && (
            <span className="text-[9px] font-medium text-muted-foreground/70">GMT-05</span>
          )}
        </div>
        {days.map((day) => {
          const esHoy = isToday(day)
          const count = getCitasDelDia(day).length
          const bloqueo = getBloqueoDelDia?.(day)
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'border-r border-border py-2 text-center last:border-r-0',
                esHoy && 'bg-primary/5',
                bloqueo && 'bg-amber-50 dark:bg-amber-950/30'
              )}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {format(day, esDia ? 'EEEE' : 'EEE', { locale: es })}
              </p>
              <p
                className={cn(
                  'mt-1 text-xl font-normal leading-none',
                  esHoy
                    ? 'mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary text-2xl text-white'
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
              {/* En la cabecera (sticky) para que el motivo siga visible al
                  desplazar la grilla */}
              {bloqueo ? (
                <p
                  title={bloqueo.motivo}
                  className="mx-1 mt-1 truncate rounded-sm bg-amber-100 px-1 py-px text-[10px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                >
                  {bloqueo.motivo}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Cuerpo: columna de horas + columnas de días */}
      <div className="grid" style={{ gridTemplateColumns: gridCols }}>
        {/* Columna de horas: sin lineas propias (solo las columnas de dia las tienen),
            la etiqueta flota debajo de la altura de su hora, como en Google */}
        <div className="relative">
          {slots.map((slot, idx) => (
            <div key={slot} style={{ height: `${slotHeight}px` }}>
              {slot.endsWith(':00') && idx > 0 && (
                <span
                  className="absolute right-1.5 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium tabular-nums text-muted-foreground"
                  style={{ top: `${idx * slotHeight}px` }}
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
          const bloqueoDelDia = getBloqueoDelDia?.(day)

          return (
            <div
              key={day.toISOString()}
              className="relative border-r border-border last:border-r-0"
              style={{ height: `${gridHeight}px` }}
            >
              {/* Fondos de slot (clickeables para nueva cita) */}
              {slots.map((slot, idx) => {
                // Fuera del horario de atención o dentro de un bloqueo: la API
                // rechazaría la cita, así que tampoco se ofrece el slot.
                const habil = esHabil ? esHabil(day, slot) : true
                const clickeable = puedeProgramar && habil

                return (
                  <div
                    key={slot}
                    role={clickeable ? 'button' : undefined}
                    tabIndex={clickeable ? 0 : undefined}
                    aria-disabled={puedeProgramar && !habil ? true : undefined}
                    title={!habil ? bloqueoDelDia?.motivo || 'Fuera del horario de atención' : undefined}
                    aria-label={
                      clickeable
                        ? `Nueva cita el ${format(day, "d 'de' MMMM", { locale: es })} a las ${slot}`
                        : undefined
                    }
                    className={cn(
                      'absolute w-full',
                      slot.endsWith(':00') && idx > 0 && 'border-t border-border',
                      !habil && 'bg-muted/60',
                      clickeable && 'hover:bg-accent/30 cursor-pointer transition-colors'
                    )}
                    style={{
                      top: `${idx * slotHeight}px`,
                      height: `${slotHeight}px`,
                    }}
                    onClick={() => {
                      if (clickeable && onSlotClick) {
                        onSlotClick(format(day, 'yyyy-MM-dd'), slot)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (clickeable && onSlotClick && (e.key === 'Enter' || e.key === ' ')) {
                        onSlotClick(format(day, 'yyyy-MM-dd'), slot)
                      }
                    }}
                  />
                )
              })}


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
              {!isLoading && esHoy && <NowLine slotHeight={slotHeight} gridInicio={gridInicio} />}

              {/* Chips de citas */}
              {!isLoading &&
                citasDelDia.map((cita) => (
                  <CitaChip
                    key={cita.id}
                    cita={cita}
                    onClick={onCitaClick}
                    esProxima={esHoy && cita.id === proximaCitaId}
                    slotHeight={slotHeight}
                    gridInicio={gridInicio}
                    gridFin={gridFin}
                  />
                ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
