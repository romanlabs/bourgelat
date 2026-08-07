// Constantes visuales y de geometría compartidas por las vistas del calendario

export const HORA_INICIO = 0   // 00:00 — dia completo, como Google Calendar
export const HORA_FIN = 24     // 24:00 (exclusive — ultimo slot es 23:30)
export const SLOT_MINUTOS = 30
export const TOTAL_SLOTS = (HORA_FIN - HORA_INICIO) * 2
export const SLOT_HEIGHT_MAX = 52 // px por slot de 30 min
export const SLOT_HEIGHT_MIN = 28

/** Genera los slots de horario del día: ["07:00", "07:30", ..., "19:30"] */
export function generarSlots() {
  const slots = []
  for (let h = HORA_INICIO; h < HORA_FIN; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

/** Convierte "HH:MM" o "HH:MM:SS" a minutos totales desde medianoche. */
export function parseMinutes(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':').map(Number)
  return parts[0] * 60 + (parts[1] || 0)
}

/** Calcula posición top (px) dentro de la grilla para una hora dada. */
export function timeToTop(timeStr, slotHeight = SLOT_HEIGHT_MAX) {
  const mins = parseMinutes(timeStr)
  const minutesFromStart = mins - HORA_INICIO * 60
  return Math.max(0, (minutesFromStart / SLOT_MINUTOS) * slotHeight)
}

/** Calcula la altura (px) de un chip dados horaInicio y horaFin. */
export function calcCitaHeight(horaInicio, horaFin, slotHeight = SLOT_HEIGHT_MAX) {
  const startMins = parseMinutes(horaInicio)
  const endMins = parseMinutes(horaFin)
  const clampedEnd = Math.min(endMins, HORA_FIN * 60)
  const clampedStart = Math.max(startMins, HORA_INICIO * 60)
  const effectiveDuration = Math.max(clampedEnd - clampedStart, 15)
  return Math.max((effectiveDuration / SLOT_MINUTOS) * slotHeight, 24)
}

export function buildStateTone(estado) {
  switch (estado) {
    case 'programada':
      return 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700'
    case 'en_espera':
      return 'border-violet-400 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-600'
    case 'completada':
      return 'border-emerald-400 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-600'
    case 'cancelada':
      return 'border-red-400 bg-red-100 text-red-700 opacity-75 dark:bg-red-900/40 dark:text-red-200 dark:border-red-600'
    case 'no_asistio':
      return 'border-amber-400 bg-amber-100 text-amber-700 opacity-75 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-600'
    default:
      return 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700'
  }
}

export function getAccentColor(estado) {
  switch (estado) {
    case 'programada':  return '#93c5fd'
    case 'en_espera':   return '#a78bfa'
    case 'completada':  return '#34d399'
    case 'cancelada':   return '#f87171'
    case 'no_asistio':  return '#fbbf24'
    default:            return '#93c5fd'
  }
}

export const TIPO_SHORT = {
  consulta_general: 'Consulta',
  vacunacion:       'Vacuna',
  cirugia:          'Cirugía',
  desparasitacion:  'Desparasit.',
  control:          'Control',
  urgencia:         'Urgencia',
  peluqueria:       'Peluquería',
  laboratorio:      'Lab.',
  radiografia:      'Radiografía',
  otro:             'Otro',
}

const ESPECIE_EMOJI = {
  perro:    '🐶',
  gato:     '🐱',
  conejo:   '🐰',
  ave:      '🦜',
  pajaro:   '🦜',
  hamster:  '🐹',
  reptil:   '🦎',
}

export function especieToEmoji(especie) {
  if (!especie) return '🐾'
  const key = especie.toLowerCase()
  for (const [k, v] of Object.entries(ESPECIE_EMOJI)) {
    if (key.includes(k)) return v
  }
  return '🐾'
}

export const STATUS_OPTIONS = [
  { value: 'programada', label: 'Programada' },
  { value: 'en_espera', label: 'En espera' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_asistio', label: 'No asistió' },
]
