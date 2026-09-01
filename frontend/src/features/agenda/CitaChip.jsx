import { cn } from '@/lib/utils'
import { formatHora12 } from '@/lib/hora'
import {
  buildStateTone,
  getAccentColor,
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
        'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-sm border-y border-r px-1.5 py-1 text-left shadow-sm transition-all hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
        buildStateTone(cita.estado),
        esUrgencia && 'border-dashed !border-red-500',
        esProxima && 'ring-2 ring-primary ring-offset-1'
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        minHeight: '24px',
        borderLeftWidth: '3px',
        borderLeftColor: esUrgencia ? '#ef4444' : getAccentColor(cita.estado),
      }}
    >
      {sinHistoria && (
        <span
          className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-600 ring-1 ring-white dark:ring-slate-900"
          title="Pendiente de historia clínica"
        />
      )}
      <p className="truncate text-[11px] font-bold leading-tight">
        <span className="mr-0.5 not-italic">{esUrgencia ? '⚡' : emoji}</span>
        {cita.mascota?.nombre || 'Paciente'}
      </p>
      {height >= 44 && (
        <p className="mt-0.5 truncate text-[10px] leading-tight opacity-75">
          {horaLabel} · {tipoCorto}
        </p>
      )}
      {height >= 64 && (
        <p className="mt-0.5 truncate text-[10px] leading-tight opacity-60">
          {cita.propietario?.nombre?.split(' ')[0] || ''}
        </p>
      )}
      {height >= 84 && (
        <p className="mt-0.5 truncate text-[10px] leading-tight opacity-55">
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
        'relative flex w-full items-center gap-1 overflow-hidden rounded-sm border-y border-r px-1 py-px text-left transition hover:brightness-95 focus:outline-none focus:ring-1 focus:ring-primary',
        buildStateTone(cita.estado),
        esUrgencia && 'border-dashed !border-red-500',
        esProxima && 'ring-1 ring-primary'
      )}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: esUrgencia ? '#ef4444' : getAccentColor(cita.estado),
      }}
    >
      <span className="text-[9px] font-semibold tabular-nums opacity-75">{horaLabel}</span>
      <span className="truncate text-[10px] font-semibold leading-4">
        <span className="mr-0.5">{esUrgencia ? '⚡' : emoji}</span>
        {cita.mascota?.nombre || 'Paciente'}
      </span>
      {sinHistoria && (
        <span className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-600" />
      )}
    </button>
  )
}
