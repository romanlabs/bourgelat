import { describe, expect, it } from 'vitest'
import {
  agruparMetodosPago,
  curvaAcumulada,
  diasDesde,
  estadoMes,
  mesAnterior,
  hastaHoy,
  leerSerieDiaria,
  nombreDia,
  nombreMes,
  rangoDelMes,
} from './resumenFinanzas'

describe('rangoDelMes', () => {
  it('va del 1 al último día, también en febrero bisiesto', () => {
    expect(rangoDelMes('2026-10')).toEqual({ fechaInicio: '2026-10-01', fechaFin: '2026-10-31' })
    expect(rangoDelMes('2028-02')).toEqual({ fechaInicio: '2028-02-01', fechaFin: '2028-02-29' })
  })
})

describe('nombres', () => {
  it('nombra el mes y el día de la semana', () => {
    expect(nombreMes('2026-10')).toBe('octubre')
    expect(nombreDia('2026-10-13')).toBe('martes 13')
  })
})

describe('leerSerieDiaria', () => {
  const serie = [
    { periodo: '2026-10-01', ingresos: 800000, ventas: 10 },
    { periodo: '2026-10-02', ingresos: 0, ventas: 0 },
    { periodo: '2026-10-03', ingresos: 1400000, ventas: 12 },
    { periodo: '2026-10-04', ingresos: 0, ventas: 1 },
  ]

  it('encuentra el mejor día y promedia solo los días con ventas', () => {
    const lectura = leerSerieDiaria(serie)
    expect(lectura.mejor.periodo).toBe('2026-10-03')
    // un día con una venta a crédito sin cobrar cuenta como día abierto
    expect(lectura.diasConVentas).toBe(3)
    expect(lectura.promedioDiaConVentas).toBe(733333)
  })

  it('sin movimiento no hay mejor día', () => {
    expect(leerSerieDiaria([{ periodo: '2026-10-01', ingresos: 0, ventas: 0 }])).toEqual({
      mejor: null,
      diasConVentas: 0,
      promedioDiaConVentas: 0,
    })
  })
})

describe('agruparMetodosPago', () => {
  it('junta billeteras con transferencia y tarjetas en una franja', () => {
    const grupos = agruparMetodosPago({
      transferencia: 300, nequi: 100, efectivo: 400, tarjeta_debito: 100, tarjeta_credito: 50, credito: 50,
    })
    expect(grupos.map((g) => [g.id, g.valor, g.porcentaje])).toEqual([
      ['transferencia', 400, 40],
      ['efectivo', 400, 40],
      ['tarjeta', 150, 15],
      ['credito', 50, 5],
    ])
  })

  it('un método desconocido suma en Otro y el color no depende del puesto', () => {
    const solo = agruparMetodosPago({ efectivo: 10, bono: 5 })
    const completo = agruparMetodosPago({ transferencia: 99, efectivo: 10 })
    expect(solo.find((g) => g.id === 'otro').valor).toBe(5)
    expect(solo.find((g) => g.id === 'efectivo').color).toBe(completo.find((g) => g.id === 'efectivo').color)
  })
})

describe('hastaHoy', () => {
  it('corta los días y los meses que no han pasado', () => {
    const dias = [{ periodo: '2026-10-24' }, { periodo: '2026-10-25' }, { periodo: '2026-10-26' }]
    expect(hastaHoy(dias, '2026-10-25').map((f) => f.periodo)).toEqual(['2026-10-24', '2026-10-25'])
    const meses = [{ periodo: '2026-09' }, { periodo: '2026-10' }, { periodo: '2026-11' }]
    expect(hastaHoy(meses, '2026-10-25').map((f) => f.periodo)).toEqual(['2026-09', '2026-10'])
  })
})

describe('curvaAcumulada', () => {
  const mes = (n, valores) =>
    Array.from({ length: n }, (_, i) => ({ periodo: `2026-10-${String(i + 1).padStart(2, '0')}`, ingresos: valores[i] || 0 }))

  it('acumula, compara con el mes anterior y proyecta al ritmo del mes en curso', () => {
    const octubre = mes(4, [100, 0, 200, 50])
    const septiembre = mes(3, [50, 50, 50])
    const curva = curvaAcumulada(octubre, septiembre, '2026-10-02')
    expect(curva.filas.map((f) => f.ingresos)).toEqual([100, 100, null, null])
    // el mes anterior era más corto: sin valor el día 4
    expect(curva.filas.map((f) => f.anterior)).toEqual([50, 100, 150, null])
    // ritmo 50/día desde el día 2 (100 llevados)
    expect(curva.filas.map((f) => f.proyeccion)).toEqual([null, 100, 150, 200])
    expect(curva.cierre).toBe(200)
    expect(curva.anteriorALaFecha).toBe(100)
  })

  it('un mes ya cerrado no proyecta', () => {
    const curva = curvaAcumulada(mes(3, [10, 20, 30]), [], '2026-11-05')
    expect(curva.filas.map((f) => f.ingresos)).toEqual([10, 30, 60])
    expect(curva.cierre).toBe(null)
    expect(curva.filas.every((f) => f.proyeccion === null)).toBe(true)
  })
})

describe('mesAnterior', () => {
  it('retrocede también entre años', () => {
    expect(mesAnterior('2026-10')).toBe('2026-09')
    expect(mesAnterior('2026-01')).toBe('2025-12')
  })
})

describe('estadoMes', () => {
  it('distingue el futuro, el mes en curso y los meses sin movimiento', () => {
    expect(estadoMes({ periodo: '2026-11', ingresos: 0 }, '2026-10')).toBe('futuro')
    expect(estadoMes({ periodo: '2026-10', ingresos: 0 }, '2026-10')).toBe('actual')
    expect(estadoMes({ periodo: '2026-08', ingresos: 0, gastos: 0, ventas: 0 }, '2026-10')).toBe('sinMovimiento')
    expect(estadoMes({ periodo: '2026-07', ingresos: 0, gastos: 200, ventas: 0 }, '2026-10')).toBe('cerrado')
  })
})

describe('diasDesde', () => {
  it('cuenta días calendario', () => {
    expect(diasDesde('2026-10-13', '2026-10-25')).toBe(12)
    expect(diasDesde(null)).toBe(null)
  })
})
