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

const { clasificarVencimiento, hoyISO, sumarDiasISO } = require('./vencimiento')

assert.strictEqual(sumarDiasISO('2026-12-15', 30), '2027-01-14', 'suma de dias cruza de anio')
assert.match(hoyISO(), /^\d{4}-\d{2}-\d{2}$/, 'hoyISO devuelve YYYY-MM-DD')
assert.strictEqual(hoyISO(new Date('2026-10-11T03:00:00Z')), '2026-10-10', 'hoyISO usa hora de Colombia')

const HOY = '2026-10-10'
const clasificar = (fechaVencimiento, stock = 5) => clasificarVencimiento({ fechaVencimiento, stock }, HOY)

assert.strictEqual(clasificar('2026-10-09'), 'vencido', 'ayer: vencido')
assert.strictEqual(clasificar('2026-10-10'), 'proximo', 'vence hoy: proximo, no vencido')
assert.strictEqual(clasificar('2026-11-09'), 'proximo', 'dia 30: proximo')
assert.strictEqual(clasificar('2026-11-10'), null, 'dia 31: sin alerta')
assert.strictEqual(clasificar(null), null, 'sin fecha: sin alerta')
assert.strictEqual(clasificar('2026-01-01', 0), null, 'vencido sin stock: sin alerta')

// Servicio de relevo (modelos simulados, sin base de datos)
const { actualizarVencimiento } = require('../services/vencimientoService')

const crearItem = (datos) => ({
  ...datos,
  async update(cambios) { Object.assign(this, cambios) },
})
const movimientos = []
const MovimientoModelo = { async create(datos) { movimientos.push(datos); return datos } }
const relevar = (item, extra) => actualizarVencimiento({
  item, MovimientoModelo, camposMovimiento: { productoId: 'p1' }, transaction: {}, ...extra,
})

;(async () => {
  let item = crearItem({ stock: 10, fechaVencimiento: '2026-09-01', lote: 'A1' })
  let r = await relevar(item, { cantidadVencida: 4, nuevaFechaVencimiento: '2027-02-01' })
  assert.strictEqual(r.status, 200)
  assert.strictEqual(item.stock, 6, 'descuenta lo vencido')
  assert.strictEqual(item.fechaVencimiento, '2027-02-01', 'pasa a la siguiente fecha')
  assert.strictEqual(item.lote, null, 'el lote viejo se limpia al cambiar la fecha')
  assert.strictEqual(movimientos.length, 1)
  assert.deepStrictEqual(
    [movimientos[0].tipo, movimientos[0].motivo, movimientos[0].cantidad, movimientos[0].stockNuevo],
    ['salida', 'vencimiento', 4, 6]
  )

  item = crearItem({ stock: 3, fechaVencimiento: '2026-09-01', lote: null })
  r = await relevar(item, { cantidadVencida: 3 })
  assert.strictEqual(r.status, 200)
  assert.strictEqual(item.stock, 0)
  assert.strictEqual(item.fechaVencimiento, null, 'sin stock no queda fecha')

  item = crearItem({ stock: 3, fechaVencimiento: '2026-09-01' })
  r = await relevar(item, { cantidadVencida: 1 })
  assert.strictEqual(r.status, 400, 'quedan unidades: exige la nueva fecha')
  assert.strictEqual(item.stock, 3, 'una peticion invalida no modifica el item')

  r = await relevar(item, { cantidadVencida: 9, nuevaFechaVencimiento: '2099-01-01' })
  assert.strictEqual(r.status, 400, 'no se pueden retirar mas unidades que el stock')

  r = await relevar(item, { cantidadVencida: 1, nuevaFechaVencimiento: '2020-01-01' })
  assert.strictEqual(r.status, 400, 'la nueva fecha no puede estar en el pasado')

  const antes = movimientos.length
  item = crearItem({ stock: 3, fechaVencimiento: '2026-10-15', lote: 'X' })
  r = await relevar(item, { cantidadVencida: 0, nuevaFechaVencimiento: '2027-01-01' })
  assert.strictEqual(r.status, 200)
  assert.strictEqual(item.stock, 3, 'solo corrige la fecha')
  assert.strictEqual(movimientos.length, antes, 'sin unidades vencidas no hay movimiento')

  console.log('vencimiento.test.js OK')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
