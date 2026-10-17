import { describe, expect, it } from 'vitest'
import { aMinutos, desdeMinutos, esquemaRecordatorioCita } from './recordatorioCita'

describe('recordatorioCita', () => {
  it('muestra en horas los múltiplos de 60 y en minutos el resto', () => {
    expect(desdeMinutos(60)).toEqual({ cantidad: 1, unidad: 'horas' })
    expect(desdeMinutos(2880)).toEqual({ cantidad: 48, unidad: 'horas' })
    expect(desdeMinutos(90)).toEqual({ cantidad: 90, unidad: 'minutos' })
    expect(desdeMinutos(undefined)).toEqual({ cantidad: 1, unidad: 'horas' })
  })

  it('convierte a minutos, incluidas horas con decimales', () => {
    expect(aMinutos({ cantidad: 2, unidad: 'horas' })).toBe(120)
    expect(aMinutos({ cantidad: 1.5, unidad: 'horas' })).toBe(90)
    expect(aMinutos({ cantidad: 45, unidad: 'minutos' })).toBe(45)
  })

  it('acepta de 15 minutos a 48 horas', () => {
    const ok = (cantidad, unidad) => esquemaRecordatorioCita.safeParse({ activo: true, cantidad, unidad }).success
    expect(ok(15, 'minutos')).toBe(true)
    expect(ok(48, 'horas')).toBe(true)
    expect(ok(1.5, 'horas')).toBe(true)
    expect(ok(10, 'minutos')).toBe(false)
    expect(ok(49, 'horas')).toBe(false)
    expect(ok(0, 'horas')).toBe(false)
    expect(ok(20.5, 'minutos')).toBe(false)
    expect(ok(undefined, 'minutos')).toBe(false)
    expect(ok('', 'minutos')).toBe(false)
  })

  it('apagado no valida la anticipación', () => {
    expect(esquemaRecordatorioCita.safeParse({ activo: false, cantidad: 0, unidad: 'minutos' }).success).toBe(true)
  })

  it('apagado acepta la cantidad ausente (campo deshabilitado)', () => {
    expect(esquemaRecordatorioCita.safeParse({ activo: false, cantidad: undefined, unidad: 'minutos' }).success).toBe(true)
  })
})
