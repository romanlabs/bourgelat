import { describe, expect, it } from 'vitest'
import { calcularPrecioPlan, maxAhorroPct } from './precios'

const clinica = { precioMensual: 89000, precioAnual: 75000 }
const esencial = { precioMensual: 49000, precioAnual: 41000 }

describe('calcularPrecioPlan', () => {
  it('en mensual no hay total ni ahorro', () => {
    expect(calcularPrecioPlan(clinica, false)).toEqual({
      porMes: 89000,
      totalAnual: null,
      ahorroTotal: 0,
      ahorroPct: 0,
    })
  })

  it('en anual calcula total del año y ahorro total', () => {
    expect(calcularPrecioPlan(clinica, true)).toEqual({
      porMes: 75000,
      totalAnual: 900000,
      ahorroTotal: 168000,
      ahorroPct: 16,
    })
    expect(calcularPrecioPlan(esencial, true)).toMatchObject({
      totalAnual: 492000,
      ahorroTotal: 96000,
    })
  })

  it('planes sin precio no producen ahorro', () => {
    expect(calcularPrecioPlan({ precioMensual: null, precioAnual: null }, true)).toEqual({
      porMes: null,
      totalAnual: null,
      ahorroTotal: 0,
      ahorroPct: 0,
    })
  })
})

describe('maxAhorroPct', () => {
  it('devuelve el mayor porcentaje', () => {
    expect(maxAhorroPct([clinica, esencial, {}])).toBe(16)
  })
})
