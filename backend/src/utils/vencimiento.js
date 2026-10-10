// Accesorios y "otro" no caducan; el resto exige vencimiento al confirmar compras.
// Mantener en sync con frontend/src/features/inventario/inventarioUtils.js.
const CATEGORIAS_CON_VENCIMIENTO = [
  'medicamento', 'vacuna', 'insumo', 'alimento', 'antiparasitario', 'suplemento',
]

const requiereVencimiento = (categoria) => CATEGORIAS_CON_VENCIMIENTO.includes(categoria)

// El producto guarda un solo vencimiento: el de lo primero que se vence. Si no
// habia existencias antes de la compra, la fecha anterior era de mercancia que
// ya salio y se reemplaza en vez de compararse.
const resolverVencimiento = ({ stockAnterior, fechaActual, loteActual, fechaItem, loteItem }) => {
  const actual = { fechaVencimiento: fechaActual || null, lote: loteActual || null }
  if (!fechaItem) return actual

  const delItem = { fechaVencimiento: fechaItem, lote: loteItem || null }
  if (Number(stockAnterior) <= 0 || !fechaActual) return delItem

  // Fechas YYYY-MM-DD: la comparacion de cadenas respeta el orden cronologico.
  return String(fechaItem) < String(fechaActual) ? delItem : actual
}

const DIAS_ALERTA_VENCIMIENTO = 30

// Fecha de hoy como YYYY-MM-DD en hora de Colombia. Las fechas de vencimiento son
// DATEONLY: compararlas contra un Date con hora falla en el borde del dia.
const hoyISO = (ahora = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(ahora)

const sumarDiasISO = (fechaISO, dias) => {
  const [anio, mes, dia] = String(fechaISO).split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10)
}

// 'vencido' (fecha anterior a hoy), 'proximo' (de hoy a 30 dias) o null. Un
// producto sin existencias no cuenta: no hay nada que vigilar ni sacar.
const clasificarVencimiento = ({ fechaVencimiento, stock }, hoy = hoyISO()) => {
  if (!fechaVencimiento || Number(stock) <= 0) return null
  const fecha = String(fechaVencimiento).slice(0, 10)
  if (fecha < hoy) return 'vencido'
  if (fecha <= sumarDiasISO(hoy, DIAS_ALERTA_VENCIMIENTO)) return 'proximo'
  return null
}

module.exports = {
  CATEGORIAS_CON_VENCIMIENTO,
  DIAS_ALERTA_VENCIMIENTO,
  requiereVencimiento,
  resolverVencimiento,
  hoyISO,
  sumarDiasISO,
  clasificarVencimiento,
}
