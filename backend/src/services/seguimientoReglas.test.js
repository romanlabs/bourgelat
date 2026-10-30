// Tests de los seguimientos que vencen. Se ejecutan con
// `node src/services/seguimientoReglas.test.js` (integrado en `npm test`).
// No requieren base de datos.

const assert = require('assert')
const { pendientesDePaciente, armarSeguimientos } = require('./seguimientoReglas')

const ventana = { desde: '2026-10-01', hasta: '2026-11-06' }

// Solo cuenta la última dosis de cada vacuna: la rabia ya se renovó.
const pendientes = pendientesDePaciente({
  antecedentes: {
    vacunas: [
      { nombre: 'Rabia', fecha: '2025-10-20', proximaDosis: '2026-10-20' },
      { nombre: 'rabia ', fecha: '2026-10-21', proximaDosis: '2027-10-21' },
      { nombre: 'Triple felina', fecha: '2025-11-01', proximaDosis: '2026-11-01' },
    ],
    desparasitaciones: [
      { tipo: 'interna', producto: 'Drontal', fecha: '2026-07-30', proximaFecha: '2026-10-30' },
      { tipo: 'externa', producto: '', fecha: '2026-01-01', proximaFecha: '2026-02-01' },
    ],
  },
  proximaConsulta: '2026-11-03',
}, ventana)
assert.deepStrictEqual(pendientes, [
  { tipo: 'desparasitacion', nombre: 'Drontal', fecha: '2026-10-30' },
  { tipo: 'vacuna', nombre: 'Triple felina', fecha: '2026-11-01' },
  { tipo: 'control', nombre: 'Control', fecha: '2026-11-03' },
])

// Fuera de la ventana (muy vencido o muy lejano) no se avisa.
assert.deepStrictEqual(pendientesDePaciente({
  antecedentes: { vacunas: [{ nombre: 'Rabia', fecha: '2025-01-01', proximaDosis: '2026-01-01' }] },
  proximaConsulta: '2026-12-15',
}, ventana), [])

// Sin datos no falla.
assert.deepStrictEqual(pendientesDePaciente({ antecedentes: null }, ventana), [])

// Quien ya tiene cita agendada no sale; el resto, por lo más antiguo.
const seguimientos = armarSeguimientos({
  pacientes: [
    { mascotaId: 'a', antecedentes: { vacunas: [{ nombre: 'Rabia', fecha: '2025-11-05', proximaDosis: '2026-11-05' }] } },
    { mascotaId: 'b', proximaConsulta: '2026-10-10' },
    { mascotaId: 'c', proximaConsulta: '2026-10-05' },
  ],
  conCita: new Set(['c']),
  ...ventana,
})
assert.deepStrictEqual(seguimientos.map((item) => item.mascotaId), ['b', 'a'])

console.log('seguimientoReglas: OK')
