// Constantes visuales y de geometría compartidas por las vistas del calendario

export const HORA_INICIO = 0   // 00:00 — dia completo, como Google Calendar
export const HORA_FIN = 24     // 24:00 (exclusive — ultimo slot es 23:30)
export const SLOT_MINUTOS = 30
export const TOTAL_SLOTS = (HORA_FIN - HORA_INICIO) * 2
export const SLOT_HEIGHT_MAX = 30 // px por slot de 30 min — densidad compacta tipo Google
export const SLOT_HEIGHT_MIN = 22 // evita que el punto de "ahora" (9px) domine visualmente la franja

/**
 * Genera los slots de la grilla en pasos de 30 min.
 * generarSlots(8, 18) → ["08:00", "08:30", ..., "17:30"]
 */
export function generarSlots(horaInicio = HORA_INICIO, horaFin = HORA_FIN) {
  const slots = []
  for (let h = horaInicio; h < horaFin; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

/**
 * Rango de horas que conviene mostrar en la grilla dado el horario de atención
 * de la clínica, con una hora de margen a cada lado. Sin horario configurado se
 * mantiene el día completo.
 */
export function rangoVisibleDeHorario(horarioAtencion) {
  if (!horarioAtencion) return { horaInicio: HORA_INICIO, horaFin: HORA_FIN }

  const franjas = Object.values(horarioAtencion).flat()
  if (!franjas.length) return { horaInicio: HORA_INICIO, horaFin: HORA_FIN }

  const aperturas = franjas.map((franja) => Math.floor(parseMinutes(franja.inicio) / 60))
  const cierres = franjas.map((franja) => Math.ceil(parseMinutes(franja.fin) / 60))

  return {
    horaInicio: Math.max(HORA_INICIO, Math.min(...aperturas) - 1),
    horaFin: Math.min(HORA_FIN, Math.max(...cierres) + 1),
  }
}

/** true si el bloqueo cubre el día entero (sin franja horaria). */
const esBloqueoDiaCompleto = (bloqueo) => !bloqueo.horaInicio || !bloqueo.horaFin

/** Bloqueo que cubre una fecha 'yyyy-MM-dd' completa, si lo hay. */
export function bloqueoDeDiaCompleto(fecha, bloqueos = []) {
  return bloqueos.find(
    (bloqueo) =>
      esBloqueoDiaCompleto(bloqueo) && fecha >= bloqueo.fechaInicio && fecha <= bloqueo.fechaFin
  )
}

/**
 * Espeja la regla del backend (horarioAtencionService.evaluarVentana) para no
 * ofrecer horarios que la API va a rechazar. Devuelve { valido, codigo, motivo }.
 */
export function evaluarIntervalo(fecha, horaInicio, horaFin, { horarioAtencion, bloqueos = [] } = {}) {
  const inicio = parseMinutes(horaInicio)
  const fin = parseMinutes(horaFin)

  for (const bloqueo of bloqueos) {
    if (fecha < bloqueo.fechaInicio || fecha > bloqueo.fechaFin) continue
    if (esBloqueoDiaCompleto(bloqueo) ||
      (inicio < parseMinutes(bloqueo.horaFin) && fin > parseMinutes(bloqueo.horaInicio))) {
      return { valido: false, codigo: 'bloqueado', motivo: bloqueo.motivo }
    }
  }

  if (!horarioAtencion) return { valido: true }

  const [anio, mes, dia] = fecha.split('-').map(Number)
  const diaSemana = new Date(anio, mes - 1, dia).getDay()
  const franjas = horarioAtencion[String(diaSemana)] || []

  if (!franjas.length) return { valido: false, codigo: 'dia_cerrado' }

  const cabe = franjas.some(
    (franja) => inicio >= parseMinutes(franja.inicio) && fin <= parseMinutes(franja.fin)
  )

  return cabe ? { valido: true } : { valido: false, codigo: 'fuera_de_horario', franjas }
}

/**
 * ¿Se puede agendar en este slot de la grilla? Evalúa [slot, slot + 30).
 */
export function esSlotHabil(fecha, slot, { horarioAtencion, bloqueos = [] } = {}) {
  const inicio = parseMinutes(slot)
  const fin = inicio + SLOT_MINUTOS

  for (const bloqueo of bloqueos) {
    if (fecha < bloqueo.fechaInicio || fecha > bloqueo.fechaFin) continue
    if (esBloqueoDiaCompleto(bloqueo)) return false
    if (inicio < parseMinutes(bloqueo.horaFin) && fin > parseMinutes(bloqueo.horaInicio)) return false
  }

  if (!horarioAtencion) return true

  const [anio, mes, dia] = fecha.split('-').map(Number)
  const diaSemana = new Date(anio, mes - 1, dia).getDay()
  const franjas = horarioAtencion[String(diaSemana)] || []

  return franjas.some(
    (franja) => inicio >= parseMinutes(franja.inicio) && fin <= parseMinutes(franja.fin)
  )
}

/** Convierte "HH:MM" o "HH:MM:SS" a minutos totales desde medianoche. */
export function parseMinutes(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':').map(Number)
  return parts[0] * 60 + (parts[1] || 0)
}

/**
 * Calcula posición top (px) dentro de la grilla para una hora dada.
 * `gridInicio` es la primera hora que pinta la grilla, que ya no es
 * necesariamente medianoche: depende del horario de atención de la clínica.
 */
export function timeToTop(timeStr, slotHeight = SLOT_HEIGHT_MAX, gridInicio = HORA_INICIO) {
  const mins = parseMinutes(timeStr)
  const minutesFromStart = mins - gridInicio * 60
  return Math.max(0, (minutesFromStart / SLOT_MINUTOS) * slotHeight)
}

/** Calcula la altura (px) de un chip dados horaInicio y horaFin. */
export function calcCitaHeight(
  horaInicio,
  horaFin,
  slotHeight = SLOT_HEIGHT_MAX,
  gridInicio = HORA_INICIO,
  gridFin = HORA_FIN
) {
  const startMins = parseMinutes(horaInicio)
  const endMins = parseMinutes(horaFin)
  const clampedEnd = Math.min(endMins, gridFin * 60)
  const clampedStart = Math.max(startMins, gridInicio * 60)
  const effectiveDuration = Math.max(clampedEnd - clampedStart, 15)
  return Math.max((effectiveDuration / SLOT_MINUTOS) * slotHeight, 24)
}

export function buildStateTone(estado) {
  switch (estado) {
    case 'programada':
      return 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700'
    case 'en_espera':
      return 'border-violet-400 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-600'
    case 'en_atencion':
      return 'border-fuchsia-400 bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200 dark:border-fuchsia-600'
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
    case 'en_atencion': return '#e879f9'
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

export const VIEW_OPTIONS = [
  { value: 'dia', label: 'Día', shortcut: 'D' },
  { value: 'semana', label: 'Semana', shortcut: 'W' },
  { value: 'mes', label: 'Mes', shortcut: 'M' },
  { value: 'anio', label: 'Año', shortcut: 'Y' },
  { value: 'agenda', label: 'Agenda', shortcut: 'A' },
  { value: '4dias', label: '4 días', shortcut: 'X' },
]

/** Preferencias de visualización del calendario (checkboxes del selector de vista). */
export const VIEW_PREFS = [
  { key: 'mostrarFinesDeSemana', label: 'Mostrar fines de semana' },
  { key: 'mostrarCanceladas', label: 'Mostrar citas canceladas' },
  { key: 'mostrarCompletadas', label: 'Mostrar citas completadas' },
]

export const STATUS_OPTIONS = [
  { value: 'programada', label: 'Programada' },
  { value: 'en_espera', label: 'En espera' },
  { value: 'en_atencion', label: 'En atención' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_asistio', label: 'No asistió' },
]
