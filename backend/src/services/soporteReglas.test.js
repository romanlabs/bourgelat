// Tests de las reglas del modulo de soporte. Se ejecutan con
// `node src/services/soporteReglas.test.js` (integrados en `npm test`).
// No requieren base de datos: son el contrato que comparten la app de la
// clinica, el script del equipo y el futuro panel web de soporte.

const assert = require('assert')
const reglas = require('./soporteReglas')
const { escaparHtml } = require('./emailService')

const CLINICA = 'clinica-a'
const OTRA_CLINICA = 'clinica-b'

const admin = reglas.construirActorUsuario({ id: 'u-admin', nombre: 'Ana', rol: 'admin', clinicaId: CLINICA })
const recepcion = reglas.construirActorUsuario({ id: 'u-recep', nombre: 'Rosa', rol: 'recepcionista', clinicaId: CLINICA })
const otraRecepcion = reglas.construirActorUsuario({ id: 'u-otra', nombre: 'Olga', rol: 'recepcionista', clinicaId: CLINICA })
const vetConAdmin = reglas.construirActorUsuario({
  id: 'u-vet',
  nombre: 'Victor',
  rol: 'veterinario',
  rolesAdicionales: ['admin'],
  clinicaId: CLINICA,
})
const adminOtraClinica = reglas.construirActorUsuario({ id: 'u-x', nombre: 'Xime', rol: 'admin', clinicaId: OTRA_CLINICA })
const soporte = reglas.construirActorSoporte({ nombre: 'Sergio' })

const ticketDeRecepcion = { clinicaId: CLINICA, creadoPorId: 'u-recep' }

// ── Codigo y referencias ──────────────────────────────────────────────────
assert.strictEqual(reglas.formatearCodigoTicket(42), 'SOP-00042')
assert.strictEqual(reglas.formatearCodigoTicket(123456), 'SOP-123456')

const uuid = '3f2b8c1e-9a4d-4e5f-8b6a-1c2d3e4f5a6b'
assert.deepStrictEqual(reglas.parsearReferenciaTicket(uuid), { id: uuid })
assert.deepStrictEqual(reglas.parsearReferenciaTicket('42'), { numero: 42 })
assert.deepStrictEqual(reglas.parsearReferenciaTicket('SOP-00042'), { numero: 42 })
assert.deepStrictEqual(reglas.parsearReferenciaTicket('sop42'), { numero: 42 })
assert.strictEqual(reglas.parsearReferenciaTicket('abc'), null)
assert.strictEqual(reglas.parsearReferenciaTicket(''), null)
assert.strictEqual(reglas.parsearReferenciaTicket("1; DROP TABLE"), null)

// ── Visibilidad ───────────────────────────────────────────────────────────
assert.ok(reglas.puedeVerTicket(recepcion, ticketDeRecepcion), 'quien lo creo lo ve')
assert.ok(!reglas.puedeVerTicket(otraRecepcion, ticketDeRecepcion), 'un companero no admin no lo ve')
assert.ok(reglas.puedeVerTicket(admin, ticketDeRecepcion), 'el admin ve todos los de su clinica')
assert.ok(reglas.puedeVerTicket(vetConAdmin, ticketDeRecepcion), 'rolesAdicionales admin tambien ve todo')
assert.ok(!reglas.puedeVerTicket(adminOtraClinica, ticketDeRecepcion), 'nunca se ve otra clinica')
assert.ok(reglas.puedeVerTicket(soporte, ticketDeRecepcion), 'el equipo ve todo')
assert.ok(!reglas.puedeVerTicket(null, ticketDeRecepcion))

assert.deepStrictEqual(reglas.whereVisibilidad(recepcion), { clinicaId: CLINICA, creadoPorId: 'u-recep' })
assert.deepStrictEqual(reglas.whereVisibilidad(admin), { clinicaId: CLINICA })
assert.deepStrictEqual(reglas.whereVisibilidad(soporte), {})
assert.throws(() => reglas.whereVisibilidad({ tipo: 'usuario', id: 'u', roles: [] }), /clinica/)

assert.deepStrictEqual(reglas.opcionesTenant(soporte), { sinTenant: true })
assert.deepStrictEqual(reglas.opcionesTenant(recepcion), {}, 'la clinica nunca se salta el tenantGuard')

