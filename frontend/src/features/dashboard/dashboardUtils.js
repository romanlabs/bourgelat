export const PLAN_META = {
  inicio: {
    nombre: 'Inicio Gratis',
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    accent: '#0f172a',
  },
  clinica: {
    nombre: 'Clinica',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accent: '#0f766e',
  },
  profesional: {
    nombre: 'Profesional',
    tone: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    accent: '#0f4c81',
  },
  personalizado: {
    nombre: 'Personalizado',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    accent: '#92400e',
  },
}

export const FEATURE_LABELS = {
  citas: 'Agenda y citas',
  historias: 'Historias clinicas',
  antecedentes: 'Antecedentes',
  propietarios: 'Tutores y propietarios',
  mascotas: 'Pacientes y fichas',
  roles_base: 'Roles base del equipo',
  inventario: 'Inventario clinico',
  facturacion_interna: 'Caja y facturacion',
  facturacion_electronica: 'Facturacion electronica',
  reportes_operativos: 'Reportes operativos',
  reportes_completos: 'Reportes completos',
  exportables: 'Exportables',
  acompanamiento_migracion: 'Acompanamiento de migracion',
  soporte_prioritario_comercial: 'Soporte prioritario comercial',
}

export const PAYMENT_METHOD_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  tarjeta_debito: 'Tarjeta debito',
  tarjeta_credito: 'Tarjeta credito',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  otro: 'Otro',
}

export const CITA_ESTADO_LABELS = {
  programada: 'Programadas',
  confirmada: 'Confirmadas',
  en_curso: 'En curso',
  completada: 'Completadas',
  cancelada: 'Canceladas',
  no_asistio: 'No asistio',
}

export const CITA_TIPO_LABELS = {
  consulta_general: 'Consulta general',
  vacunacion: 'Vacunacion',
  cirugia: 'Cirugia',
  desparasitacion: 'Desparasitacion',
  control: 'Control',
  urgencia: 'Urgencia',
  peluqueria: 'Peluqueria',
  laboratorio: 'Laboratorio',
  radiografia: 'Radiografia',
  otro: 'Otro',
}

export const CHART_COLORS = ['#0f4c81', '#0f766e', '#f59e0b', '#7c3aed', '#dc2626', '#64748b']

export const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

export const formatNumber = (value) =>
  new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

export const formatShortDate = (value) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T00:00:00`))
}

export const formatLongDate = (value) => {
  if (!value) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const getCurrentMonthRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const serialize = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return {
    fechaInicio: serialize(start),
    fechaFin: serialize(end),
  }
}

export const objectToChartData = (record, labels = {}) =>
  Object.entries(record || {}).map(([key, value], index) => ({
    key,
    name: labels[key] || key,
    value: Number(value || 0),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))

export const mapIngresosPorDia = (record) =>
  Object.entries(record || {}).map(([date, value]) => ({
    fecha: formatShortDate(date),
    total: Number(value || 0),
  }))

export const getUsagePercentage = (used, limit) => {
  if (limit === null || limit === undefined || limit === 0) return null
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)))
}

export const getFeatureStateRows = (featureList) =>
  Object.entries(FEATURE_LABELS).map(([key, label]) => ({
    id: key,
    label,
    enabled: featureList.includes(key),
  }))
