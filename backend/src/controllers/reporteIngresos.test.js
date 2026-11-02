// Tests de GET /reportes/ingresos. Se ejecutan con
// `node src/controllers/reporteIngresos.test.js` (integrados en `npm test`).
// Sin base de datos: findAll se sustituye por un doble con filas preparadas.

const assert = require('assert')
const AbonoFactura = require('../models/AbonoFactura')
const Factura = require('../models/Factura')
const { reporteIngresos } = require('./reporteController')

const factura = (datos, abonado = 0) => ({ ...datos, get: (campo) => (campo === 'abonado' ? String(abonado) : undefined) })

const ejecutar = async (query) => {
  const originales = { factura: Factura.findAll, abono: AbonoFactura.findAll }
  const llamadas = []
  Factura.findAll = async (opciones) => {
    llamadas.push(opciones)
    return [
      factura({ id: 'f1', fecha: '2026-10-05', total: '90000', saldoPendiente: '0', metodoPago: 'efectivo' }),
      factura({ id: 'f2', fecha: '2026-10-05', total: '50000', saldoPendiente: '0', metodoPago: 'tarjeta_debito' }),
      // Fiada: 100.000, abonó 30.000 y debe 70.000. No trajo plata al venderse.
      factura({ id: 'f3', fecha: '2026-10-05', total: '100000', saldoPendiente: '70000', metodoPago: 'credito' }, 30000),
    ]
  }
  AbonoFactura.findAll = async (opciones) => {
    llamadas.push(opciones)
    return [
      { monto: '30000', metodoPago: 'efectivo', cuentaRecaudoId: null, createdAt: new Date('2026-10-05T15:00:00Z') },
      // Abono de una venta de otro periodo: la plata entró en este.
      { monto: '20000', metodoPago: 'transferencia', cuentaRecaudoId: null, createdAt: new Date('2026-10-05T16:00:00Z') },
    ]
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
    await reporteIngresos({ usuario: { clinicaId: 'clinica-1' }, query }, res)
  } finally {
    Factura.findAll = originales.factura
    AbonoFactura.findAll = originales.abono
  }
  return { payload, status, llamadas }
}

const run = async () => {
  const { payload, status, llamadas } = await ejecutar({ fechaInicio: '2026-10-01', fechaFin: '2026-10-31' })
  assert.strictEqual(status, 200, payload?.error)

  for (const opciones of llamadas) {
    assert.strictEqual(opciones.where.clinicaId, 'clinica-1', 'debe filtrar por el tenant del usuario')
  }

  // Ingresos es la plata que entró: contado 140.000 + abonos 50.000. El fiado no suma.
  assert.strictEqual(payload.totalIngresos, 190000)
  assert.strictEqual(payload.totalVendido, 240000)
  assert.strictEqual(payload.totalVentas, 3)
  assert.deepStrictEqual(payload.ingresosPorMetodoPago, { efectivo: 120000, transferencia: 20000, tarjeta: 50000 })

  const rangoLargo = await ejecutar({ fechaInicio: '2020-01-01', fechaFin: '2026-10-31' })
  assert.strictEqual(rangoLargo.status, 400, 'un rango de más de 24 meses se rechaza')

  console.log('reporteIngresos.test.js: todos los tests pasaron ✔')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
