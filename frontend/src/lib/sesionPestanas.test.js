import { describe, it, expect } from 'vitest'
import { evaluarCambioSesion } from './sesionPestanas'

const s = (u, c) => ({ usuario: { id: u }, clinica: { id: c } })

describe('evaluarCambioSesion', () => {
  it('misma sesión no cambia', () => {
    expect(evaluarCambioSesion(s('u1', 'c1'), s('u1', 'c1'))).toBe('sin_cambio')
  })
  it('otro usuario o clínica es cambio', () => {
    expect(evaluarCambioSesion(s('u1', 'c1'), s('u2', 'c2'))).toBe('cambio')
    expect(evaluarCambioSesion(s('u1', 'c1'), s('u1', 'c2'))).toBe('cambio')
  })
  it('sesión vacía es cierre', () => {
    expect(evaluarCambioSesion(s('u1', 'c1'), { usuario: null, clinica: null })).toBe('cierre')
    expect(evaluarCambioSesion(s('u1', 'c1'), null)).toBe('cierre')
  })
  it('pestaña sin sesión no se toca', () => {
    expect(evaluarCambioSesion({ usuario: null }, s('u1', 'c1'))).toBe('sin_cambio')
  })
})
