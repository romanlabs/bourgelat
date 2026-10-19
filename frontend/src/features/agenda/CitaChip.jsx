import { cn } from '@/lib/utils'
import { formatHora12 } from '@/lib/hora'
import {
  buildEstadoMatiz,
  buildTipoTone,
  TIPO_SHORT,
  especieToEmoji,
  timeToTop,
  calcCitaHeight,
} from './calendarConstants'

// Chip posicionado absoluto dentro de una columna de la grilla horaria
export function CitaChip({ cita, onClick, esProxima, slotHeight, gridInicio, gridFin }) {
  const top = timeToTop(cita.horaInicio, slotHeight, gridInicio)
  const height = calcCitaHeight(cita.horaInicio, cita.horaFin, slotHeight, gridInicio, gridFin)
  const horaLabel = formatHora12(cita.horaInicio)
  const tipoCorto = TIPO_SHORT[cita.tipoCita] || cita.tipoCita
  const esUrgencia = cita.tipoCita === 'urgencia'
  const sinHistoria = esUrgencia && cita.estado === 'completada' && !cita.historia?.id

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(cita)
      }}
      title={`${cita.mascota?.nombre || 'Cita'} — ${horaLabel}${sinHistoria ? ' — Pendiente de historia' : ''}`}
      className={cn(
        'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-lg px-2 py-1 text-left transition hover:-translate-y-px hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        buildTipoTone(cita.tipoCita),
        buildEstadoMatiz(cita.estado),
        esProxima && cita.estado !== 'en_atencion' && 'ring-2 ring-inset ring-brand'
      )}
      style={{
        top: `${top}px`,
        height: `${Math.max(height - 2, 22)}px`,
        minHeight: '22px',
      }}
    >
      {cita.estado === 'en_espera' || sinHistoria ? (
        <span
          className={cn('absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-1 ring-card', sinHistoria ? 'bg-danger' : 'bg-brand')}
          title={sinHistoria ? 'Pendiente de historia clínica' : 'En espera'}
        />
      ) : null}
      <p className="truncate text-[13px] leading-4">
        <span className="font-medium tabular-nums opacity-80">{horaLabel}</span>{' '}
        <span className="font-semibold">{cita.mascota?.nombre || 'Paciente'}</span>
      </p>
      {height >= 34 && (
        <p className="mt-0.5 truncate text-[13px] leading-4 opacity-80">{cita.motivo || tipoCorto}</p>
      )}
      {height >= 64 && (
        <p className="mt-0.5 truncate text-[13px] leading-4 opacity-75">
          {[cita.propietario?.nombre?.split(' ')[0], cita.veterinario?.nombre?.split(' ')[0]].filter(Boolean).join(' · ')}
        </p>
      )}
    </button>
  )
}

// Variante compacta para las celdas de la vista mensual
export function CitaChipMini({ cita, onClick, esProxima }) {
  const horaLabel = formatHora12(cita.horaInicio)
  const emoji = especieToEmoji(cita.mascota?.especie)
  const esUrgencia = cita.tipoCita === 'urgencia'
  const sinHistoria = esUrgencia && cita.estado === 'completada' && !cita.historia?.id

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(cita)
      }}
      title={`${horaLabel} · ${cita.mascota?.nombre || 'Cita'}${sinHistoria ? ' — Pendiente de historia' : ''}`}
      className={cn(
        'relative flex w-full items-center gap-1.5 overflow-hidden rounded-md px-1.5 py-0.5 text-left transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        buildTipoTone(cita.tipoCita),
        buildEstadoMatiz(cita.estado),
        esProxima && cita.estado !== 'en_atencion' && 'ring-2 ring-inset ring-brand'
      )}
    >
      <span className="shrink-0 text-[13px] font-medium tabular-nums opacity-80">{horaLabel}</span>
      <span className="truncate text-[13px] font-semibold leading-5">
        <span className="mr-0.5">{esUrgencia ? '⚡' : emoji}</span>
        {cita.mascota?.nombre || 'Paciente'}
      </span>
      {sinHistoria && (
        <span className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-danger" />
      )}
    </button>
  )
}
