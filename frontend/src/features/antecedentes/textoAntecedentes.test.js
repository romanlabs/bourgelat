import { describe, expect, it } from 'vitest'
import {
  SIN_ALERGIAS,
  SIN_REGISTRAR,
  campoAEsterilizado,
  esterilizadoACampo,
  textoEsterilizado,
  textoRegistrado,
} from './textoAntecedentes'

describe('esterilización de tres estados', () => {
  it('distingue sí, no y sin registrar', () => {
    expect(textoEsterilizado(true)).toBe('Sí')
    expect(textoEsterilizado(false)).toBe('No')
    expect(textoEsterilizado(null)).toBe(SIN_REGISTRAR)
    expect(textoEsterilizado(undefined)).toBe(SIN_REGISTRAR)
  })

  it('el formulario conserva los tres valores de ida y vuelta', () => {
    for (const valor of [true, false, null]) {
      expect(campoAEsterilizado(esterilizadoACampo(valor))).toBe(valor)
    }
  })
})

describe('textoRegistrado', () => {
  it('lo vacío sin confirmar queda sin registrar', () => {
    expect(textoRegistrado([], false, SIN_ALERGIAS)).toBe(SIN_REGISTRAR)
  })

  it('lo vacío confirmado lo dice', () => {
    expect(textoRegistrado([], true, SIN_ALERGIAS)).toBe(SIN_ALERGIAS)
  })

  it('una alergia registrada gana sobre la confirmación', () => {
    expect(textoRegistrado(['Penicilina'], true, SIN_ALERGIAS)).toBe('Penicilina')
  })
})
