// Idempotencia de la creación de ventas (POST /api/facturas).
//
// El POS manda `claveIdempotencia` (UUID) en el body. Si la red se cae
// después de guardar la venta y la cajera reintenta con la misma clave, el
// backend devuelve la venta ya guardada en vez de crear otra (que duplicaba
// el descuento de stock y el efectivo del turno).
//
// Va en el body y no en el header `Idempotency-Key` a propósito: ese header
// lo toma el middleware global de idempotencia, que guarda también las
// respuestas de error y repetiría, por ejemplo, un 409 de «abre un turno de
// caja» aunque la cajera ya lo hubiera abierto.

const INDICE_CLAVE_IDEMPOTENCIA = 'facturas_clinica_clave_idempotencia_unique'

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// null  → la petición no trae clave (flujo de siempre, sin idempotencia).
// false → trae algo que no es un UUID.
// texto → la clave normalizada en minúsculas.
const leerClaveIdempotencia = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null
  if (typeof valor !== 'string') return false
  const clave = valor.trim().toLowerCase()
  return PATRON_UUID.test(clave) ? clave : false
}

// Dos peticiones simultáneas con la misma clave: el índice único parcial
// frena la segunda. Solo ese índice cuenta; otro choque único (p. ej. el
// número de factura) sigue siendo un error de verdad.
const esConflictoClaveIdempotencia = (error) => {
  if (!error || error.name !== 'SequelizeUniqueConstraintError') return false
  const restriccion = error.parent?.constraint || error.original?.constraint
  if (restriccion) return restriccion === INDICE_CLAVE_IDEMPOTENCIA
  return Boolean(error.fields && Object.prototype.hasOwnProperty.call(error.fields, 'claveIdempotencia'))
}

module.exports = {
  INDICE_CLAVE_IDEMPOTENCIA,
  leerClaveIdempotencia,
  esConflictoClaveIdempotencia,
}
