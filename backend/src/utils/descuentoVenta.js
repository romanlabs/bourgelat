// Validación de descuentos de una venta. Un descuento no numérico, negativo o
// mayor que lo que descuenta se rechaza en vez de recortarse en silencio: antes
// '10abc' pasaba como 10, 'abc' como 0, un negativo subía el total y uno mayor
// que el subtotal dejaba una venta de $0 guardada como exitosa.

const NUMERO_VALIDO = /^\s*\d+(\.\d+)?\s*$/

// Devuelve el descuento como número, o null si es inválido. Vacío = 0.
const leerDescuento = (valor, maximo) => {
  if (valor === undefined || valor === null || valor === '') return 0
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor) || valor < 0) return null
  } else if (typeof valor !== 'string' || !NUMERO_VALIDO.test(valor)) {
    return null
  }
  const numero = Number(valor)
  // Tolerancia de medio centavo por redondeo de punto flotante.
  if (numero > maximo + 0.005) return null
  return numero
}

module.exports = { leerDescuento }
