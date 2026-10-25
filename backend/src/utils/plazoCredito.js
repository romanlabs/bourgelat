// Plazo opcional de una venta a crédito: en cuántos días el cliente queda en
// pagar. Sin plazo la venta no vence (fiado abierto, como hasta ahora).
const { hoyISO, sumarDiasISO } = require('./vencimiento')

const PLAZO_MAXIMO_DIAS = 365

// { fecha: 'YYYY-MM-DD' | null } o { error } si el plazo no sirve.
const vencimientoCredito = (plazoDias, hoy = hoyISO()) => {
  if (plazoDias === undefined || plazoDias === null || plazoDias === '') return { fecha: null }
  const dias = Number(plazoDias)
  if (!Number.isInteger(dias) || dias < 1 || dias > PLAZO_MAXIMO_DIAS) {
    return { error: `El plazo del crédito debe ser de 1 a ${PLAZO_MAXIMO_DIAS} días` }
  }
  return { fecha: sumarDiasISO(hoy, dias) }
}

module.exports = { PLAZO_MAXIMO_DIAS, vencimientoCredito }
