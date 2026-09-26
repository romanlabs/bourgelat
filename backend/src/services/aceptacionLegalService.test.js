// Tests de las filas de consentimiento del registro. Se ejecutan con
// `node src/services/aceptacionLegalService.test.js` (integrados en `npm test`).
// No requieren base de datos: la construcción está extraída a una función pura.

const assert = require('assert')
const { construirAceptacionesRegistro } = require('./aceptacionLegalService')
const { VERSIONES_LEGALES } = require('../config/legal')

const base = {
  usuarioId: 'usuario-1',
  clinicaId: 'clinica-1',
  origen: 'registro',
  ip: '203.0.113.7',
  userAgent: 'Mozilla/5.0',
}

const porDocumento = (filas) => Object.fromEntries(filas.map((f) => [f.documento, f]))

// ── Registro con comunicaciones aceptadas ─────────────────────────────────
{
  const filas = porDocumento(construirAceptacionesRegistro({ ...base, aceptaComunicaciones: true }))

  assert.deepStrictEqual(Object.keys(filas).sort(), ['comunicaciones_comerciales', 'privacidad', 'terminos'])
  assert.strictEqual(filas.terminos.aceptado, true)
  assert.strictEqual(filas.terminos.version, VERSIONES_LEGALES.terminos)
  assert.strictEqual(filas.privacidad.aceptado, true)
  assert.strictEqual(filas.privacidad.version, VERSIONES_LEGALES.privacidad)
  assert.strictEqual(filas.comunicaciones_comerciales.aceptado, true)

  for (const fila of Object.values(filas)) {
    assert.strictEqual(fila.usuarioId, 'usuario-1')
    assert.strictEqual(fila.clinicaId, 'clinica-1')
    assert.strictEqual(fila.origen, 'registro')
    assert.strictEqual(fila.ip, '203.0.113.7')
    assert.strictEqual(fila.userAgent, 'Mozilla/5.0')
  }
}

// ── Comunicaciones: solo `true` cuenta como consentimiento ────────────────
// El rechazo también se registra, para probar qué eligió el usuario.
for (const valor of [false, undefined, null, 'true', 1]) {
  const filas = porDocumento(construirAceptacionesRegistro({ ...base, aceptaComunicaciones: valor }))
  assert.strictEqual(filas.comunicaciones_comerciales.aceptado, false, `valor ${String(valor)}`)
}

// ── Datos técnicos ausentes o demasiado largos ────────────────────────────
{
  const filas = construirAceptacionesRegistro({ ...base, ip: undefined, userAgent: 'x'.repeat(900) })
  assert.strictEqual(filas[0].ip, null)
  assert.strictEqual(filas[0].userAgent.length, 500)
}

console.log('aceptacionLegalService: OK')
