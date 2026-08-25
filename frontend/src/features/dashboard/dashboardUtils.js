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

// Color por estado, alineado con `getAccentColor` del calendario: sin esto el
// color lo asignaba el indice de iteracion, de modo que "cancelada" cambiaba de
// color segun cuantos estados trajera el periodo y nunca coincidia con la grilla.
export const CITA_ESTADO_COLORS = {
  programada: '#93c5fd',
  en_espera: '#a78bfa',
  en_atencion: '#e879f9',
  completada: '#34d399',
  cancelada: '#f87171',
  no_asistio: '#fbbf24',
}

export const CITA_TIPO_COLORS = {
  consulta_general: '#0f766e',
  vacunacion: '#0f4c81',
  cirugia: '#dc2626',
  desparasitacion: '#7c3aed',
  control: '#f59e0b',
  urgencia: '#e11d48',
  peluqueria: '#0ea5e9',
  laboratorio: '#65a30d',
  radiografia: '#475569',
  otro: '#64748b',
}

export const CITA_ORIGEN_LABELS = {
  programada: 'Programadas',
  walk_in: 'Llegada espontánea',
}

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

// `colors` es opcional: cuando se pasa un mapa por clave el color es semantico
// (el mismo estado siempre del mismo color); si falta la clave se cae al ciclo
// por indice de siempre, que es lo que usan las demas graficas.
const serializeDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const PERIODO_PRESETS = [
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'mes', label: 'Mes actual' },
  { id: 'trimestre', label: 'Trimestre' },
]

// Rango de fechas de un preset del selector de periodo. Los rangos "N dias"
// incluyen hoy, de modo que 7d son hoy y los seis dias anteriores.
export const getRangeForPreset = (preset) => {
  const hoy = new Date()

  if (preset === 'mes') return getCurrentMonthRange()

  if (preset === 'trimestre') {
    const trimestre = Math.floor(hoy.getMonth() / 3)
    return {
      fechaInicio: serializeDate(new Date(hoy.getFullYear(), trimestre * 3, 1)),
      fechaFin: serializeDate(new Date(hoy.getFullYear(), trimestre * 3 + 3, 0)),
    }
  }

  const dias = preset === '7d' ? 7 : 30
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1))

  return { fechaInicio: serializeDate(inicio), fechaFin: serializeDate(hoy) }
}

// El backend entrega serieDiaria ya ordenada por fecha; aqui solo se le agrega
// la etiqueta legible del eje X, conservando la clave ISO como en mapIngresosPorDia.
export const mapSerieCitas = (serie) =>
  (serie || []).map((punto) => ({
    fechaISO: punto.fecha,
    fecha: formatShortDate(punto.fecha),
    total: Number(punto.total || 0),
    completadas: Number(punto.completadas || 0),
    noAsistio: Number(punto.noAsistio || 0),
  }))

// Franja horaria: el backend agrupa por EXTRACT(HOUR ...), asi que las claves
// son numeros de hora. Se ordenan y se etiquetan en formato de 12 horas.
export const mapFranjaHoraria = (record) =>
  Object.entries(record || {})
    .map(([hora, total]) => ({ hora: Number(hora), total: Number(total || 0) }))
    .sort((a, b) => a.hora - b.hora)
    .map(({ hora, total }) => ({
      key: String(hora),
      name: hora === 0 ? '12a' : hora === 12 ? '12m' : hora > 12 ? `${hora - 12}p` : `${hora}a`,
      total,
    }))

export const objectToChartData = (record, labels = {}, colors = {}) =>
  Object.entries(record || {}).map(([key, value], index) => ({
    key,
    name: labels[key] || key,
    value: Number(value || 0),
    color: colors[key] || CHART_COLORS[index % CHART_COLORS.length],
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
