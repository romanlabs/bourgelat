// Tests de las reglas de estado de la emisión electrónica. Se ejecutan con
// `node src/utils/emisionElectronica.test.js` (integrado en `npm test`).

const assert = require('assert')
const {
  ESTADOS_EMITIBLES,
  resolverFalloEmision,
  respuestaValidacionCompleta,
} = require('./emisionElectronica')

// Una factura validada o en envío no se puede volver a emitir.
assert.ok(!ESTADOS_EMITIBLES.includes('validada'), 'validada no es emitible')
assert.ok(!ESTADOS_EMITIBLES.includes('enviada'), 'enviada no es emitible')
assert.ok(ESTADOS_EMITIBLES.includes('error') && ESTADOS_EMITIBLES.includes('rechazada'), 'se reintenta tras error o rechazo')

// Falla antes de enviar (token del proveedor): seguro reintentar, nunca 401.
let r = resolverFalloEmision({ etapa: 'antes_de_enviar', error: { status: 401 } })
assert.strictEqual(r.estadoElectronico, 'error')
assert.strictEqual(r.httpStatus, 502, 'un 401 del proveedor no llega como 401')

// Rechazo de la DIAN.
r = resolverFalloEmision({ etapa: 'envio', error: { status: 422 } })
assert.strictEqual(r.estadoElectronico, 'rechazada')
assert.strictEqual(r.httpStatus, 422)

// Otro error HTTP del proveedor durante el envío.
r = resolverFalloEmision({ etapa: 'envio', error: { status: 500 } })
assert.strictEqual(r.estadoElectronico, 'error')
assert.strictEqual(r.httpStatus, 502)
r = resolverFalloEmision({ etapa: 'envio', error: { status: 403 } })
assert.strictEqual(r.httpStatus, 502, 'un 403 del proveedor no llega como 403')

// Corte o tiempo agotado: no se sabe si llegó → queda bloqueada.
r = resolverFalloEmision({ etapa: 'envio', error: new Error('timeout') })
assert.strictEqual(r.estadoElectronico, 'enviada')
assert.strictEqual(r.httpStatus, 504)
assert.ok(!/factus/i.test(r.mensaje), 'sin nombre del proveedor en el mensaje')

// Solo es validada con CUFE y número.
assert.strictEqual(respuestaValidacionCompleta({ cufe: 'abc', number: 'SETP1' }), true)
assert.strictEqual(respuestaValidacionCompleta({ number: 'SETP1' }), false)
assert.strictEqual(respuestaValidacionCompleta({ cufe: 'abc' }), false)
assert.strictEqual(respuestaValidacionCompleta(null), false)

console.log('emisionElectronica.test.js: todos los tests pasaron ✔')
