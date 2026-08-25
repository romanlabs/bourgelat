// Tests de GET /reportes/agenda. Se ejecutan con
// `node src/controllers/reporteAgenda.test.js` (integrados en `npm test`).
// No requieren base de datos: se sustituye Cita.findAll por un doble que
// registra las opciones recibidas y devuelve filas preparadas en el mismo orden
// en que el controlador lanza las agregaciones.

const assert = require('assert')
const Cita = require('../models/Cita')
const { reporteAgenda } = require('./reporteController')

const findAllOriginal = Cita.findAll

// Mismo orden que el Promise.all del controlador.
const respuestas = () => [
  [
    { estado: 'programada', total: '40' },
    { estado: 'completada', total: '70' },
    { estado: 'cancelada', total: '10' },
    { estado: 'no_asistio', total: '8' },
  ],
  [
    { tipoCita: 'consulta_general', total: '90' },
    { tipoCita: 'vacunacion', total: '38' },
  ],
  [
    { origen: 'programada', total: '104' },
    { origen: 'walk_in', total: '24' },
  ],
  [{ fecha: '2026-08-01', total: '6', completadas: '5', noAsistio: '1' }],
  [{ hora: '8', total: '12' }],
  [{ dia: '1', total: '30' }],
  [
    {
      veterinarioId: 'vet-1',
      total: '42',
      completadas: '38',
      noAsistio: '2',
      veterinario: { nombre: 'Dra. Restrepo' },
    },
    { veterinarioId: null, total: '3', completadas: '1', noAsistio: '0', veterinario: { nombre: null } },
  ],
  [{ motivo: 'el propietario reprogramó', total: '4' }],
  [{ esperaMediaMin: '13.7', duracionMediaMin: '31.4' }],
]

const ejecutar = async (query = { fechaInicio: '2026-08-01', fechaFin: '2026-08-31' }) => {
  const pendientes = respuestas()
  const opcionesRecibidas = []

  Cita.findAll = async (opciones) => {
    opcionesRecibidas.push(opciones)
    return pendientes.shift()
  }

  let payload
  let status = 200
  const res = {
    status(codigo) {
      status = codigo
      return this
    },
    json(cuerpo) {
      payload = cuerpo
      return this
    },
  }

  await reporteAgenda({ usuario: { clinicaId: 'clinica-1' }, query }, res)

  return { payload, status, opcionesRecibidas }
}

const run = async () => {
  // ── Aislamiento multi-tenant ────────────────────────────────────────────
  const { payload, opcionesRecibidas } = await ejecutar()

  assert.ok(opcionesRecibidas.length > 0, 'el controlador debe consultar la tabla de citas')
  opcionesRecibidas.forEach((opciones, indice) => {
    assert.strictEqual(
      opciones.where.clinicaId,
      'clinica-1',
      `la agregación #${indice} debe filtrar por el tenant del usuario`
    )
    assert.ok(opciones.where.fecha, `la agregación #${indice} debe acotar el rango de fechas`)
  })

  // ── Contrato de la respuesta ────────────────────────────────────────────
  const clavesEsperadas = [
    'periodo',
    'resumen',
    'serieDiaria',
    'citasPorEstado',
    'citasPorTipo',
    'citasPorFranja',
    'citasPorDiaSemana',
    'citasPorOrigen',
    'porVeterinario',
    'topMotivosCancelacion',
  ]
  clavesEsperadas.forEach((clave) => {
    assert.ok(clave in payload, `la respuesta debe incluir "${clave}"`)
  })

  assert.strictEqual(payload.periodo.dias, 31, 'el periodo debe incluir ambos extremos')
  assert.strictEqual(payload.resumen.totalCitas, 128)
  assert.strictEqual(payload.resumen.completadas, 70)
  assert.strictEqual(payload.resumen.noAsistio, 8)

  // Regresión: la tasa anterior dividía entre el total, incluidas las citas aún
  // programadas, y hundía el indicador en periodos con días futuros. Ahora se
  // mide solo sobre lo resuelto: 70 / (70 + 10 + 8) = 79.5%.
  assert.strictEqual(payload.resumen.tasaAsistencia, 79.5)
  assert.strictEqual(payload.resumen.tasaNoShow, 9.1)
  assert.strictEqual(typeof payload.resumen.tasaAsistencia, 'number', 'la tasa es número, no string con %')

  assert.strictEqual(payload.resumen.walkIn, 24)
  assert.strictEqual(payload.resumen.walkInPct, 18.8)
  assert.strictEqual(payload.resumen.esperaMediaMin, 14, 'la espera media se redondea a minutos enteros')
  assert.strictEqual(payload.resumen.duracionMediaMin, 31)

  // Los agregados llegan de Postgres como strings; el contrato los expone numéricos.
  assert.deepStrictEqual(payload.citasPorEstado, {
    programada: 40,
    completada: 70,
    cancelada: 10,
    no_asistio: 8,
  })
  assert.deepStrictEqual(payload.citasPorFranja, { 8: 12 })
  assert.deepStrictEqual(payload.serieDiaria, [
    { fecha: '2026-08-01', total: 6, completadas: 5, noAsistio: 1 },
  ])
  assert.strictEqual(payload.porVeterinario[0].nombre, 'Dra. Restrepo')
  assert.strictEqual(
    payload.porVeterinario[1].nombre,
    'Sin profesional',
    'una cita sin veterinario asociado no debe romper la lista'
  )

  // ── Validación de parámetros ────────────────────────────────────────────
  const sinFechas = await ejecutar({ fechaInicio: '2026-08-01' })
  assert.strictEqual(sinFechas.status, 400, 'faltando fechaFin debe responder 400')

  Cita.findAll = findAllOriginal
  console.log('reporteAgenda.test.js OK')
}

run().catch((error) => {
  Cita.findAll = findAllOriginal
  console.error(error)
  process.exit(1)
})
