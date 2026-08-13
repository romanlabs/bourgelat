// Tests del cupo de almacenamiento. Se ejecutan con
// `node src/services/almacenamientoService.test.js` (integrados en `npm test`).
// La decision es pura y no requiere base de datos.

const assert = require('assert')
const { hayCupoAlmacenamiento, MB } = require('./almacenamientoService')

// ── Caso normal ───────────────────────────────────────────────────────────
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: 100, limiteMB: 2048, bytesNuevos: 2 * MB }),
  true
)

// ── Justo en el borde: llenar el cupo exacto se permite ───────────────────
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: 2046, limiteMB: 2048, bytesNuevos: 2 * MB }),
  true
)

// ── Pasarse por un byte se rechaza ────────────────────────────────────────
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: 2046, limiteMB: 2048, bytesNuevos: 2 * MB + 1 }),
  false
)

// ── Limite nulo significa sin limite (plan personalizado) ─────────────────
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: 999999, limiteMB: null, bytesNuevos: 50 * MB }),
  true
)

// ── Un contador corrupto no debe bloquear la clinica entera ───────────────
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: null, limiteMB: 2048, bytesNuevos: 1 * MB }),
  true
)

// ── El contador como string (DECIMAL de Sequelize) debe compararse bien ───
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: '2046.00', limiteMB: 2048, bytesNuevos: 2 * MB }),
  true
)
assert.strictEqual(
  hayCupoAlmacenamiento({ usadoMB: '2046.00', limiteMB: 2048, bytesNuevos: 2 * MB + 1 }),
  false
)

console.log('almacenamientoService.test.js: todos los tests pasaron ✔')
