// Tests de las funciones puras de turnos de caja (vencimiento y calculo de
// cierre). Se ejecutan con `node src/utils/turnoCaja.test.js` (integrado en
// `npm test`). No requieren base de datos.

const assert = require('assert')
const { esTurnoVencido, calcularCierreTurno, convertirANumero, redondear } = require('./turnoCaja')

// ── convertirANumero ─────────────────────────────────────────────────────
assert.strictEqual(convertirANumero('12.5'), 12.5, 'string numerico')
assert.strictEqual(convertirANumero(undefined, 7), 7, 'undefined -> default')
assert.strictEqual(convertirANumero(null, 7), 7, 'null -> default')
assert.strictEqual(convertirANumero('', 7), 7, 'vacio -> default')
assert.strictEqual(convertirANumero('abc', 7), 7, 'no numerico -> default')

// ── redondear ─────────────────────────────────────────────────────────────
assert.strictEqual(redondear(10.005), 10.01, 'redondea a 2 decimales')
assert.strictEqual(redondear('10.1'), 10.1, 'acepta string')

// ── esTurnoVencido ────────────────────────────────────────────────────────
const HOY = new Date('2026-09-02T15:00:00')
const ayerMismaHora = new Date('2026-09-01T15:00:00')
const hoyTemprano = new Date('2026-09-02T00:05:00')
const hoyTarde = new Date('2026-09-02T23:55:00')
const anteayer = new Date('2026-08-31T23:59:00')

assert.strictEqual(
  esTurnoVencido({ fechaApertura: ayerMismaHora }, HOY),
  true,
  'turno abierto ayer a la misma hora esta vencido'
)
assert.strictEqual(
  esTurnoVencido({ fechaApertura: hoyTemprano }, HOY),
  false,
  'turno abierto hoy temprano no esta vencido'
)
assert.strictEqual(
  esTurnoVencido({ fechaApertura: hoyTarde }, HOY),
  false,
  'turno abierto hoy tarde no esta vencido'
)
assert.strictEqual(
  esTurnoVencido({ fechaApertura: anteayer }, HOY),
  true,
  'turno de hace varios dias esta vencido'
)

// ── calcularCierreTurno ──────────────────────────────────────────────────
const turnoBase = {
  montoInicial: 50000,
  totalVentasEfectivo: 100000,
  totalIngresosManuales: 5000,
  totalEgresosManuales: 2000,
}
// esperado = 50000 + 100000 + 5000 - 2000 = 153000

let resultado = calcularCierreTurno(turnoBase, { montoFinalContado: 'abc' })
assert.strictEqual(resultado.error?.status, 400, 'monto contado invalido -> error 400')

resultado = calcularCierreTurno(turnoBase, { montoFinalContado: -10 })
assert.strictEqual(resultado.error?.status, 400, 'monto contado negativo -> error 400')

resultado = calcularCierreTurno(turnoBase, { montoFinalContado: 153000 })
assert.ok(!resultado.error, 'sin diferencia no da error')
assert.strictEqual(resultado.diferencia, 0, 'diferencia 0 cuando coincide')
assert.strictEqual(resultado.categoriaDiferencia, null, 'sin diferencia -> sin categoria')
assert.strictEqual(resultado.requiereRevisionAdmin, false, 'sin diferencia no requiere revision')

// Diferencia pequena (<= 3000), no requiere comentario
resultado = calcularCierreTurno(turnoBase, { montoFinalContado: 154000 })
assert.ok(!resultado.error, 'diferencia pequena no exige comentario')
assert.strictEqual(resultado.diferencia, 1000)

// Diferencia grande (> 3000) sin comentario -> error
resultado = calcularCierreTurno(turnoBase, { montoFinalContado: 160000 })
assert.strictEqual(resultado.error?.status, 400, 'diferencia grande sin comentario -> error')

// Diferencia grande con comentario corto -> error
resultado = calcularCierreTurno(turnoBase, {
  montoFinalContado: 160000,
  observacionesCierre: 'muy corto',
})
assert.strictEqual(resultado.error?.status, 400, 'comentario corto -> error')

// Diferencia grande con comentario largo pero sin categoria -> error
resultado = calcularCierreTurno(turnoBase, {
  montoFinalContado: 160000,
  observacionesCierre: 'Conteo revisado dos veces, no se encontro el origen del faltante',
})
assert.strictEqual(resultado.error?.status, 400, 'sin categoria -> error')

// Diferencia grande con comentario y categoria -> ok, sin revision admin (7000 <= 30000)
resultado = calcularCierreTurno(turnoBase, {
  montoFinalContado: 160000,
  observacionesCierre: 'Conteo revisado dos veces, no se encontro el origen del faltante',
  categoriaDiferencia: 'causa_desconocida',
})
assert.ok(!resultado.error, 'con justificacion completa no da error')
assert.strictEqual(resultado.requiereRevisionAdmin, false, '7000 de diferencia no exige revision admin')

// Diferencia > 30000 -> requiere revision admin
resultado = calcularCierreTurno(turnoBase, {
  montoFinalContado: 190000,
  observacionesCierre: 'Conteo revisado dos veces, no se encontro el origen del faltante',
  categoriaDiferencia: 'causa_desconocida',
})
assert.ok(!resultado.error)
assert.strictEqual(resultado.requiereRevisionAdmin, true, '37000 de diferencia exige revision admin')

console.log('turnoCaja.test.js: OK')
