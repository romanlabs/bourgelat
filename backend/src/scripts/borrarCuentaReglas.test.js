// Tests de la decisión de `npm run cuenta:borrar`. Se ejecutan con
// `node src/scripts/borrarCuentaReglas.test.js` (integrados en `npm test`).

const assert = require('assert')
const { evaluarBorrado } = require('./borrarCuentaReglas')

const admin = { email: 'prueba@clinica.co' }

// Registro recién hecho: solo lo que crea el registro → se puede borrar.
let resultado = evaluarBorrado({
  conteos: { usuarios: 1, suscripciones: 1, aceptaciones_legales: 2, auditoria_logs: 3, mascotas: 0 },
  usuarios: [admin],
  emailsPedidos: ['PRUEBA@clinica.co'],
})
assert.deepStrictEqual(resultado, { puede: true, motivos: [] })

// Con datos reales (pacientes, ventas) → nunca.
resultado = evaluarBorrado({
  conteos: { usuarios: 1, mascotas: 4, facturas: 2 },
  usuarios: [admin],
  emailsPedidos: ['prueba@clinica.co'],
})
assert.strictEqual(resultado.puede, false)
assert.ok(resultado.motivos.includes('tiene 4 registro(s) en mascotas'))
assert.ok(resultado.motivos.includes('tiene 2 registro(s) en facturas'))

// Con un usuario que no se pidió borrar (un empleado) → nunca.
resultado = evaluarBorrado({
  conteos: { usuarios: 2 },
  usuarios: [admin, { email: 'recepcion@clinica.co' }],
  emailsPedidos: ['prueba@clinica.co'],
})
assert.strictEqual(resultado.puede, false)
assert.ok(resultado.motivos[0].includes('recepcion@clinica.co'))

console.log('borrarCuentaReglas.test.js: todos los tests pasaron ✔')
