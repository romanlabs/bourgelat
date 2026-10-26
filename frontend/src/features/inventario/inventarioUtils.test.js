import { describe, expect, it } from 'vitest'
import { diasParaVencer, estadoVencimiento, hoyLocal, textoVencimiento } from './inventarioUtils'

const HOY = '2026-10-10'
const clasificar = (fechaVencimiento, stock = 5) => estadoVencimiento({ fechaVencimiento, stock }, HOY)

describe('estadoVencimiento', () => {
  it('sigue la misma regla que clasificarVencimiento del backend', () => {
    expect(clasificar('2026-10-09')).toBe('vencido')
    expect(clasificar('2026-10-10')).toBe('proximo')
    expect(clasificar('2026-11-09')).toBe('proximo')
    expect(clasificar('2026-11-10')).toBe(null)
  })

  it('no alerta sin existencias ni sin fecha', () => {
    expect(clasificar('2026-01-01', 0)).toBe(null)
    expect(clasificar(null)).toBe(null)
    expect(estadoVencimiento(undefined, HOY)).toBe(null)
  })

  it('acepta la fecha con hora que a veces trae el API', () => {
    expect(clasificar('2026-10-09T00:00:00.000Z')).toBe('vencido')
  })
})

describe('diasParaVencer y textoVencimiento', () => {
  it('cuenta dias calendario, también al cruzar de mes', () => {
    expect(diasParaVencer('2026-11-02', '2026-10-30')).toBe(3)
    expect(diasParaVencer('2026-10-08', HOY)).toBe(-2)
  })

  it('arma el texto del aviso de Caja', () => {
    expect(textoVencimiento('2026-10-10', HOY)).toBe('Vence hoy')
    expect(textoVencimiento('2026-10-11', HOY)).toBe('Vence mañana')
    expect(textoVencimiento('2026-10-15', HOY)).toBe('Vence en 5 días')
    expect(textoVencimiento('2026-10-01', HOY)).toMatch(/^Vencido · 1 de oct/)
  })
})

describe('hoyLocal', () => {
  it('usa la fecha local, no la UTC', () => {
    expect(hoyLocal(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
})
