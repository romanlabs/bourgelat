// node src/utils/reingresoAnulacion.test.js (integrado en `npm test`)
const assert = require('assert')
const { leerSinReingreso } = require('./reingresoAnulacion')

const items = [
  { id: 'i1', tipo: 'producto', productoId: 'p1', cantidad: 2 },
  { id: 'i2', tipo: 'producto', productoId: 'p2', cantidad: 1 },
  { id: 'i3', tipo: 'servicio', servicioClinicoId: 's1', cantidad: 1 },
]

// Sin indicaciones: todo vuelve (comportamiento de siempre).
assert.strictEqual(leerSinReingreso(items, []).porItem.size, 0)
assert.strictEqual(leerSinReingreso(items, undefined).porItem.size, 0)

// Uno entregado y uno vencido.
const { porItem } = leerSinReingreso(items, [
  { facturaItemId: 'i1', razon: 'entregado' },
  { facturaItemId: 'i2', razon: 'vencido' },
])
assert.strictEqual(porItem.get('i1'), 'entregado')
assert.strictEqual(porItem.get('i2'), 'vencido')

// Errores: ítem ajeno, un servicio (no tiene stock que devolver) o razón inventada.
assert.ok(leerSinReingreso(items, [{ facturaItemId: 'otro', razon: 'danado' }]).error)
assert.ok(leerSinReingreso(items, [{ facturaItemId: 'i3', razon: 'danado' }]).error)
assert.ok(leerSinReingreso(items, [{ facturaItemId: 'i1', razon: 'regalado' }]).error)
assert.ok(leerSinReingreso(items, 'i1').error)

console.log('reingresoAnulacion.test.js OK')
