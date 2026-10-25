// Reglas puras del Resumen de Finanzas: rango del mes, lectura de la serie
// diaria, cómo pagan y la edad de la cartera.
import { chartColors } from '@/lib/theme'
import { fechaLocal } from '@/lib/fecha'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const partes = (iso) => String(iso).slice(0, 10).split('-').map(Number)

// '2026-10' → { fechaInicio: '2026-10-01', fechaFin: '2026-10-31' }
export const rangoDelMes = (anioMes) => {
  const [anio, mes] = partes(`${anioMes}-01`)
  return {
    fechaInicio: `${anioMes}-01`,
    fechaFin: fechaLocal(new Date(anio, mes, 0)),
  }
}

export const nombreMes = (anioMes) => MESES[partes(`${anioMes}-01`)[1] - 1] || ''

// '2026-10-13' → 'martes 13'
export const nombreDia = (fechaISO) => {
  const [anio, mes, dia] = partes(fechaISO)
  return `${DIAS_SEMANA[new Date(anio, mes - 1, dia).getDay()]} ${dia}`
}

// Lectura de una serie diaria: el mejor día, cuántos días hubo ventas y el
// promedio de esos días (los cerrados no bajan el promedio).
export const leerSerieDiaria = (serie = []) => {
  const conVentas = serie.filter((fila) => fila.ingresos > 0 || fila.ventas > 0)
  const mejor = conVentas.reduce(
    (elegido, fila) => (!elegido || fila.ingresos > elegido.ingresos ? fila : elegido),
    null
  )
  const total = conVentas.reduce((suma, fila) => suma + fila.ingresos, 0)
  return {
    mejor: mejor && mejor.ingresos > 0 ? mejor : null,
    diasConVentas: conVentas.length,
    promedioDiaConVentas: conVentas.length ? Math.round(total / conVentas.length) : 0,
  }
}

// Cómo pagan: Nequi, Daviplata y bancos van como transferencia (igual que la
// venta) y las tarjetas en una sola franja. El color sigue al método, no a su
// puesto, para que «Efectivo» sea del mismo color todos los meses.
const GRUPOS_METODO = [
  { id: 'transferencia', label: 'Transferencia', metodos: ['transferencia', 'nequi', 'daviplata'] },
  { id: 'efectivo', label: 'Efectivo', metodos: ['efectivo'] },
  { id: 'tarjeta', label: 'Tarjeta', metodos: ['tarjeta', 'tarjeta_debito', 'tarjeta_credito'] },
  { id: 'credito', label: 'A crédito', metodos: ['credito'] },
  { id: 'otro', label: 'Otro', metodos: ['otro'] },
]

const COLORES_METODO = {
  claro: {
    transferencia: chartColors.categorica[0],
    efectivo: chartColors.categorica[1],
    tarjeta: chartColors.categorica[2],
    credito: chartColors.categorica[7],
    otro: chartColors.categorica[5],
  },
  oscuro: {
    transferencia: chartColors.oscuro.petroleo,
    efectivo: chartColors.categorica[1],
    tarjeta: chartColors.categorica[7],
    credito: chartColors.categorica[5],
    otro: chartColors.estados.neutro,
  },
}

export const agruparMetodosPago = (porMetodo = {}, { oscuro = false } = {}) => {
  const colores = oscuro ? COLORES_METODO.oscuro : COLORES_METODO.claro
  const conocidos = new Set(GRUPOS_METODO.flatMap((grupo) => grupo.metodos))
  const grupos = GRUPOS_METODO.map((grupo) => ({
    id: grupo.id,
    label: grupo.label,
    color: colores[grupo.id],
    valor: grupo.metodos.reduce((suma, metodo) => suma + Number(porMetodo[metodo] || 0), 0),
  }))
  // Un método que no conocemos no se pierde: suma en «Otro».
  const otro = grupos.find((grupo) => grupo.id === 'otro')
  for (const [metodo, valor] of Object.entries(porMetodo)) {
    if (!conocidos.has(metodo)) otro.valor += Number(valor || 0)
  }

  const total = grupos.reduce((suma, grupo) => suma + grupo.valor, 0)
  return grupos
    .filter((grupo) => grupo.valor > 0)
    .map((grupo) => ({ ...grupo, porcentaje: total ? Math.round((grupo.valor / total) * 100) : 0 }))
}

export const diasDesde = (fechaISO, hoy = fechaLocal()) => {
  if (!fechaISO) return null
  const [a1, m1, d1] = partes(fechaISO)
  const [a2, m2, d2] = partes(hoy)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

// Ingresos y gastos: petróleo y ámbar, validados para daltónicos en los dos
// modos. En claro el ámbar oscuro queda en 2,9:1 sobre blanco: por eso la
// gráfica lleva leyenda y vista de tabla.
export const coloresSerie = (oscuro) =>
  oscuro
    ? { ingresos: chartColors.oscuro.petroleo, gastos: chartColors.categorica[1], resalte: chartColors.categorica[1], ganancia: chartColors.oscuro.tinta }
    : { ingresos: chartColors.categorica[0], gastos: chartColors.categorica[8], resalte: chartColors.categorica[1], ganancia: chartColors.categorica[9] }
