// Tests de la validación de descuentos de venta. Se ejecutan con
// `node src/utils/descuentoVenta.test.js` (integrado en `npm test`).

const assert = require('assert')
const { leerDescuento } = require('./descuentoVenta')

assert.strictEqual(leerDescuento(undefined, 100), 0, 'sin descuento -> 0')
assert.strictEqual(leerDescuento(null, 100), 0, 'null -> 0')
assert.strictEqual(leerDescuento('', 100), 0, 'vacio -> 0')
assert.strictEqual(leerDescuento(0, 100), 0, 'cero')
assert.strictEqual(leerDescuento(25, 100), 25, 'numero valido')
assert.strictEqual(leerDescuento('25.5', 100), 25.5, 'string numerico')
assert.strictEqual(leerDescuento(100, 100), 100, 'igual al maximo')

assert.strictEqual(leerDescuento(100.01, 100), null, 'mayor que el subtotal')
assert.strictEqual(leerDescuento(-5, 100), null, 'negativo')
assert.strictEqual(leerDescuento('-5', 100), null, 'string negativo')
assert.strictEqual(leerDescuento('abc', 100), null, 'no numerico')
assert.strictEqual(leerDescuento('10abc', 100), null, 'numero con basura')
assert.strictEqual(leerDescuento(NaN, 100), null, 'NaN')
assert.strictEqual(leerDescuento(Infinity, 100), null, 'Infinity')
assert.strictEqual(leerDescuento(true, 100), null, 'booleano')
assert.strictEqual(leerDescuento({}, 100), null, 'objeto')

console.log('descuentoVenta.test.js: todos los tests pasaron ✔')
