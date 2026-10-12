// Tests de la configuracion de planes. Se ejecutan con `node src/config/planes.test.js`
// (integrados en `npm test`). No requieren base de datos.

const assert = require('assert')
const {
  PLAN_KEYS,
  PLAN_KEYS_ACTIVOS,
  PLANES,
  PLANES_PUBLICOS,
  DEFAULT_INITIAL_PLAN,
  DIAS_PRUEBA,
  USUARIOS_BASE,
  FUNCIONALIDAD_DIAN,
  CORTESIA_END_DATE,
  crearSuscripcionPrueba,
  crearSuscripcionCortesia,
  formatDateOnly,
  addDaysDateOnly,
} = require('./planes')

// ── El ENUM conserva las llaves legado ────────────────────────────────────
// Postgres no permite eliminar valores de un ENUM sin recrear el tipo, y hay
// filas de pilotos apuntando a 'inicio'.
for (const legado of ['inicio', 'clinica', 'profesional']) {
  assert.ok(PLAN_KEYS.includes(legado), `PLAN_KEYS debe conservar '${legado}' para el ENUM`)
  assert.ok(!PLAN_KEYS_ACTIVOS.includes(legado), `'${legado}' no debe ofrecerse`)
  assert.strictEqual(PLANES[legado], undefined, `'${legado}' no debe tener configuracion`)
}

// ── Los cinco planes ofrecidos ───────────────────────────────────────────
assert.deepStrictEqual(
  PLAN_KEYS_ACTIVOS,
  ['prueba', 'esencial', 'activo', 'cortesia', 'personalizado'],
  'planes ofrecidos'
)
assert.deepStrictEqual(Object.keys(PLANES).sort(), [...PLAN_KEYS_ACTIVOS].sort())
assert.strictEqual(DEFAULT_INITIAL_PLAN, 'prueba')

// ── Ningun plan incluye DIAN ──────────────────────────────────────────────
// Es la unica funcionalidad que se compra aparte; se agrega a la fila de
// suscripcion, nunca al plan.
for (const [key, plan] of Object.entries(PLANES)) {
  assert.ok(
    !plan.funcionalidades.includes(FUNCIONALIDAD_DIAN),
    `el plan '${key}' no debe incluir ${FUNCIONALIDAD_DIAN}`
  )
}

// ── Precios y cupos acordados ─────────────────────────────────────────────
assert.strictEqual(PLANES.activo.precioMensual, 89000)
assert.strictEqual(PLANES.activo.precioAnual, 75000)
assert.strictEqual(PLANES.activo.limiteUsuarios, USUARIOS_BASE)
assert.strictEqual(USUARIOS_BASE, 3)
assert.strictEqual(PLANES.activo.almacenamientoMB, 20480)

assert.strictEqual(PLANES.esencial.precioMensual, 49000)
assert.strictEqual(PLANES.esencial.precioAnual, 41000)
assert.strictEqual(PLANES.esencial.limiteUsuarios, 1)
assert.strictEqual(PLANES.esencial.almacenamientoMB, 5120)
assert.ok(PLANES.esencial.precioMensual < PLANES.activo.precioMensual)
assert.ok(!PLANES.esencial.funcionalidades.includes('reportes_completos'))
assert.ok(!PLANES.esencial.funcionalidades.includes('exportables'))
assert.ok(PLANES.esencial.funcionalidades.includes('reportes_operativos'))
assert.ok(PLANES.activo.funcionalidades.includes('reportes_completos'))

assert.strictEqual(PLANES.prueba.limiteUsuarios, 2)
assert.strictEqual(PLANES.prueba.almacenamientoMB, 2048)
assert.strictEqual(DIAS_PRUEBA, 30)

assert.strictEqual(PLANES.cortesia.precioMensual, 0)
assert.strictEqual(PLANES.cortesia.limiteUsuarios, 3)

// ── El volumen es ilimitado en todos los planes ───────────────────────────
for (const [key, plan] of Object.entries(PLANES)) {
  assert.strictEqual(plan.limiteMascotas, null, `el plan '${key}' no debe limitar mascotas`)
}

// ── Las funcionalidades no se comparten por referencia ────────────────────
// Si dos planes apuntaran al mismo arreglo, comprar DIAN en uno lo activaria
// en el otro.
assert.notStrictEqual(PLANES.prueba.funcionalidades, PLANES.activo.funcionalidades)

// ── Constructores de suscripcion ──────────────────────────────────────────
const CLINICA = '11111111-1111-1111-1111-111111111111'

const prueba = crearSuscripcionPrueba(CLINICA)
assert.strictEqual(prueba.plan, 'prueba')
assert.strictEqual(prueba.estado, 'prueba')
assert.strictEqual(prueba.clinicaId, CLINICA)
assert.strictEqual(prueba.precio, 0)
assert.strictEqual(prueba.fechaInicio, formatDateOnly())
assert.strictEqual(prueba.fechaFin, addDaysDateOnly(DIAS_PRUEBA))
assert.strictEqual(prueba.limiteUsuarios, 2)

const cortesia = crearSuscripcionCortesia(CLINICA)
assert.strictEqual(cortesia.plan, 'cortesia')
assert.strictEqual(cortesia.estado, 'activa')
assert.strictEqual(cortesia.fechaFin, CORTESIA_END_DATE)

// ── PLANES_PUBLICOS solo expone lo ofrecido ───────────────────────────────
assert.deepStrictEqual(Object.keys(PLANES_PUBLICOS).sort(), [...PLAN_KEYS_ACTIVOS].sort())
assert.strictEqual(PLANES_PUBLICOS.activo.key, 'activo')
assert.strictEqual(PLANES_PUBLICOS.activo.nombre, 'Clinica')
assert.strictEqual(PLANES_PUBLICOS.esencial.nombre, 'Esencial')

// ── Totales anuales derivados ─────────────────────────────────────────────
assert.strictEqual(PLANES_PUBLICOS.activo.precioAnualTotal, 900000)
assert.strictEqual(PLANES_PUBLICOS.activo.ahorroAnual, 168000)
assert.strictEqual(PLANES_PUBLICOS.esencial.precioAnualTotal, 492000)
assert.strictEqual(PLANES_PUBLICOS.esencial.ahorroAnual, 96000)
assert.strictEqual(PLANES_PUBLICOS.prueba.ahorroAnual, 0)

console.log('planes.test.js: todos los tests pasaron ✔')
