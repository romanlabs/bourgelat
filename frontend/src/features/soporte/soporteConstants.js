import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// Espejo de los ENUM del backend (services/soporteReglas.js). Si cambian alla,
// cambian aca.

export const ESTADOS_TICKET = {
  abierto: {
    label: 'Abierto',
    tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/60 dark:bg-sky-900/30 dark:text-sky-200',
    dot: 'bg-sky-500',
  },
  en_progreso: {
    label: 'En progreso',
    tone: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-600/50 dark:bg-violet-900/30 dark:text-violet-200',
    dot: 'bg-violet-500',
  },
  esperando_usuario: {
    label: 'Esperando tu respuesta',
    tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/50 dark:bg-amber-900/30 dark:text-amber-200',
    dot: 'bg-amber-500',
  },
  resuelto: {
    label: 'Resuelto',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-900/30 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
  cerrado: {
    label: 'Cerrado',
    tone: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-slate-400',
  },
}

export const CATEGORIAS_TICKET = [
  { value: 'error', label: 'Algo no funciona' },
  { value: 'duda', label: 'Duda de uso' },
  { value: 'facturacion', label: 'Facturación o pagos' },
  { value: 'sugerencia', label: 'Sugerencia' },
  { value: 'otro', label: 'Otro' },
]

export const PRIORIDADES_TICKET = [
  { value: 'baja', label: 'Puedo seguir trabajando', dot: 'bg-slate-400' },
  { value: 'media', label: 'Me retrasa', dot: 'bg-amber-400' },
  { value: 'alta', label: 'No puedo trabajar', dot: 'bg-red-500' },
]

export const FILTROS_ESTADO = [
  { value: 'activos', label: 'Activos' },
  { value: 'todos', label: 'Todos' },
  ...Object.entries(ESTADOS_TICKET).map(([value, { label }]) => ({ value, label })),
]

// Modulos que se pueden elegir al reportar. El valor es la ruta base.
export const MODULOS_APP = [
  { value: '', label: 'No aplica / no sé' },
  { value: '/dashboard', label: 'Panel de control' },
  { value: '/agenda', label: 'Agenda' },
  { value: '/pacientes', label: 'Pacientes' },
  { value: '/historias', label: 'Historias' },
  { value: '/antecedentes', label: 'Antecedentes' },
  { value: '/finanzas', label: 'Caja y finanzas' },
  { value: '/inventario', label: 'Inventario' },
  { value: '/usuarios', label: 'Usuarios' },
  { value: '/configuracion', label: 'Clínica y configuración' },
  { value: '/auditoria', label: 'Auditoría' },
  { value: '/perfil', label: 'Mi perfil' },
  { value: '/planes', label: 'Planes y pagos' },
]

const etiquetaPorValor = (lista, valor) => lista.find((item) => item.value === valor)?.label || valor

export const etiquetaCategoria = (valor) => etiquetaPorValor(CATEGORIAS_TICKET, valor)
export const prioridadTicket = (valor) =>
  PRIORIDADES_TICKET.find((item) => item.value === valor) || PRIORIDADES_TICKET[1]

/** '/pacientes/123/historial' -> '/pacientes' si es un modulo conocido. */
export const normalizarModulo = (ruta) => {
  if (!ruta) return ''
  const base = `/${String(ruta).split('?')[0].split('/').filter(Boolean)[0] || ''}`
  return MODULOS_APP.some((modulo) => modulo.value === base) ? base : ''
}

export const etiquetaModulo = (ruta) => {
  const base = normalizarModulo(ruta)
  return base ? etiquetaPorValor(MODULOS_APP, base) : ruta
}

export const formatearFechaTicket = (valor) => {
  if (!valor) return ''
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor))
}

export const formatearActividad = (valor) =>
  valor ? formatDistanceToNow(new Date(valor), { addSuffix: true, locale: es }) : ''
