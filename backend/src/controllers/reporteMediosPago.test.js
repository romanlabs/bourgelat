// Tests de GET /reportes/medios-pago. Se ejecutan con
// `node src/controllers/reporteMediosPago.test.js` (integrados en `npm test`).
// No requieren base de datos: se sustituye findAll de cada modelo por un doble
// que registra las opciones y devuelve filas preparadas en el orden en que el
// controlador las pide.

const assert = require('assert')
const AbonoFactura = require('../models/AbonoFactura')
const Factura = require('../models/Factura')
const Gasto = require('../models/Gasto')
const CuentaRecaudo = require('../models/CuentaRecaudo')
const { reporteMediosPago } = require('./reporteController')

const MODELOS = { AbonoFactura, Factura, Gasto, CuentaRecaudo }

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
    [{ monto: '40000', metodoPago: 'daviplata', cuentaRecaudoId: 'c-nequi', createdAt: new Date('2026-10-08T01:00:00Z') }],
    [],
  ],
  Gasto: [[{ metodoPago: 'efectivo', total: '30000' }, { metodoPago: 'transferencia', total: '10000' }]],
  CuentaRecaudo: [[{ id: 'c-nequi', nombre: 'Nequi' }]],
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
  // Nequi y Daviplata (ventas viejas) suman como transferencia.
  assert.strictEqual(medio('transferencia').cobrado, 120000, 'venta por Nequi + abono por Daviplata')
  assert.strictEqual(medio('transferencia').porDiaSemana[3], 40000, 'el abono cuenta el miércoles 7 (hora Bogotá)')
  assert.strictEqual(payload.serie.find((f) => f.periodo === '2026-10-07').transferencia, 40000)
  // Transferencias por cuenta de la clínica: la venta vieja queda sin cuenta.
  assert.deepStrictEqual(medio('transferencia').porCuenta, [
    { cuentaRecaudoId: null, cobrado: 80000, operaciones: 1, nombre: null },
    { cuentaRecaudoId: 'c-nequi', cobrado: 40000, operaciones: 1, nombre: 'Nequi' },
  ])
  assert.ok(!('porCuenta' in medio('efectivo')), 'solo la transferencia se reparte por cuenta')
  assert.strictEqual(payload.serie.length, 31, 'un mes trae la serie diaria completa')
  assert.strictEqual(medio('efectivo').anterior, 50000)
  assert.strictEqual(payload.totalAnterior, 50000)

  // Los gastos usan los mismos medios: se restan directo.
  assert.strictEqual(medio('efectivo').gastos, 30000)
  assert.strictEqual(medio('transferencia').gastos, 10000)
  assert.strictEqual(medio('tarjeta').gastos, 0)
  const consultaGastos = llamadas.find((l) => l.modelo === 'Gasto')
  assert.strictEqual(consultaGastos.opciones.where.origen, 'manual', 'el consumo de insumos no sale por ningún medio')

  // ── Alcance básico: sin gastos ──────────────────────────────────────────
  const basico = await ejecutar({ fechaInicio: '2026-10-01', fechaFin: '2026-10-31' }, { analisisCompleto: false })
  assert.strictEqual(basico.payload.alcance, 'basico')
  assert.ok(!basico.llamadas.some((l) => l.modelo === 'Gasto'), 'no consulta gastos')
  assert.ok(basico.payload.medios.every((m) => !('gastos' in m)), 'no expone gastos')

  // ── Validación del rango ────────────────────────────────────────────────
  const invertido = await ejecutar({ fechaInicio: '2026-10-31', fechaFin: '2026-10-01' })
  assert.strictEqual(invertido.status, 400)

  console.log('reporteMediosPago: OK')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
