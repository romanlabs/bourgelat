// Tests de la decision de vigencia de suscripciones. Se ejecutan con
// `node src/services/suscripcionService.test.js` (integrados en `npm test`).
// No requieren base de datos: la decision esta extraida a una funcion pura.

const assert = require('assert')
const {
  resolverEstadoSuscripcion,
  esSoloLectura,
  calcularDiasRestantes,
  ESTADOS_VIGENTES,
} = require('./suscripcionService')

const HOY = '2026-08-12'

// ── Sin suscripcion: se crea una prueba ───────────────────────────────────
assert.strictEqual(resolverEstadoSuscripcion({ suscripcion: null, hoy: HOY }).accion, 'crear')

// ── Vigente: no se toca ───────────────────────────────────────────────────
assert.strictEqual(
  resolverEstadoSuscripcion({
    suscripcion: { estado: 'activa', fechaFin: '2026-09-30', plan: 'activo' },
    hoy: HOY,
  }).accion,
  'vigente'
)

// La prueba que aun no vence sigue vigente y avisa la fecha de corte.
const enPrueba = resolverEstadoSuscripcion({
  suscripcion: { estado: 'prueba', fechaFin: '2026-08-30', plan: 'prueba' },
  hoy: HOY,
})
assert.strictEqual(enPrueba.accion, 'vigente')
assert.ok(enPrueba.advertencia.includes('2026-08-30'), 'debe avisar la fecha de corte')

// El ultimo dia todavia cuenta como vigente.
assert.strictEqual(
  resolverEstadoSuscripcion({
    suscripcion: { estado: 'prueba', fechaFin: HOY, plan: 'prueba' },
    hoy: HOY,
  }).accion,
  'vigente'
)

// ── Vencida: pasa a solo lectura conservando su plan ──────────────────────
const vencida = resolverEstadoSuscripcion({
  suscripcion: { estado: 'prueba', fechaFin: '2026-08-11', plan: 'prueba' },
  hoy: HOY,
})
assert.strictEqual(vencida.accion, 'a_solo_lectura')

// ── Ya en solo lectura: no se vuelve a escribir en cada peticion ──────────
// Sin esto el servicio haria un UPDATE por request para siempre.
assert.strictEqual(
  resolverEstadoSuscripcion({
    suscripcion: { estado: 'solo_lectura', fechaFin: '2026-01-01', plan: 'activo' },
    hoy: HOY,
  }).accion,
  'vigente'
)

// ── solo_lectura se resuelve como suscripcion vigente ─────────────────────
// Debe encontrarse para que el frontend pueda mostrar el estado.
assert.ok(ESTADOS_VIGENTES.includes('solo_lectura'))
assert.ok(ESTADOS_VIGENTES.includes('activa'))
assert.ok(ESTADOS_VIGENTES.includes('prueba'))

// ── Helper de lectura ─────────────────────────────────────────────────────
assert.strictEqual(esSoloLectura({ estado: 'solo_lectura' }), true)
assert.strictEqual(esSoloLectura({ estado: 'activa' }), false)
assert.strictEqual(esSoloLectura(null), false)

// ── calcularDiasRestantes: no hay cuenta regresiva en solo lectura ────────
assert.strictEqual(
  calcularDiasRestantes({
    suscripcion: { estado: 'solo_lectura', fechaFin: '2026-01-01' },
    hoy: HOY,
  }),
  null,
  'solo_lectura no tiene dias restantes que mostrar'
)

// ── calcularDiasRestantes: la fecha centinela de cortesia tampoco cuenta ──
assert.strictEqual(
  calcularDiasRestantes({
    suscripcion: { estado: 'activa', fechaFin: '2099-12-31' },
    hoy: HOY,
  }),
  null,
  'la fecha centinela de cortesia no vence, no hay cuenta regresiva'
)

// ── calcularDiasRestantes: suscripcion normal cuenta los dias ─────────────
assert.strictEqual(
  calcularDiasRestantes({
    suscripcion: { estado: 'prueba', fechaFin: '2026-08-15' },
    hoy: HOY,
  }),
  3
)

console.log('suscripcionService.test.js: todos los tests pasaron ✔')
