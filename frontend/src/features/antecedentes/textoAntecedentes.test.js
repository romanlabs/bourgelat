import { describe, expect, it } from 'vitest'
import { estaEsterilizado } from './textoAntecedentes'

describe('estaEsterilizado', () => {
  it('es cierto si cualquiera de las dos fichas lo registra', () => {
    expect(estaEsterilizado({ esterilizado: true }, { esterilizado: false })).toBe(true)
    expect(estaEsterilizado({ esterilizado: false }, { esterilizado: true })).toBe(true)
  })

  it('es falso sin registro o sin datos', () => {
    expect(estaEsterilizado({ esterilizado: false }, { esterilizado: false })).toBe(false)
    expect(estaEsterilizado(undefined, null)).toBe(false)
  })
})
