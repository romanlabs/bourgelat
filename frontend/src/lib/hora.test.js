import { describe, expect, it } from 'vitest'
import { moverFin } from './hora'

describe('moverFin', () => {
  it('conserva la duracion al mover el inicio', () => {
    expect(moverFin('17:00', '17:30', '18:00')).toBe('18:30')
    expect(moverFin('09:00', '10:15', '14:00')).toBe('15:15')
  })

  it('usa 30 minutos si la franja anterior no era valida', () => {
    expect(moverFin('18:00', '17:30', '19:00')).toBe('19:30')
    expect(moverFin('', '', '08:00')).toBe('08:30')
  })

  it('no pasa del final del dia', () => {
    expect(moverFin('22:00', '23:00', '23:30')).toBe('23:45')
  })
})
