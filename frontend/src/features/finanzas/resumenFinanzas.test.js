import { describe, expect, it } from 'vitest'
import {
  agruparMetodosPago,
  diasDesde,
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

describe('diasDesde', () => {
  it('cuenta días calendario', () => {
    expect(diasDesde('2026-10-13', '2026-10-25')).toBe(12)
    expect(diasDesde(null)).toBe(null)
  })
})
