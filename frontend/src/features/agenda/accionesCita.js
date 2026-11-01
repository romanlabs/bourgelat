import { Ban, CalendarClock, CheckCheck, DoorOpen, Stethoscope, UserX } from 'lucide-react'
import { ACCION_LABELS, ACCION_PRIMARIA, ESTADOS_RESUELTOS, TRANSICIONES } from '@/features/recepcion/recepcionConstants'

export const ICONO_ACCION = {
  en_espera: DoorOpen,
  en_atencion: Stethoscope,
  completada: CheckCheck,
  no_asistio: UserX,
  reprogramar: CalendarClock,
  cancelada: Ban,
}

// Tono del botón al deslizar (FilaDeslizable) y en la hoja de opciones.
export const TONO_ACCION = {
  reprogramar: 'info',
  cancelada: 'danger',
}

/**
 * Acciones de una cita en el celular (deslizar la tarjeta y mantenerla
 * presionada). Solo ofrece lo que ya existe en el detalle de la cita:
 * las transiciones de estado válidas, reprogramar y cancelar (estas dos
 * abren el detalle, porque piden fecha u observación).
 *
 * Cada acción: { key, label, tipo: 'estado' | 'reprogramar' | 'cancelar', estado? }
 */
export function accionesDeCita(cita, { puedeGestionarEstado = false, puedeReprogramar = false } = {}) {
  if (!cita) return []
  const transiciones = puedeGestionarEstado ? TRANSICIONES[cita.estado] || [] : []
  const acciones = transiciones
    .filter((estado) => estado !== 'cancelada')
    .map((estado) => ({ key: estado, label: ACCION_LABELS[estado], tipo: 'estado', estado }))

  // Igual que el detalle: no se reprograma lo completado ni lo cancelado.
  if (puedeReprogramar && !['completada', 'cancelada'].includes(cita.estado)) {
    acciones.push({ key: 'reprogramar', label: 'Reprogramar', tipo: 'reprogramar' })
  }
  if (transiciones.includes('cancelada')) {
    acciones.push({ key: 'cancelada', label: ACCION_LABELS.cancelada, tipo: 'cancelar' })
  }
  return acciones
}

/**
 * Las que caben al deslizar (máximo tres): la acción principal del estado,
 * reprogramar y cancelar. Una cita ya resuelta no ofrece atajos.
 */
export function accionesAlDeslizar(cita, permisos) {
  if (!cita || ESTADOS_RESUELTOS.includes(cita.estado)) return []
  const todas = accionesDeCita(cita, permisos)
  const primaria = ACCION_PRIMARIA[cita.estado]
  return todas.filter((accion) => accion.key === primaria || accion.tipo !== 'estado').slice(0, 3)
}
