import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { buildStateTone, URGENCIA_ACCENT, TIPO_SHORT, especieToEmoji, STATUS_OPTIONS } from './calendarConstants'

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
        'flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        esProxima && 'bg-accent hover:bg-accent'
      )}
      style={esUrgencia ? { boxShadow: `inset 3px 0 0 ${URGENCIA_ACCENT}` } : undefined}
    >
      <span className="w-28 shrink-0 text-[15px] font-semibold tabular-nums text-muted-foreground">
        {horaFinLabel ? `${horaLabel} – ${horaFinLabel}` : horaLabel}
      </span>

      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
        <span className="mr-1.5">{esUrgencia ? '⚡' : especieToEmoji(cita.mascota?.especie)}</span>
        {cita.mascota?.nombre || 'Paciente'}
        <span className="font-normal text-muted-foreground">
          {' · '}
          {TIPO_SHORT[cita.tipoCita] || cita.tipoCita}
        </span>
      </span>

      <span
        className={cn(
          'hidden shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-semibold sm:inline-flex',
          buildStateTone(cita.estado)
        )}
      >
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
      <div className="flex flex-col gap-2 rounded-2xl bg-card p-4">
        {[0, 1, 2, 3, 4].map((idx) => (
          <div key={idx} className="h-14 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (!diasConCitas.length) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl bg-card text-[15px] text-muted-foreground',
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
        'flex flex-col gap-2 overflow-y-auto rounded-2xl bg-card p-2',
        // deja libre el gutter donde flota el boton "Crear" cuando el panel esta cerrado
        insetLeft && 'pl-16'
      )}
      style={{ height: 'max(480px, calc(100vh - 300px))' }}
    >
      {diasConCitas.map(({ day, citas }) => {
        const esHoy = isToday(day)
        return (
          <div key={day.toISOString()} className="flex gap-4 px-2 py-2 sm:px-3">
            <div className="w-20 shrink-0 pt-2.5 text-right">
              <p className={cn('text-[13px] font-medium first-letter:uppercase', esHoy ? 'text-primary' : 'text-muted-foreground')}>
                {format(day, 'EEE', { locale: es })}
              </p>
              <p
                className={cn(
                  'mt-1 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums',
                  esHoy ? 'text-primary' : 'text-foreground'
                )}
              >
                {format(day, 'd')}
              </p>
              <p className="mt-1 text-[13px] capitalize text-muted-foreground">
                {format(day, 'MMM', { locale: es })}
              </p>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {citas.map((cita) => (
                <CitaFila
                  key={cita.id}
                  cita={cita}
                  onCitaClick={onCitaClick}
                  esProxima={esHoy && cita.id === proximaCitaId}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
