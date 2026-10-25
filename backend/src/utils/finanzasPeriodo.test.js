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
  calcularDestacados,
  margenDe,
  ticketPromedioDe,
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

// margenDe y ticketPromedioDe
assert.strictEqual(margenDe(0, -50000), null, 'sin ingresos el margen no se calcula')
assert.strictEqual(margenDe(1000000, 250000), 25)
assert.strictEqual(margenDe(300000, 100000), 33.3)
assert.strictEqual(ticketPromedioDe(0, 0), 0)
assert.strictEqual(ticketPromedioDe(100000, 3), 33333.33)

console.log('finanzasPeriodo: OK')
