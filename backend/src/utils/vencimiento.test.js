// Tests de resolverVencimiento. Se ejecutan con `node src/utils/vencimiento.test.js`
// (integrado en `npm test`). No requieren base de datos.

const assert = require('assert')
const { requiereVencimiento, resolverVencimiento } = require('./vencimiento')

for (const categoria of ['medicamento', 'vacuna', 'insumo', 'alimento', 'antiparasitario', 'suplemento']) {
  assert.strictEqual(requiereVencimiento(categoria), true, `${categoria} requiere vencimiento`)
}
for (const categoria of ['accesorio', 'otro', undefined, null]) {
  assert.strictEqual(requiereVencimiento(categoria), false, `${categoria} no requiere vencimiento`)
}

const base = { stockAnterior: 10, fechaActual: '2026-12-01', loteActual: 'A1' }

assert.deepStrictEqual(
  resolverVencimiento({ ...base, fechaItem: null, loteItem: 'B2' }),
  { fechaVencimiento: '2026-12-01', lote: 'A1' },
  'item sin fecha no cambia nada'
)

assert.deepStrictEqual(
  resolverVencimiento({ ...base, fechaItem: '2027-03-01', loteItem: 'B2' }),
  { fechaVencimiento: '2026-12-01', lote: 'A1' },
  'fecha del item posterior: se conserva la mas cercana'
)

assert.deepStrictEqual(
  resolverVencimiento({ ...base, fechaItem: '2026-11-01', loteItem: 'B2' }),
  { fechaVencimiento: '2026-11-01', lote: 'B2' },
  'fecha del item anterior: pasa a ser la del producto con su lote'
)

assert.deepStrictEqual(
  resolverVencimiento({ ...base, stockAnterior: 0, fechaItem: '2027-03-01', loteItem: 'B2' }),
  { fechaVencimiento: '2027-03-01', lote: 'B2' },
  'sin stock previo la fecha vieja se reemplaza'
)

assert.deepStrictEqual(
  resolverVencimiento({ stockAnterior: 5, fechaActual: null, loteActual: null, fechaItem: '2027-03-01', loteItem: '' }),
  { fechaVencimiento: '2027-03-01', lote: null },
  'producto sin fecha toma la del item'
)

assert.deepStrictEqual(
  resolverVencimiento({ ...base, fechaActual: '2025-01-01', fechaItem: '2027-03-01', loteItem: 'B2' }),
  { fechaVencimiento: '2025-01-01', lote: 'A1' },
  'fecha vieja ya vencida con stock se conserva para que siga alertando'
)

console.log('vencimiento.test.js OK')