// ── Transiciones ──────────────────────────────────────────────────────────
assert.ok(reglas.validarTransicion('abierto', 'cerrado', recepcion), 'la clinica puede cerrar')
assert.ok(reglas.validarTransicion('resuelto', 'cerrado', recepcion))
assert.ok(!reglas.validarTransicion('abierto', 'resuelto', recepcion), 'la clinica no marca resuelto')
assert.ok(!reglas.validarTransicion('cerrado', 'abierto', recepcion), 'la clinica no reabre un cerrado')
assert.ok(reglas.validarTransicion('abierto', 'en_progreso', soporte))
assert.ok(reglas.validarTransicion('cerrado', 'abierto', soporte), 'el equipo puede reabrir')
assert.ok(!reglas.validarTransicion('abierto', 'abierto', soporte), 'no es transicion quedarse igual')
assert.ok(!reglas.validarTransicion('abierto', 'inventado', soporte))
assert.ok(!reglas.validarTransicion('abierto', 'cerrado', { tipo: 'desconocido' }))

// ── Estado tras un mensaje ────────────────────────────────────────────────
assert.strictEqual(reglas.estadoTrasMensaje('esperando_usuario', recepcion), 'abierto')
assert.strictEqual(reglas.estadoTrasMensaje('resuelto', recepcion), 'abierto', 'si la clinica insiste, se reabre')
assert.strictEqual(reglas.estadoTrasMensaje('en_progreso', recepcion), 'en_progreso')
assert.strictEqual(reglas.estadoTrasMensaje('abierto', soporte), 'esperando_usuario')
assert.strictEqual(reglas.estadoTrasMensaje('en_progreso', soporte), 'esperando_usuario')

assert.ok(!reglas.puedeRecibirMensajes('cerrado'))
assert.ok(reglas.puedeRecibirMensajes('resuelto'))

// ── Fecha de resolucion ───────────────────────────────────────────────────
const antes = new Date('2026-09-01T10:00:00Z')
const ahora = new Date('2026-09-15T10:00:00Z')
assert.strictEqual(reglas.calcularResueltoAt('resuelto', null, ahora), ahora)
assert.strictEqual(reglas.calcularResueltoAt('cerrado', antes, ahora), antes, 'conserva la primera resolucion')
assert.strictEqual(reglas.calcularResueltoAt('abierto', antes, ahora), null, 'reabrir limpia la fecha')

// ── Actores ───────────────────────────────────────────────────────────────
assert.deepStrictEqual(vetConAdmin.roles, ['veterinario', 'admin'])
assert.strictEqual(soporte.id, null, 'desde el script el equipo no tiene cuenta')
assert.strictEqual(reglas.nombreVisibleActor(soporte), 'Equipo Bourgelat (Sergio)')
assert.strictEqual(reglas.nombreVisibleActor(recepcion), 'Rosa')
assert.throws(() => reglas.construirActorSoporte({ nombre: '   ' }), /firma/)
assert.strictEqual(reglas.construirActorSoporte({ id: 'cuenta-1', nombre: 'Roman' }).id, 'cuenta-1')

// ── Contexto tecnico ──────────────────────────────────────────────────────
assert.deepStrictEqual(
  reglas.sanitizarContexto(JSON.stringify({ ruta: '/agenda', rol: 'admin', token: 'secreto', vacio: '' })),
  { ruta: '/agenda', rol: 'admin' },
  'solo guarda las claves permitidas'
)
assert.strictEqual(reglas.sanitizarContexto({ userAgent: 'x'.repeat(1000) }).userAgent.length, 300)
assert.strictEqual(reglas.sanitizarContexto('no es json'), null)
assert.strictEqual(reglas.sanitizarContexto('[1,2]'), null)
assert.strictEqual(reglas.sanitizarContexto({ otra: 'cosa' }), null)

// ── Escape HTML para correos ──────────────────────────────────────────────
assert.strictEqual(
  escaparHtml('<script>alert("x")</script> & \'y\''),
  '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;'
)
assert.strictEqual(escaparHtml(null), '')

console.log('soporteReglas.test.js: todos los tests pasaron ✔')
