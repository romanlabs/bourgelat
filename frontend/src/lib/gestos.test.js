import { describe, expect, it } from 'vitest'
import { direccionGesto } from './gestos'

describe('direccionGesto', () => {
  it('reconoce deslizar a la izquierda y a la derecha', () => {
    expect(direccionGesto(-90, 10)).toBe('izquierda')
    expect(direccionGesto(90, -12)).toBe('derecha')
  })

  it('un recorrido corto no es gesto', () => {
    expect(direccionGesto(-30, 0)).toBeNull()
  })

  it('si el dedo bajó casi tanto como avanzó, era scroll', () => {
    expect(direccionGesto(-80, 70)).toBeNull()
  })

  it('reconoce tirar hacia abajo', () => {
    expect(direccionGesto(5, 120)).toBe('abajo')
  })
})
