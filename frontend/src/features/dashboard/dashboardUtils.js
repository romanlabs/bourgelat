import { chartColors } from '@/lib/theme'

export const PAYMENT_METHOD_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  tarjeta_debito: 'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  credito: 'A crédito',
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

export const CHART_COLORS = chartColors.categorica

// Color por estado, alineado con `getAccentColor` del calendario: sin esto el
// color lo asignaba el indice de iteracion, de modo que "cancelada" cambiaba de
// color segun cuantos estados trajera el periodo y nunca coincidia con la grilla.
export const CITA_ESTADO_COLORS = {
  programada: chartColors.estados.neutro,
  en_espera: chartColors.estados.warning,
  en_atencion: chartColors.estados.info,
  completada: chartColors.estados.success,
  cancelada: chartColors.estados.danger,
  no_asistio: chartColors.estados.dangerSuave,
}

// Urgencia y cirugía conservan los tonos de alerta; el resto toma la paleta
// categórica en orden.
const [pino, petroleo, caramelo, miel, ladrillo, tintaSuave, salvia, tinta, arcilla, oliva] = chartColors.categorica
export const CITA_TIPO_COLORS = {
  consulta_general: pino,
  vacunacion: petroleo,
  cirugia: arcilla,
  desparasitacion: caramelo,
  control: miel,
  urgencia: ladrillo,
  peluqueria: salvia,
  laboratorio: oliva,
  radiografia: tinta,
  otro: tintaSuave,
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

export const toLocalDate = (value) => {
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

// El backend solo devuelve los días que tienen citas; aquí se completa el rango
// con ceros para que el eje X no salte días (del 20 al 23 parecía seguido). La
// clave ISO (YYYY-MM-DD) se conserva en `fechaISO`.
export const mapSerieCitas = (serie, rango) => {
  const porFecha = new Map((serie || []).map((punto) => [punto.fecha, punto]))
  const fechas = []

  if (rango?.fechaInicio && rango?.fechaFin) {
    const [anio, mes, dia] = rango.fechaInicio.split('-').map(Number)
    for (let d = new Date(anio, mes - 1, dia); serializeDate(d) <= rango.fechaFin; d.setDate(d.getDate() + 1)) {
      fechas.push(serializeDate(d))
    }
  } else {
    fechas.push(...porFecha.keys())
  }

  return fechas.map((fecha) => {
    const punto = porFecha.get(fecha) || {}
    return {
      fechaISO: fecha,
      fecha: formatShortDate(fecha),
      total: Number(punto.total || 0),
      completadas: Number(punto.completadas || 0),
      noAsistio: Number(punto.noAsistio || 0),
    }
  })
}

// Franja horaria: el backend agrupa por EXTRACT(HOUR ...) y solo trae las horas
// con citas. Se rellena de 7 a. m. a 6 p. m. (o más si hubo citas por fuera) para
// que se vean los huecos del día, y se etiqueta en formato de 12 horas.
const etiquetaHora = (hora) => (hora === 0 ? '12a' : hora === 12 ? '12m' : hora > 12 ? `${hora - 12}p` : `${hora}a`)

export const mapFranjaHoraria = (record) => {
  const totales = new Map(Object.entries(record || {}).map(([hora, total]) => [Number(hora), Number(total || 0)]))
  if (totales.size === 0) return []

  const horas = [...totales.keys()]
  const desde = Math.min(7, ...horas)
  const hasta = Math.max(18, ...horas)

  return Array.from({ length: hasta - desde + 1 }, (_, i) => {
    const hora = desde + i
    return { key: String(hora), name: etiquetaHora(hora), total: totales.get(hora) || 0 }
  })
}

export const objectToChartData = (record, labels = {}, colors = {}) =>
  Object.entries(record || {}).map(([key, value], index) => ({
    key,
    name: labels[key] || key,
    value: Number(value || 0),
    color: colors[key] || CHART_COLORS[index % CHART_COLORS.length],
  }))
