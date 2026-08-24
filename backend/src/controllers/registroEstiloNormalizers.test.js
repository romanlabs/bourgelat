// Tests de los normalizadores de RegistroEstilo. Se ejecutan con
// `node src/controllers/registroEstiloNormalizers.test.js` (integrado en `npm test`).
// No requieren base de datos: son funciones puras.

const assert = require('assert')
const {
  cleanText,
  normalizarTipoCorte,
  normalizarObservaciones,
  normalizarProximaCita,
} = require('./registroEstiloNormalizers')

// ── cleanText ──────────────────────────────────────────────────────────────
assert.strictEqual(cleanText('  Corte   teddy  bear ', 240), 'Corte teddy bear', 'colapsa espacios y recorta')
assert.strictEqual(cleanText('', 240), undefined, 'cadena vacia -> undefined')
assert.strictEqual(cleanText('   ', 240), undefined, 'solo espacios -> undefined')
assert.strictEqual(cleanText(null, 240), undefined, 'null -> undefined')
assert.strictEqual(cleanText(undefined, 240), undefined, 'undefined -> undefined')
assert.strictEqual(cleanText('a'.repeat(300), 240).length, 240, 'recorta al maximo')

// ── normalizarTipoCorte ────────────────────────────────────────────────────
assert.strictEqual(normalizarTipoCorte('Rapado higienico'), 'Rapado higienico', 'texto normal')
assert.strictEqual(normalizarTipoCorte('  '), undefined, 'vacio -> undefined')
assert.strictEqual(normalizarTipoCorte('x'.repeat(300)).length, 240, 'tipo de corte se recorta a 240')

// ── normalizarObservaciones ────────────────────────────────────────────────
assert.strictEqual(normalizarObservaciones('Pelaje enredado'), 'Pelaje enredado', 'texto normal')
assert.strictEqual(normalizarObservaciones(''), undefined, 'vacio -> undefined')
assert.strictEqual(normalizarObservaciones('y'.repeat(5000)).length, 4000, 'observaciones se recortan a 4000')

// ── normalizarProximaCita ──────────────────────────────────────────────────
assert.strictEqual(normalizarProximaCita('2026-09-15'), '2026-09-15', 'fecha valida pasa igual')
assert.strictEqual(normalizarProximaCita(''), null, 'vacio -> null')
assert.strictEqual(normalizarProximaCita(null), null, 'null -> null')
assert.strictEqual(normalizarProximaCita(undefined), null, 'undefined -> null')
assert.throws(
  () => normalizarProximaCita('15/09/2026'),
  /fecha/i,
  'formato invalido lanza error'
)
assert.throws(
  () => normalizarProximaCita('2026-13-45'),
  /fecha/i,
  'fecha imposible lanza error'
)

console.log('registroEstiloNormalizers tests OK')
