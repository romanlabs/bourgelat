import { useState } from 'react'
import { Popover } from 'radix-ui'
import { format, isToday, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { CitaChipMini } from './CitaChip'

const MAX_CHIPS = 3

function DiaCell({
  day,
  fechaBase,
  citas,
  proximaCitaId,
  puedeProgramar,
  onSlotClick,
  onCitaClick,
  onVerDia,
  bloqueo,
}) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const esHoy = isToday(day)
  const delMes = isSameMonth(day, fechaBase)
  const visibles = citas.slice(0, MAX_CHIPS)
  const ocultas = citas.length - visibles.length
  // Un día bloqueado no acepta citas nuevas: la celda deja de ser clickeable.
  const clickeable = puedeProgramar && !bloqueo

  return (
    <div
      role={clickeable ? 'button' : undefined}
      tabIndex={clickeable ? 0 : undefined}
      aria-disabled={puedeProgramar && bloqueo ? true : undefined}
      title={bloqueo ? bloqueo.motivo : undefined}
      aria-label={
        clickeable
          ? `Nueva cita el ${format(day, "d 'de' MMMM", { locale: es })}`
          : undefined
      }
      className={cn(
        'relative flex min-h-[84px] flex-col gap-1 border-l border-t border-border p-1.5 sm:min-h-[104px]',
        !delMes && 'bg-muted/40',
        esHoy && 'bg-accent/30',
        bloqueo && 'bg-warning-soft',
        clickeable && 'cursor-pointer transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
      )}
      onClick={() => {
        if (clickeable && onSlotClick) {
          onSlotClick(format(day, 'yyyy-MM-dd'), '09:00')
        }
      }}
      onKeyDown={(e) => {
        if (clickeable && onSlotClick && (e.key === 'Enter' || e.key === ' ')) {
          onSlotClick(format(day, 'yyyy-MM-dd'), '09:00')
        }
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onVerDia(day)
        }}
        title="Ver día"
        className={cn(
          'flex h-7 min-w-7 items-center justify-center self-end rounded-md px-1 text-[13px] font-semibold leading-none tabular-nums transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          esHoy
            ? 'bg-primary text-primary-foreground hover:bg-primary hover:brightness-110'
            : delMes
              ? 'text-foreground'
              : 'text-muted-foreground'
        )}
      >
        {format(day, 'd')}
      </button>

      {bloqueo ? (
        <p className="truncate rounded-md bg-card px-1.5 py-0.5 text-[13px] font-semibold text-warning">
          {bloqueo.motivo}
        </p>
      ) : null}

      {visibles.map((cita) => (
        <CitaChipMini
          key={cita.id}
          cita={cita}
          onClick={onCitaClick}
          esProxima={esHoy && cita.id === proximaCitaId}
        />
      ))}

      {ocultas > 0 && (
        <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="mt-auto self-start rounded-md px-1 text-[13px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              +{ocultas} más
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              onClick={(e) => e.stopPropagation()}
              className="z-50 w-72 rounded-xl bg-popover p-3 shadow-dropdown"
            >
              <p className="mb-2 px-1 text-sm font-semibold first-letter:uppercase text-foreground">
                {format(day, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {citas.map((cita) => (
                  <CitaChipMini
                    key={cita.id}
                    cita={cita}
                    onClick={(c) => {
                      setPopoverOpen(false)
                      onCitaClick(c)
                    }}
                    esProxima={esHoy && cita.id === proximaCitaId}
                  />
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  )
}

/** Vista mensual tipo Google: grilla de semanas completas (6x7 o 5x7). */
export function MonthView({
  days,
  fechaBase,
  getCitasDelDia,
  proximaCitaId,
  puedeProgramar,
  onSlotClick,
  onCitaClick,
  onVerDia,
  isLoading,
  getBloqueoDelDia,
}) {
  // 7 columnas normalmente; 5 cuando se ocultan los fines de semana
  const columnas = new Set(days.map((day) => day.getDay())).size || 7
  const nombresDias = days.slice(0, columnas)
  const gridCols = { gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }

  return (
    <div className="overflow-hidden rounded-2xl bg-card p-2">
      {/* Cabecera con nombres de día */}
      <div className="grid" style={gridCols}>
        {nombresDias.map((day) => (
          <div
            key={day.toISOString()}
            className="py-2 text-center"
          >
            <p className="text-[13px] font-medium text-muted-foreground first-letter:uppercase">
              {format(day, 'EEE', { locale: es })}
            </p>
          </div>
        ))}
      </div>

      {/* Celdas */}
      <div className="grid" style={gridCols}>
        {isLoading
          ? days.map((day) => (
              <div
                key={day.toISOString()}
                className="min-h-[84px] border-l border-t border-border p-1.5 sm:min-h-[104px]"
              >
                <div className="h-5 w-full animate-pulse rounded-md bg-muted" />
              </div>
            ))
          : days.map((day) => (
              <DiaCell
                key={day.toISOString()}
                day={day}
                fechaBase={fechaBase}
                citas={getCitasDelDia(day)}
                proximaCitaId={proximaCitaId}
                puedeProgramar={puedeProgramar}
                onSlotClick={onSlotClick}
                onCitaClick={onCitaClick}
                onVerDia={onVerDia}
                bloqueo={getBloqueoDelDia?.(day)}
              />
            ))}
      </div>
    </div>
  )
}
