// Tests del costo promedio al anular una compra clinica. Se ejecutan con
// `node src/utils/costoInsumo.test.js` (integrado en `npm test`).

const assert = require('assert');
const { costoAntesDeCompra } = require('./costoInsumo');

// Antes: 100 ml a 10/ml. Compra: 2 frascos de 100 ml a 1.500 c/u (3.000).
// Despues: 300 ml a (1000 + 3000) / 300 = 13.33.
const base = {
  costoActual: 13.33,
  stockActual: 300,
  unidadesCompra: 200,
  costoCompraTotal: 3000,
  costoTrasCompra: 13.33,
};
// El promedio se guarda a 2 decimales, asi que la restauracion es aproximada.
const r = costoAntesDeCompra(base);
assert.ok(Math.abs(r - 10) <= 0.02, `restaura el promedio previo (${r})`);

// Con consumo posterior (las salidas no cambian el costo): quedan 250 ml.
const conSalida = costoAntesDeCompra({ ...base, stockActual: 250 });
assert.ok(Math.abs(conSalida - (13.33 * 250 - 3000) / 50) < 0.01, 'con salidas posteriores');

assert.strictEqual(costoAntesDeCompra({
  costoActual: 15, stockActual: 200, unidadesCompra: 100, costoCompraTotal: 2000, costoTrasCompra: 15,
}), 10, 'cifras exactas');

assert.strictEqual(costoAntesDeCompra({ ...base, costoActual: 14 }), null, 'otra compra o edicion cambio el costo');
assert.strictEqual(costoAntesDeCompra({ ...base, stockActual: 200 }), null, 'sin stock previo (consumido)');
assert.strictEqual(costoAntesDeCompra({ ...base, stockActual: 100 }), null, 'stock menor que la compra');
assert.strictEqual(costoAntesDeCompra({ ...base, costoTrasCompra: null }), null, 'compra antigua sin datos');
assert.strictEqual(costoAntesDeCompra({ ...base, costoCompraTotal: 99999 }), null, 'resultado negativo');

console.log('costoInsumo.test.js OK');
