import { describe, it, expect } from 'vitest'
import {
  esSoloLectura,
  estaEnPrueba,
  diasRestantesPrueba,
  tieneFuncionalidad,
  FUNCIONALIDAD_DIAN,
} from './suscripcion'

describe('esSoloLectura', () => {
  it('detecta el estado de solo lectura', () => {
    expect(esSoloLectura({ estado: 'solo_lectura' })).toBe(true)
  })

  it('no confunde los estados que si pueden escribir', () => {
    expect(esSoloLectura({ estado: 'activa' })).toBe(false)
    expect(esSoloLectura({ estado: 'prueba' })).toBe(false)
  })

  it('tolera la ausencia de suscripcion', () => {
    // Al arrancar la app el store todavia no tiene la suscripcion: no podemos
    // dejar la UI en solo lectura por eso.
    expect(esSoloLectura(null)).toBe(false)
    expect(esSoloLectura(undefined)).toBe(false)
  })
})

describe('diasRestantesPrueba', () => {
  it('cuenta los dias que faltan', () => {
    expect(
      diasRestantesPrueba({ estado: 'prueba', fechaFin: '2026-08-30' }, new Date(2026, 7, 12, 10))
    ).toBe(18)
  })

  it('el ultimo dia cuenta como cero', () => {
    expect(
      diasRestantesPrueba({ estado: 'prueba', fechaFin: '2026-08-12' }, new Date(2026, 7, 12, 23))
    ).toBe(0)
  })

  it('devuelve null si no esta en prueba', () => {
    expect(diasRestantesPrueba({ estado: 'activa', fechaFin: '2026-08-30' })).toBeNull()
  })
})

describe('estaEnPrueba', () => {
  it('distingue la prueba de los demas estados', () => {
    expect(estaEnPrueba({ estado: 'prueba' })).toBe(true)
    expect(estaEnPrueba({ estado: 'activa' })).toBe(false)
    expect(estaEnPrueba(null)).toBe(false)
  })
})

describe('tieneFuncionalidad', () => {
  it('lee el arreglo de funcionalidades', () => {
    expect(tieneFuncionalidad({ funcionalidades: ['inventario'] }, 'inventario')).toBe(true)
    expect(tieneFuncionalidad({ funcionalidades: ['inventario'] }, FUNCIONALIDAD_DIAN)).toBe(false)
  })

  it('tolera datos ausentes o malformados', () => {
    expect(tieneFuncionalidad(null, 'inventario')).toBe(false)
    expect(tieneFuncionalidad({ funcionalidades: null }, 'inventario')).toBe(false)
  })
})
