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

/**
 * De todas las transiciones validas de un estado, la que recepcion hace casi
 * siempre. Se muestra como unico boton en la fila; el resto de TRANSICIONES
 * queda en el menu secundario. Debe ser siempre un valor presente en
 * TRANSICIONES[estado] o la fila no ofrecera accion primaria.
 */
export const ACCION_PRIMARIA = {
  programada: 'en_espera',
  en_espera: 'en_atencion',
  en_atencion: 'completada',
}

/** Orden de lectura de la sala de espera: lo que esta pasando primero. */
export const GRUPOS = [
  { estado: 'en_atencion', label: 'En atencion', dot: 'bg-violet-500', text: 'text-violet-700' },
  { estado: 'en_espera', label: 'En espera', dot: 'bg-blue-500', text: 'text-blue-700' },
  { estado: 'programada', label: 'Por llegar', dot: 'bg-warm-400', text: 'text-warm-700' },
]

export const ESTADOS_RESUELTOS = ['completada', 'cancelada', 'no_asistio']
