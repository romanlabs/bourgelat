import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getAccentColor, TIPO_SHORT, especieToEmoji, STATUS_OPTIONS } from './calendarConstants'

const ESTADO_LABEL = Object.fromEntries(STATUS_OPTIONS.map((opt) => [opt.value, opt.label]))

function CitaFila({ cita, onCitaClick, esProxima }) {
  const horaLabel = cita.horaInicio?.slice(0, 5) || ''
  const horaFinLabel = cita.horaFin?.slice(0, 5) || ''
  const esUrgencia = cita.tipoCita === 'urgencia'

  return (
    <button
      type="button"
      onClick={() => onCitaClick(cita)}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        esProxima && 'ring-1 ring-primary'
      )}
    >
      <span className="w-28 shrink-0 text-xs tabular-nums text-muted-foreground">
        {horaFinLabel ? `${horaLabel} – ${horaFinLabel}` : horaLabel}
      </span>

      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: esUrgencia ? '#ef4444' : getAccentColor(cita.estado) }}
      />

      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        <span className="mr-1">{esUrgencia ? '⚡' : especieToEmoji(cita.mascota?.especie)}</span>
        {cita.mascota?.nombre || 'Paciente'}
        <span className="ml-2 text-muted-foreground">
          {TIPO_SHORT[cita.tipoCita] || cita.tipoCita}
        </span>
      </span>

      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
        {ESTADO_LABEL[cita.estado] || cita.estado}
      </span>
    </button>
  )
}

/** Vista "Agenda" tipo Google: lista cronológica de días con citas. */
export function AgendaListView({
  days,
  getCitasDelDia,
  proximaCitaId,
  onCitaClick,
  isLoading,
  insetLeft = false,
}) {
  const diasConCitas = days
    .map((day) => ({ day, citas: getCitasDelDia(day) }))
    .filter(({ citas }) => citas.length > 0)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[0, 1, 2, 3, 4].map((idx) => (
          <div key={idx} className="h-10 animate-pulse rounded-md bg-muted opacity-50" />
        ))}
      </div>
    )
  }

  if (!diasConCitas.length) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-sm text-muted-foreground',
          insetLeft && 'pl-20'
        )}
        style={{ height: 'max(480px, calc(100vh - 300px))' }}
      >
        No hay citas en este periodo.
      </div>
    )
  }

  return (
    <div
      className={cn(
        'divide-y divide-border overflow-y-auto',
        // deja libre el gutter donde flota el boton "Crear" cuando el panel esta cerrado
        insetLeft && 'pl-16'
      )}
      style={{ height: 'max(480px, calc(100vh - 300px))' }}
    >
      {diasConCitas.map(({ day, citas }) => (
        <div key={day.toISOString()} className="flex gap-4 px-2 py-3 sm:px-4">
          <div className="w-24 shrink-0 pt-2 text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {format(day, 'EEE', { locale: es })}
            </p>
            <p
              className={cn(
                'mt-0.5 text-2xl font-normal leading-none',
                isToday(day) ? 'text-primary' : 'text-foreground'
              )}
            >
              {format(day, 'd')}
            </p>
            <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
              {format(day, 'MMM', { locale: es })}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            {citas.map((cita) => (
              <CitaFila
                key={cita.id}
                cita={cita}
                onCitaClick={onCitaClick}
                esProxima={isToday(day) && cita.id === proximaCitaId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
