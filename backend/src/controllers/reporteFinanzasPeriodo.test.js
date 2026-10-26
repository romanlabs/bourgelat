// Tests de GET /reportes/finanzas-periodo. Se ejecutan con
// `node src/controllers/reporteFinanzasPeriodo.test.js` (integrados en `npm test`).
// No requieren base de datos: se sustituye findAll de cada modelo por un doble
// que registra las opciones y devuelve filas preparadas en el orden en que el
// controlador lanza sus agregaciones sobre ese modelo.

const assert = require('assert')
const AbonoFactura = require('../models/AbonoFactura')
const Factura = require('../models/Factura')
const FacturaItem = require('../models/FacturaItem')
const Gasto = require('../models/Gasto')
const Producto = require('../models/Producto')
const ServicioClinico = require('../models/ServicioClinico')
const { reporteFinanzasPeriodo } = require('./reporteController')

const MODELOS = { AbonoFactura, Factura, FacturaItem, Gasto, Producto, ServicioClinico }
const originales = Object.fromEntries(
  Object.entries(MODELOS).map(([nombre, modelo]) => [nombre, modelo.findAll])
)

// Mismo orden, por modelo, que el Promise.all del controlador.
const respuestas = () => ({
  Factura: [
    // serie por mes: junio vendió 300.000 a crédito que aún no se cobran
    [
      { periodo: '2025-01', cobrado: '2000000', vendido: '2000000', ventas: '40' },
      { periodo: '2025-06', cobrado: '700000', vendido: '1000000', ventas: '10' },
    ],
    // cartera por cobrar (total, sin filtro de fecha)
    [{ porCobrar: '150000', creditos: '3', masAntiguo: '2025-03-04' }],
    // periodo anterior
    [{ cobrado: '2300000', vendido: '2400000', ventas: '60' }],
  ],
  AbonoFactura: [
    // abonos del periodo (de créditos vendidos antes o durante)
    [{ periodo: '2025-06', cobrado: '300000' }],
    // abonos del periodo anterior
    [{ cobrado: '100000' }],
  ],
  Gasto: [
    [
      { periodo: '2025-01', gastos: '500000' },
      { periodo: '2025-06', gastos: '1300000' },
    ],
    [
      { categoria: 'nomina', total: '1200000' },
      { categoria: 'insumos', total: '600000' },
    ],
    [{ gastos: '1000000' }],
  ],
  FacturaItem: [
    [
      { tipo: 'servicio', total: '2100000' },
      { tipo: 'producto', total: '900000' },
    ],
    [{ id: 'serv-1', cantidad: '30', total: '1500000' }],
    [
      { id: 'prod-1', cantidad: '12.00', total: '600000' },
      { id: 'prod-borrado', cantidad: '2', total: '40000' },
    ],
    // líneas sin catálogo
    [{ tipo: 'servicio', total: '600000' }],
  ],
  ServicioClinico: [[{ id: 'serv-1', nombre: 'Consulta general' }]],
  Producto: [[{ id: 'prod-1', nombre: 'Antipulgas' }]],
})

const ejecutar = async (query, { analisisCompleto = true } = {}) => {
  const pendientes = respuestas()
  const llamadas = []

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

  await reporteFinanzasPeriodo({ usuario: { clinicaId: 'clinica-1' }, query, analisisCompleto }, res)
  return { payload, status, llamadas }
}

