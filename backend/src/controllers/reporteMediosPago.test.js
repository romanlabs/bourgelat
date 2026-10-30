// Tests de GET /reportes/medios-pago. Se ejecutan con
// `node src/controllers/reporteMediosPago.test.js` (integrados en `npm test`).
// No requieren base de datos: se sustituye findAll de cada modelo por un doble
// que registra las opciones y devuelve filas preparadas en el orden en que el
// controlador las pide.

const assert = require('assert')
const AbonoFactura = require('../models/AbonoFactura')
const Factura = require('../models/Factura')
const Gasto = require('../models/Gasto')
const { reporteMediosPago } = require('./reporteController')

const MODELOS = { AbonoFactura, Factura, Gasto }

// Las facturas llegan como instancias (se descifra metodoPago): el abonado
// por factura sale de un atributo calculado que se lee con get().
const factura = (datos, abonado = 0) => ({ ...datos, get: (campo) => (campo === 'abonado' ? String(abonado) : undefined) })

const respuestas = () => ({
  Factura: [
    // periodo
    [
      factura({ id: 'f1', fecha: '2026-10-05', total: '120000', saldoPendiente: '0', metodoPago: 'efectivo' }),
      factura({ id: 'f2', fecha: '2026-10-06', total: '80000', saldoPendiente: '0', metodoPago: 'nequi' }),
      // Crédito: 100.000, ya abonó 40.000 (dentro del periodo) y debe 60.000.
      factura({ id: 'f3', fecha: '2026-10-06', total: '100000', saldoPendiente: '60000', metodoPago: 'credito' }, 40000),
    ],
    // periodo anterior
    [factura({ id: 'f0', fecha: '2026-09-10', total: '50000', saldoPendiente: '0', metodoPago: 'efectivo' })],
  ],
  AbonoFactura: [
    // 8 p. m. del 7 de octubre en Bogotá = 01:00 UTC del 8.
    [{ monto: '40000', metodoPago: 'daviplata', createdAt: new Date('2026-10-08T01:00:00Z') }],
    [],
  ],
  Gasto: [[{ metodoPago: 'efectivo', total: '30000' }, { metodoPago: 'transferencia', total: '10000' }]],
})

const ejecutar = async (query, { analisisCompleto = true } = {}) => {
  const pendientes = respuestas()
  const llamadas = []
  const originales = Object.fromEntries(Object.entries(MODELOS).map(([nombre, modelo]) => [nombre, modelo.findAll]))

  for (const [nombre, modelo] of Object.entries(MODELOS)) {
    modelo.findAll = async (opciones) => {
      llamadas.push({ modelo: nombre, opciones })
      return pendientes[nombre].shift()
    }
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

  try {
    await reporteMediosPago({ usuario: { clinicaId: 'clinica-1' }, query, analisisCompleto }, res)
  } finally {
    for (const [nombre, modelo] of Object.entries(MODELOS)) modelo.findAll = originales[nombre]
  }
  return { payload, status, llamadas }
}

const run = async () => {
  const { payload, status, llamadas } = await ejecutar({ fechaInicio: '2026-10-01', fechaFin: '2026-10-31' })
  assert.strictEqual(status, 200, payload?.error)

  // ── Aislamiento multi-tenant ────────────────────────────────────────────
  for (const { modelo, opciones } of llamadas) {
    assert.strictEqual(opciones.where.clinicaId, 'clinica-1', `${modelo} debe filtrar por el tenant del usuario`)
  }

  // ── Cifras ──────────────────────────────────────────────────────────────
  const medio = (id) => payload.medios.find((m) => m.id === id)
  // 120.000 + 80.000 de contado + 40.000 del abono; el crédito no entra.
  assert.strictEqual(payload.total, 240000)
  assert.strictEqual(
    payload.medios.reduce((suma, m) => suma + m.cobrado, 0),
    payload.total,
    'la suma de los medios es lo cobrado del periodo'
  )
  assert.strictEqual(payload.porCobrarDelPeriodo, 60000)
  assert.strictEqual(medio('daviplata').cobrado, 40000, 'el abono va por su medio')
  assert.strictEqual(medio('daviplata').porDiaSemana[3], 40000, 'el abono cuenta el miércoles 7 (hora Bogotá)')
  assert.strictEqual(payload.serie.find((f) => f.periodo === '2026-10-07').daviplata, 40000)
  assert.strictEqual(payload.serie.length, 31, 'un mes trae la serie diaria completa')
  assert.strictEqual(medio('efectivo').anterior, 50000)
  assert.strictEqual(payload.totalAnterior, 50000)

  // Gastos cruzados por grupo: Nequi y Daviplata ven los de transferencia.
  assert.strictEqual(medio('efectivo').gastosGrupo, 30000)
  assert.strictEqual(medio('nequi').grupoGasto, 'transferencia')
  assert.strictEqual(medio('nequi').gastosGrupo, 10000)
  assert.strictEqual(medio('tarjeta_debito').gastosGrupo, 0)

  // ── Alcance básico: sin gastos ──────────────────────────────────────────
  const basico = await ejecutar({ fechaInicio: '2026-10-01', fechaFin: '2026-10-31' }, { analisisCompleto: false })
  assert.strictEqual(basico.payload.alcance, 'basico')
  assert.ok(!basico.llamadas.some((l) => l.modelo === 'Gasto'), 'no consulta gastos')
  assert.ok(basico.payload.medios.every((m) => !('gastosGrupo' in m)), 'no expone gastos')

  // ── Validación del rango ────────────────────────────────────────────────
  const invertido = await ejecutar({ fechaInicio: '2026-10-31', fechaFin: '2026-10-01' })
  assert.strictEqual(invertido.status, 400)

  console.log('reporteMediosPago: OK')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
