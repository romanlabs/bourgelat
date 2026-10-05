import { describe, expect, it } from 'vitest'
import { fechaLocal, mesLocal } from './fecha'

describe('fechaLocal', () => {
  it('usa el dia local aunque en UTC ya sea manana', () => {
    // 5 de octubre, 9:30 p. m. hora local: en Colombia (UTC-5) son las 02:30 UTC del 6.
    const noche = new Date(2026, 9, 5, 21, 30)
    expect(fechaLocal(noche)).toBe('2026-10-05')
  })

  it('rellena mes y dia con cero', () => {
    expect(fechaLocal(new Date(2026, 0, 7, 8, 0))).toBe('2026-01-07')
  })
})

describe('mesLocal', () => {
  it('toma el mes local', () => {
    expect(mesLocal(new Date(2026, 9, 31, 23, 59))).toBe('2026-10')
  })
})
