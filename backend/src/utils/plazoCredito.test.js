// node src/utils/plazoCredito.test.js (integrado en `npm test`)
const assert = require('assert')
const { vencimientoCredito } = require('./plazoCredito')

// Sin plazo: la venta no vence.
assert.deepStrictEqual(vencimientoCredito(undefined, '2026-10-25'), { fecha: null })
assert.deepStrictEqual(vencimientoCredito('', '2026-10-25'), { fecha: null })

// Con plazo: hoy + días, cruzando mes y año.
assert.deepStrictEqual(vencimientoCredito(15, '2026-10-25'), { fecha: '2026-11-09' })
assert.deepStrictEqual(vencimientoCredito('30', '2026-12-15'), { fecha: '2027-01-14' })

// Plazos que no sirven.
for (const malo of [0, -5, 2.5, 366, 'abc']) {
  assert.ok(vencimientoCredito(malo, '2026-10-25').error, `plazo ${malo} debe rechazarse`)
}

console.log('plazoCredito.test.js OK')
