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
}) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const esHoy = isToday(day)
  const delMes = isSameMonth(day, fechaBase)
  const visibles = citas.slice(0, MAX_CHIPS)
  const ocultas = citas.length - visibles.length

  return (
    <div
      role={puedeProgramar ? 'button' : undefined}
      tabIndex={puedeProgramar ? 0 : undefined}
      aria-label={
        puedeProgramar
          ? `Nueva cita el ${format(day, "d 'de' MMMM", { locale: es })}`
          : undefined
      }
      className={cn(
        'relative flex min-h-[76px] flex-col gap-0.5 border-b border-r border-border p-1 sm:min-h-[92px]',
        !delMes && 'bg-muted/30',
        esHoy && 'bg-primary/5',
        puedeProgramar && 'cursor-pointer transition-colors hover:bg-accent/30'
      )}
      onClick={() => {
        if (puedeProgramar && onSlotClick) {
          onSlotClick(format(day, 'yyyy-MM-dd'), '09:00')
        }
      }}
      onKeyDown={(e) => {
        if (puedeProgramar && onSlotClick && (e.key === 'Enter' || e.key === ' ')) {
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
          'self-end text-xs font-semibold leading-none transition hover:text-primary',
          esHoy
            ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white hover:text-white'
            : delMes
              ? 'text-foreground'
              : 'text-muted-foreground/60'
        )}
      >
        {format(day, 'd')}
      </button>

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
              className="mt-auto self-start text-[10px] font-semibold text-muted-foreground transition hover:text-primary"
            >
              +{ocultas} más
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              onClick={(e) => e.stopPropagation()}
              className="z-50 w-64 border border-border bg-card p-2 shadow-lg"
            >
              <p className="mb-1.5 px-1 text-xs font-semibold capitalize text-foreground">
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
}) {
  const nombresDias = days.slice(0, 7)

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      {/* Cabecera con nombres de día */}
      <div className="grid grid-cols-7 border-b border-border bg-card">
        {nombresDias.map((day) => (
          <div
            key={day.toISOString()}
            className="border-r border-border py-1.5 text-center last:border-r-0"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {format(day, 'EEE', { locale: es })}
            </p>
          </div>
        ))}
      </div>

      {/* Celdas */}
      <div className="grid grid-cols-7">
        {isLoading
          ? days.map((day) => (
              <div
                key={day.toISOString()}
                className="min-h-[76px] border-b border-r border-border p-1 sm:min-h-[92px]"
              >
                <div className="h-4 w-full animate-pulse rounded-sm bg-muted opacity-50" />
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
              />
            ))}
      </div>
    </div>
  )
}
