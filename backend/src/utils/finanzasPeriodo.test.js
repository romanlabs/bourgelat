// Tests de las reglas del análisis financiero por periodo. Se ejecutan con
// `node src/utils/finanzasPeriodo.test.js` (integrados en `npm test`). No
// requieren base de datos.

const assert = require('assert')
const {
  sumarMesesISO,
  validarRango,
  granularidadDe,
  periodoAnterior,
  clavesDelPeriodo,
  armarSerie,
  limitesBogota,
  esUnSoloMes,
  alcanceAnalisis,
  recortarABasico,
  calcularDestacados,
  margenDe,
  ticketPromedioDe,
  agregarPorMedio,
  fechaBogota,
} = require('./finanzasPeriodo')

// sumarMesesISO: conserva el día y se queda en el último si el mes es corto.
assert.strictEqual(sumarMesesISO('2026-03-31', -1), '2026-02-28')
assert.strictEqual(sumarMesesISO('2024-03-31', -1), '2024-02-29', 'año bisiesto')
assert.strictEqual(sumarMesesISO('2026-01-15', -12), '2025-01-15')
assert.strictEqual(sumarMesesISO('2026-11-30', 2), '2027-01-30')

// validarRango
assert.strictEqual(validarRango('2026-01-01', '2026-12-31'), null)
assert.strictEqual(validarRango('2026-05-01', '2026-05-01'), null, 'un solo día sirve')
assert.match(validarRango('2026-05-02', '2026-05-01'), /posterior/)
assert.strictEqual(validarRango('2025-01-01', '2027-01-01'), null, 'justo 24 meses')
assert.match(validarRango('2025-01-01', '2027-01-02'), /24 meses/)

// granularidadDe: desde 60 días la serie es mensual.
assert.strictEqual(granularidadDe('2026-01-01', '2026-12-31'), 'mes')
assert.strictEqual(granularidadDe('2026-01-01', '2026-03-01'), 'mes', '60 días')
assert.strictEqual(granularidadDe('2026-01-01', '2026-02-28'), 'dia', '59 días')
assert.strictEqual(granularidadDe('2026-10-01', '2026-10-31'), 'dia')

// periodoAnterior
assert.deepStrictEqual(
  periodoAnterior('2025-01-01', '2025-12-31', '2026-10-23'),
  { fechaInicio: '2024-01-01', fechaFin: '2024-12-31' },
  'un año cerrado se compara con el año anterior completo'
)
assert.deepStrictEqual(
  periodoAnterior('2026-01-01', '2026-12-31', '2026-10-23'),
  { fechaInicio: '2025-01-01', fechaFin: '2025-10-23' },
  'el año en curso se compara hasta el mismo día del año anterior'
)
assert.deepStrictEqual(
  periodoAnterior('2026-07-01', '2026-09-30', '2026-10-23'),
  { fechaInicio: '2026-04-01', fechaFin: '2026-06-30' },
  'un trimestre se compara con el trimestre anterior'
)
assert.deepStrictEqual(
  periodoAnterior('2025-11-01', '2026-10-31', '2026-10-23'),
  { fechaInicio: '2024-11-01', fechaFin: '2025-10-23' },
  'últimos 12 meses, recortado a hoy'
)
assert.deepStrictEqual(
  periodoAnterior('2026-03-10', '2026-03-19', '2026-10-23'),
  { fechaInicio: '2026-02-28', fechaFin: '2026-03-09' },
  'un rango libre se compara con los mismos días justo antes'
)
assert.deepStrictEqual(
  periodoAnterior('2027-01-01', '2027-12-31', '2026-10-23'),
  { fechaInicio: '2026-01-01', fechaFin: '2026-12-31' },
  'un periodo que empieza en el futuro no se recorta'
)

// clavesDelPeriodo
assert.deepStrictEqual(clavesDelPeriodo('2026-11-15', '2027-02-03', 'mes'), [
  '2026-11',
  '2026-12',
  '2027-01',
  '2027-02',
])
assert.strictEqual(clavesDelPeriodo('2026-01-01', '2026-12-31', 'mes').length, 12)
assert.deepStrictEqual(clavesDelPeriodo('2026-02-27', '2026-03-02', 'dia'), [
  '2026-02-27',
  '2026-02-28',
  '2026-03-01',
  '2026-03-02',
])