const run = async () => {
  const { payload, status, llamadas } = await ejecutar({
    fechaInicio: '2025-01-01',
    fechaFin: '2025-12-31',
  })
  assert.strictEqual(status, 200, payload?.error)

  // ── Aislamiento multi-tenant ────────────────────────────────────────────
  // FacturaItem no tiene clinicaId: el tenant entra por el include de Factura.
  for (const { modelo, opciones } of llamadas) {
    const where = modelo === 'FacturaItem' ? opciones.include[0].where : opciones.where
    assert.strictEqual(where.clinicaId, 'clinica-1', `${modelo} debe filtrar por el tenant del usuario`)
  }

  // ── Contrato de la respuesta ────────────────────────────────────────────
  assert.deepStrictEqual(payload.periodo, {
    fechaInicio: '2025-01-01',
    fechaFin: '2025-12-31',
    granularidad: 'mes',
    anterior: { fechaInicio: '2024-01-01', fechaFin: '2024-12-31' },
  })

  assert.strictEqual(payload.serie.length, 12, 'el año trae los 12 meses aunque no tengan movimiento')
  assert.deepStrictEqual(payload.serie[1], {
    periodo: '2025-02',
    ingresos: 0,
    vendido: 0,
    gastos: 0,
    ganancia: 0,
    ventas: 0,
  })
  assert.deepStrictEqual(payload.serie[5], {
    periodo: '2025-06',
    ingresos: 1000000,
    vendido: 1000000,
    gastos: 1300000,
    ganancia: -300000,
    ventas: 10,
  }, 'junio: 700.000 de contado + 300.000 de abonos')

  // Ingresos = cobrado (contado + abonos); el ticket se calcula sobre lo vendido.
  assert.deepStrictEqual(payload.resumen, {
    ingresos: 3000000,
    vendido: 3000000,
    abonos: 300000,
    gastos: 1800000,
    ganancia: 1200000,
    margen: 40,
    ventas: 50,
    ticketPromedio: 60000,
    porCobrar: 150000,
    creditosPendientes: 3,
    creditoMasAntiguo: '2025-03-04',
  })
  assert.deepStrictEqual(payload.anterior, {
    ingresos: 2400000,
    vendido: 2400000,
    gastos: 1000000,
    ganancia: 1400000,
    ventas: 60,
    ticketPromedio: 40000,
  })

  // La cartera es toda la deuda vigente, no solo la de ventas del periodo.
  const cartera = llamadas.filter((llamada) => llamada.modelo === 'Factura')[1]
  assert.strictEqual(cartera.opciones.where.fecha, undefined, 'la cartera no filtra por fecha')

  // Los abonos se filtran por el día local de Colombia sobre createdAt.
  const abonos = llamadas.find((llamada) => llamada.modelo === 'AbonoFactura')
  assert.ok(abonos.opciones.where.createdAt, 'los abonos se filtran por createdAt')

  assert.deepStrictEqual(payload.destacados, {
    mejor: { periodo: '2025-01', valor: 1500000 },
    peor: { periodo: '2025-06', valor: -300000 },
    masGasto: { periodo: '2025-06', valor: 1300000 },
  })

  assert.deepStrictEqual(payload.gastosPorCategoria, { nomina: 1200000, insumos: 600000 })
  assert.deepStrictEqual(payload.ingresosPorTipo, { servicio: 2100000, producto: 900000 })
  assert.deepStrictEqual(payload.topServicios, [
    { id: 'serv-1', nombre: 'Consulta general', cantidad: 30, total: 1500000 },
  ])
  assert.deepStrictEqual(payload.topProductos, [
    { id: 'prod-1', nombre: 'Antipulgas', cantidad: 12, total: 600000 },
    { id: 'prod-borrado', nombre: 'Sin nombre', cantidad: 2, total: 40000 },
  ])

  // Las líneas escritas a mano se informan aparte; un tipo sin ellas queda en 0.
  assert.deepStrictEqual(payload.sinCatalogo, { servicio: 600000, producto: 0 })

  // Los nombres se buscan solo entre los ids del top y dentro del tenant.
  const busquedaProductos = llamadas.find((llamada) => llamada.modelo === 'Producto')
  assert.deepStrictEqual(busquedaProductos.opciones.where, {
    clinicaId: 'clinica-1',
    id: ['prod-1', 'prod-borrado'],
  })

  // ── Validación de parámetros ────────────────────────────────────────────
  const invertido = await ejecutar({ fechaInicio: '2025-06-01', fechaFin: '2025-05-01' })
  assert.strictEqual(invertido.status, 400)
  assert.strictEqual(invertido.llamadas.length, 0, 'un rango inválido no consulta la base')

  const muyLargo = await ejecutar({ fechaInicio: '2020-01-01', fechaFin: '2025-12-31' })
  assert.strictEqual(muyLargo.status, 400)
  assert.match(muyLargo.payload.message, /24 meses/)

  // Sin análisis completo (Esencial o facturador) no viaja la rentabilidad.
  const basico = await ejecutar(
    { fechaInicio: '2025-01-01', fechaFin: '2025-01-31' },
    { analisisCompleto: false }
  )
  assert.strictEqual(basico.payload.alcance, 'basico')
  assert.strictEqual(basico.payload.resumen.gastos, undefined)
  assert.strictEqual(basico.payload.gastosPorCategoria, undefined)
  assert.strictEqual(basico.payload.topProductos, undefined)
  assert.strictEqual(payload.alcance, 'completo')

  // Un rango corto se agrupa por día.
  const corto = await ejecutar({ fechaInicio: '2025-01-01', fechaFin: '2025-01-31' })
  assert.strictEqual(corto.payload.periodo.granularidad, 'dia')
  assert.strictEqual(corto.payload.serie.length, 31)

  console.log('reporteFinanzasPeriodo: OK')
}

run()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    for (const [nombre, modelo] of Object.entries(MODELOS)) modelo.findAll = originales[nombre]
  })
