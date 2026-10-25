// Al anular una venta, cada producto vuelve a la bodega salvo que se diga lo
// contrario: se entregó al cliente, se dañó o venció. El que no vuelve se
// registra igual como devolución y enseguida sale con su motivo, así el kardex
// cuenta qué pasó y el stock queda como si no hubiera vuelto.
const RAZONES_SIN_REINGRESO = {
  entregado: { motivo: 'otro', texto: 'entregado al cliente' },
  danado: { motivo: 'otro', texto: 'dañado' },
  vencido: { motivo: 'vencimiento', texto: 'vencido' },
}

// Devuelve { porItem: Map(facturaItemId → razon) } o { error }.
const leerSinReingreso = (items = [], noVuelven = []) => {
  if (noVuelven === undefined || noVuelven === null) noVuelven = []
  if (!Array.isArray(noVuelven)) return { error: 'noVuelven debe ser una lista' }
  const productos = new Map(
    items.filter((item) => item.tipo === 'producto' && item.productoId).map((item) => [String(item.id), item])
  )
  const porItem = new Map()
  for (const entrada of noVuelven) {
    const id = String(entrada?.facturaItemId || '')
    if (!productos.has(id)) return { error: 'Un producto marcado para no volver no es de esta venta' }
    if (!RAZONES_SIN_REINGRESO[entrada.razon]) return { error: 'Razón no válida para un producto que no vuelve' }
    porItem.set(id, entrada.razon)
  }
  return { porItem }
}

module.exports = { RAZONES_SIN_REINGRESO, leerSinReingreso }
