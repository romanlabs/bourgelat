export const TYPE_OPTIONS = [
  { value: 'consulta_general', label: 'Consulta general' },
  { value: 'vacunacion', label: 'Vacunacion' },
  { value: 'cirugia', label: 'Cirugia' },
  { value: 'desparasitacion', label: 'Desparasitacion' },
  { value: 'control', label: 'Control' },
  { value: 'urgencia', label: 'Urgencia' },
  { value: 'peluqueria', label: 'Peluqueria' },
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'radiografia', label: 'Radiografia' },
  { value: 'otro', label: 'Otro' },
]

export const ESTADO_LABELS = {
  programada: 'Programada',
  en_espera: 'En espera',
  en_atencion: 'En atencion',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistio',
}

/** Clases con soporte dark mode — usadas por la fila de la sala de espera y sus badges. */
export const ESTADO_TONE = {
  programada: 'border-warm-300 bg-warm-100 text-warm-700 dark:border-warm-500/40 dark:bg-warm-500/15 dark:text-warm-200',
  en_espera: 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200',
  en_atencion: 'border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-200',
  completada: 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200',
  cancelada: 'border-red-300 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200',
  no_asistio: 'border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-200',
}

export const ESTADO_DOT = {
  programada: 'bg-warm-400',
  en_espera: 'bg-blue-500',
  en_atencion: 'bg-violet-500',
  completada: 'bg-emerald-500',
  cancelada: 'bg-red-400',
  no_asistio: 'bg-orange-400',
}

export const ORIGEN_LABELS = {
  programada: 'Programada',
  walk_in: 'Walk-in',
}

/** Espejo del mapa de transiciones del backend (citaController.js) — controla que botones mostrar por fila. */
export const TRANSICIONES = {
  programada: ['en_espera', 'en_atencion', 'cancelada', 'no_asistio'],
  en_espera: ['en_atencion', 'cancelada', 'no_asistio'],
  en_atencion: ['completada', 'cancelada'],
  completada: [],
  cancelada: [],
  no_asistio: [],
}

export const ACCION_LABELS = {
  en_espera: 'Marcar llegada',
  en_atencion: 'Iniciar atencion',
  completada: 'Completar',
  cancelada: 'Cancelar',
  no_asistio: 'No asistio',
}
