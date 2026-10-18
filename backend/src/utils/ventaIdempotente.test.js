// Tests de la idempotencia de ventas. Se ejecutan con
// `node src/utils/ventaIdempotente.test.js` (integrado en `npm test`).

const assert = require('assert')
const {
  INDICE_CLAVE_IDEMPOTENCIA,
  leerClaveIdempotencia,
  esConflictoClaveIdempotencia,
} = require('./ventaIdempotente')

const UUID = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c'

// leerClaveIdempotencia
assert.strictEqual(leerClaveIdempotencia(undefined), null, 'sin clave -> null')
assert.strictEqual(leerClaveIdempotencia(null), null, 'null -> null')
assert.strictEqual(leerClaveIdempotencia(''), null, 'vacia -> null')
assert.strictEqual(leerClaveIdempotencia(UUID), UUID, 'uuid valido')
assert.strictEqual(leerClaveIdempotencia(UUID.toUpperCase()), UUID, 'mayusculas se normalizan')
assert.strictEqual(leerClaveIdempotencia(`  ${UUID} `), UUID, 'espacios se recortan')
assert.strictEqual(leerClaveIdempotencia('abc'), false, 'texto cualquiera')
assert.strictEqual(leerClaveIdempotencia(`${UUID}x`), false, 'uuid con basura')
assert.strictEqual(leerClaveIdempotencia('   '), false, 'solo espacios')
assert.strictEqual(leerClaveIdempotencia(123), false, 'numero')
assert.strictEqual(leerClaveIdempotencia({}), false, 'objeto')
assert.strictEqual(leerClaveIdempotencia([UUID]), false, 'arreglo')

// esConflictoClaveIdempotencia
const errorUnico = (extra) => Object.assign(new Error('Validation error'), {
  name: 'SequelizeUniqueConstraintError',
  ...extra,
})

assert.strictEqual(
  esConflictoClaveIdempotencia(errorUnico({ parent: { constraint: INDICE_CLAVE_IDEMPOTENCIA } })),
  true,
  'choque en el indice de la clave'
)
assert.strictEqual(
  esConflictoClaveIdempotencia(errorUnico({ original: { constraint: INDICE_CLAVE_IDEMPOTENCIA } })),
  true,
  'choque informado en original'
)
assert.strictEqual(
  esConflictoClaveIdempotencia(errorUnico({ parent: { constraint: 'facturas_numero_clinica_id' } })),
  false,
  'choque en otro indice unico'
)
assert.strictEqual(
  esConflictoClaveIdempotencia(errorUnico({ fields: { clinicaId: 'x', claveIdempotencia: UUID } })),
  true,
  'sin nombre de restriccion, por campos'
)
assert.strictEqual(
  esConflictoClaveIdempotencia(errorUnico({ fields: { numero: 'F-1' } })),
  false,
  'sin nombre de restriccion, otros campos'
)
assert.strictEqual(esConflictoClaveIdempotencia(new Error('otro')), false, 'error comun')
assert.strictEqual(esConflictoClaveIdempotencia(null), false, 'sin error')

console.log('ventaIdempotente.test.js: todos los tests pasaron ✔')
