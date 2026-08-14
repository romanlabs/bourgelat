// Las cuatro primeras son la oferta vigente. Las tres ultimas son legado: no se
// ofrecen, pero el historial de suscripciones todavia las contiene y sin su
// etiqueta las filas viejas se verian con la llave cruda.
export const PLAN_META = {
  prueba: {
    nombre: 'Prueba',
    tone: 'bg-sky-50 text-sky-700 border-sky-200',
    accent: '#0369a1',
  },
  activo: {
    nombre: 'Bourgelat',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accent: '#0f766e',
  },
  cortesia: {
    nombre: 'Cortesía',
    tone: 'bg-violet-50 text-violet-700 border-violet-200',
    accent: '#6d28d9',
  },
  personalizado: {
    nombre: 'Personalizado',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    accent: '#92400e',
  },
  inicio: {
    nombre: 'Esencial (legado)',
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    accent: '#0f172a',
  },
  clinica: {
    nombre: 'Clinica (legado)',
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    accent: '#0f172a',
  },
  profesional: {
    nombre: 'Profesional (legado)',
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    accent: '#0f172a',
  },
}

// Bajo el modelo de plan único todos los planes traen agenda, historias,
// antecedentes, pacientes, roles, inventario, caja y reportes. Listarlos sería
// una tabla de doce filas siempre en verde. Aquí solo va lo que se compra
// aparte y por lo tanto puede variar entre clínicas.
export const FEATURE_LABELS = {
  facturacion_electronica: 'Facturación electrónica',
  acompanamiento_migracion: 'Acompañamiento de migración',
  soporte_prioritario_comercial: 'Soporte prioritario comercial',
}

export const PAYMENT_METHOD_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  tarjeta_debito: 'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  otro: 'Otro',
}

export const CITA_ESTADO_LABELS = {
  programada: 'Programadas',
  en_espera: 'En espera',
  en_atencion: 'En atención',
  completada: 'Completadas',
  cancelada: 'Canceladas',
  no_asistio: 'No asistió',
}

export const CITA_TIPO_LABELS = {
  consulta_general: 'Consulta general',
  vacunacion: 'Vacunación',
  cirugia: 'Cirugía',
  desparasitacion: 'Desparasitación',
  control: 'Control',
  urgencia: 'Urgencia',
  peluqueria: 'Peluquería',
  laboratorio: 'Laboratorio',
  radiografia: 'Radiografía',
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

const toLocalDate = (value) => {
  if (!value) return null
  const s = String(value)
  const dateStr = s.includes('T') ? s : `${s}T00:00:00`
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

export const formatShortDate = (value) => {
  const d = toLocalDate(value)
  if (!d) return '-'
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(d)
}

export const formatLongDate = (value) => {
  const d = toLocalDate(value)
  if (!d) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
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

// `fecha` es la etiqueta visible del eje X; `fechaISO` conserva la clave original
// (YYYY-MM-DD) para poder buscar un dia puntual sin depender del formato mostrado.
export const mapIngresosPorDia = (record) =>
  Object.entries(record || {}).map(([date, value]) => ({
    fechaISO: date,
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