// armarSerie: rellena con 0 los tramos sin movimiento y convierte los textos
// numéricos que devuelve Postgres.
// Ingreso = lo cobrado de contado en el tramo + los abonos recibidos en él
// (aunque la venta a crédito sea de otro tramo). `vendido` es lo facturado.
const serie = armarSerie(
  ['2026-01', '2026-02', '2026-03', '2026-04'],
  [
    { periodo: '2026-01', cobrado: '1000000.00', vendido: '1200000', ventas: '20' },
    { periodo: '2026-03', cobrado: '500000.50', vendido: '500000.50', ventas: '8' },
  ],
  [
    { periodo: '2026-01', gastos: '300000' },
    { periodo: '2026-02', gastos: '120000' },
    { periodo: '2026-03', gastos: '700000' },
  ],
  [{ periodo: '2026-02', cobrado: '150000' }]
)
assert.deepStrictEqual(serie, [
  { periodo: '2026-01', ingresos: 1000000, vendido: 1200000, gastos: 300000, ganancia: 700000, ventas: 20 },
  { periodo: '2026-02', ingresos: 150000, vendido: 0, gastos: 120000, ganancia: 30000, ventas: 0 },
  { periodo: '2026-03', ingresos: 500000.5, vendido: 500000.5, gastos: 700000, ganancia: -199999.5, ventas: 8 },
  { periodo: '2026-04', ingresos: 0, vendido: 0, gastos: 0, ganancia: 0, ventas: 0 },
])

// limitesBogota: los abonos se fechan con createdAt (timestamptz); el día
// local va de medianoche a medianoche en Colombia (UTC−5, sin horario de verano).
assert.deepStrictEqual(limitesBogota('2026-10-01', '2026-10-31'), {
  desde: '2026-10-01T00:00:00-05:00',
  hasta: '2026-11-01T00:00:00-05:00',
})

// calcularDestacados: el mes sin movimiento (abril) no es «el peor».
assert.deepStrictEqual(calcularDestacados(serie), {
  mejor: { periodo: '2026-01', valor: 700000 },
  peor: { periodo: '2026-03', valor: -199999.5 },
  masGasto: { periodo: '2026-03', valor: 700000 },
})
assert.deepStrictEqual(
  calcularDestacados([{ periodo: '2026-01', ingresos: 0, vendido: 0, gastos: 0, ganancia: 0, ventas: 0 }]),
  { mejor: null, peor: null, masGasto: null },
  'sin movimiento no hay destacados'
)
assert.deepStrictEqual(
  calcularDestacados([{ periodo: '2026-01', ingresos: 10, gastos: 0, ganancia: 10, ventas: 1 }]),
  { mejor: { periodo: '2026-01', valor: 10 }, peor: null, masGasto: null },
  'con un solo tramo no se repite como peor, y sin gastos no hay mes de más gasto'
)

// esUnSoloMes
assert.strictEqual(esUnSoloMes('2026-10-01', '2026-10-31'), true)
assert.strictEqual(esUnSoloMes('2026-10-05', '2026-10-05'), true)
assert.strictEqual(esUnSoloMes('2026-09-25', '2026-10-24'), false, 'un mes corrido que cruza meses es periodo largo')

// alcanceAnalisis: admin + plan Clínica = completo; el resto, solo un mes.
const mes = { fechaInicio: '2026-10-01', fechaFin: '2026-10-31' }
const anio = { fechaInicio: '2026-01-01', fechaFin: '2026-12-31' }
assert.deepStrictEqual(alcanceAnalisis({ roles: ['admin'], tieneReportesCompletos: true, ...anio }), { permitido: true, completo: true })
assert.deepStrictEqual(alcanceAnalisis({ roles: ['admin'], tieneReportesCompletos: false, ...mes }), { permitido: true, completo: false })
assert.deepStrictEqual(alcanceAnalisis({ roles: ['facturador'], tieneReportesCompletos: true, ...mes }), { permitido: true, completo: false })
assert.strictEqual(alcanceAnalisis({ roles: ['admin'], tieneReportesCompletos: false, ...anio }).permitido, false)
assert.match(alcanceAnalisis({ roles: ['admin'], tieneReportesCompletos: false, ...anio }).message, /plan Clínica/)
assert.match(alcanceAnalisis({ roles: ['facturador'], tieneReportesCompletos: true, ...anio }).message, /administración/)
assert.strictEqual(
  alcanceAnalisis({ roles: ['facturador', 'admin'], tieneReportesCompletos: true, ...anio }).completo,
  true,
  'cuenta el rol adicional'
)

