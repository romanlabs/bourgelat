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

module.exports = { CATEGORIAS_CON_VENCIMIENTO, requiereVencimiento, resolverVencimiento }
