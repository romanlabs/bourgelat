import { cn } from '@/lib/utils'
import { formatHora12 } from '@/lib/hora'
import {
  buildStateTone,
  URGENCIA_ACCENT,
  TIPO_SHORT,
  especieToEmoji,
  timeToTop,
  calcCitaHeight,
} from './calendarConstants'

// La urgencia se marca con una franja roja a la izquierda (sombra interna, no borde).
const estiloUrgencia = { boxShadow: `inset 3px 0 0 ${URGENCIA_ACCENT}` }

// Chip posicionado absoluto dentro de una columna de la grilla horaria
export function CitaChip({ cita, onClick, esProxima, slotHeight, gridInicio, gridFin }) {
  const top = timeToTop(cita.horaInicio, slotHeight, gridInicio)
  const height = calcCitaHeight(cita.horaInicio, cita.horaFin, slotHeight, gridInicio, gridFin)
  const horaLabel = formatHora12(cita.horaInicio)
  const emoji = especieToEmoji(cita.mascota?.especie)
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
        'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-md px-2 py-1 text-left transition hover:-translate-y-px hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        buildStateTone(cita.estado),
        esProxima && 'ring-2 ring-inset ring-brand'
      )}
      style={{
        top: `${top}px`,
        height: `${Math.max(height - 2, 22)}px`,
        minHeight: '22px',
        ...(esUrgencia ? estiloUrgencia : null),
      }}
    >
      {sinHistoria && (
        <span
          className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger ring-1 ring-card"
          title="Pendiente de historia clínica"
        />
      )}
      <p className="truncate text-[13px] font-semibold leading-4">
        <span className="mr-1 not-italic">{esUrgencia ? '⚡' : emoji}</span>
        {height < 44 ? <span className="mr-1 font-medium tabular-nums opacity-80">{horaLabel}</span> : null}
        {cita.mascota?.nombre || 'Paciente'}
      </p>
      {height >= 44 && (
        <p className="mt-0.5 truncate text-[13px] leading-4 opacity-80">
          <span className="tabular-nums">{horaLabel}</span> · {tipoCorto}
        </p>
      )}
      {height >= 64 && (
        <p className="mt-0.5 truncate text-[13px] leading-4 opacity-75">
          {cita.propietario?.nombre?.split(' ')[0] || ''}
        </p>
      )}
      {height >= 84 && (
        <p className="mt-0.5 truncate text-[13px] leading-4 opacity-75">
          Dr. {cita.veterinario?.nombre?.split(' ')[0] || ''}
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
        buildStateTone(cita.estado),
        esProxima && 'ring-2 ring-inset ring-brand'
      )}
      style={esUrgencia ? estiloUrgencia : undefined}
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