// recortarABasico: sin gastos, ganancia, destacados ni rankings.
const basico = recortarABasico({
  periodo: { fechaInicio: '2026-10-01', fechaFin: '2026-10-31', granularidad: 'dia', anterior: {} },
  resumen: {
    ingresos: 10, vendido: 12, abonos: 1, gastos: 5, ganancia: 5, margen: 50, ventas: 2,
    ticketPromedio: 6, porCobrar: 2, creditosPendientes: 1, creditoMasAntiguo: '2026-10-02',
  },
  anterior: { ingresos: 8, vendido: 8, gastos: 1, ganancia: 7, ventas: 1, ticketPromedio: 8 },
  serie: [{ periodo: '2026-10-01', ingresos: 10, vendido: 12, gastos: 5, ganancia: 5, ventas: 2 }],
  destacados: { mejor: null },
  gastosPorCategoria: { nomina: 5 },
  topServicios: [],
})
assert.strictEqual(basico.alcance, 'basico')
assert.deepStrictEqual(Object.keys(basico).sort(), ['alcance', 'anterior', 'periodo', 'resumen', 'serie'])
for (const bloque of [basico.resumen, basico.anterior, basico.serie[0]]) {
  assert.ok(!('gastos' in bloque) && !('ganancia' in bloque) && !('margen' in bloque), 'no expone la rentabilidad')
}
assert.deepStrictEqual(basico.serie[0], { periodo: '2026-10-01', ingresos: 10, vendido: 12, ventas: 2 })

// margenDe y ticketPromedioDe
assert.strictEqual(margenDe(0, -50000), null, 'sin ingresos el margen no se calcula')
assert.strictEqual(margenDe(1000000, 250000), 25)
assert.strictEqual(margenDe(300000, 100000), 33.3)
assert.strictEqual(ticketPromedioDe(0, 0), 0)
assert.strictEqual(ticketPromedioDe(100000, 3), 33333.33)

// fechaBogota: un abono a las 9 p. m. de Bogotá ya es el día siguiente en UTC.
assert.strictEqual(fechaBogota('2026-10-14T02:00:00Z'), '2026-10-13')
assert.strictEqual(fechaBogota('2026-10-14T05:00:00Z'), '2026-10-14')

// agregarPorMedio: contado por el medio de la venta, abonos por el suyo.
const porMedio = agregarPorMedio({
  facturas: [
    { id: 'f1', fecha: '2026-10-05', total: '100000', saldoPendiente: '0', metodoPago: 'efectivo' },
    // Venta vieja con Nequi: cuenta como transferencia.
    { id: 'f2', fecha: '2026-10-05', total: '50000', saldoPendiente: '0', metodoPago: 'nequi' },
    // Crédito de 80.000 con un abono de 30.000: no trae plata en la venta.
    { id: 'f3', fecha: '2026-10-06', total: '80000', saldoPendiente: '50000', metodoPago: 'credito' },
    // Método que no conocemos (o nulo): cae en «otro».
    { id: 'f4', fecha: '2026-11-02', total: '20000', saldoPendiente: '0', metodoPago: null },
  ],
  abonosPorFactura: { f3: '30000' },
  abonos: [{ fecha: '2026-10-07', monto: '30000', metodoPago: 'transferencia' }],
  claves: ['2026-10', '2026-11'],
  granularidad: 'mes',
})
const medio = (id) => porMedio.medios.find((m) => m.id === id)
assert.strictEqual(porMedio.total, 200000, 'contado + abonos, sin el saldo del crédito')
assert.ok(!porMedio.medios.some((m) => m.id === 'credito'), 'el crédito no es un medio')
assert.deepStrictEqual(
  { cobrado: medio('transferencia').cobrado, deAbonos: medio('transferencia').deAbonos, abonos: medio('transferencia').abonos, ventas: medio('transferencia').ventas },
  { cobrado: 80000, deAbonos: 30000, abonos: 1, ventas: 1 },
  'el abono entra por su propio medio y Nequi suma como transferencia'
)
assert.deepStrictEqual(porMedio.medios.map((m) => m.id), ['efectivo', 'transferencia', 'tarjeta', 'otro'])
assert.strictEqual(medio('otro').cobrado, 20000)
assert.strictEqual(medio('efectivo').participacion, 50)
assert.strictEqual(medio('efectivo').ticketPromedio, 100000)
assert.strictEqual(medio('efectivo').porDiaSemana[1], 100000, '5 de octubre de 2026 es lunes')
assert.deepStrictEqual(porMedio.serie.map((f) => [f.periodo, f.efectivo, f.otro]), [['2026-10', 100000, 0], ['2026-11', 0, 20000]])
assert.strictEqual(
  porMedio.medios.reduce((suma, m) => suma + m.cobrado, 0),
  porMedio.total,
  'la suma de los medios es el total cobrado'
)
// Sin claves no hay serie (lo usa el periodo anterior).
assert.deepStrictEqual(agregarPorMedio({ facturas: [] }).serie, [])
assert.strictEqual(agregarPorMedio({ facturas: [] }).medios[0].participacion, 0)

console.log('finanzasPeriodo: OK')
