import { describe, expect, it } from 'vitest'
import {
  aniosDisponibles,
  badgeVariacion,
  etiquetaAnterior,
  etiquetaPeriodo,
  rangoDelAnio,
  rangoTrimestreActual,
  rangoUltimos12Meses,
  variacion,
} from './analisisPeriodo'

// 23 de octubre de 2026, hora local.
const HOY = new Date(2026, 9, 23)

describe('rangos de los atajos', () => {
  it('el año va del 1 de enero al 31 de diciembre', () => {
    expect(rangoDelAnio(2025)).toEqual({ fechaInicio: '2025-01-01', fechaFin: '2025-12-31' })
  })

  it('los últimos 12 meses son meses completos e incluyen el actual', () => {
    expect(rangoUltimos12Meses(HOY)).toEqual({ fechaInicio: '2025-11-01', fechaFin: '2026-10-31' })
  })

  it('el trimestre es el calendario en curso', () => {
    expect(rangoTrimestreActual(HOY)).toEqual({ fechaInicio: '2026-10-01', fechaFin: '2026-12-31' })
    expect(rangoTrimestreActual(new Date(2026, 1, 10))).toEqual({
      fechaInicio: '2026-01-01',
      fechaFin: '2026-03-31',
    })
  })

  it('el selector ofrece el año actual y los cinco anteriores', () => {
    expect(aniosDisponibles(HOY)).toEqual([2026, 2025, 2024, 2023, 2022, 2021])
  })
})

describe('variacion', () => {
  it('calcula el cambio porcentual con un decimal', () => {
    expect(variacion(1200, 1000)).toBe(20)
    expect(variacion(500, 1500)).toBe(-66.7)
  })

  it('sin periodo anterior no hay comparación', () => {
    expect(variacion(1000, 0)).toBeNull()
    expect(variacion(1000, undefined)).toBeNull()
  })

  it('una ganancia que pasa de pérdida a positiva sube', () => {
    expect(variacion(100, -100)).toBe(200)
  })
})

describe('badgeVariacion', () => {
  it('ingresos que suben se ven en verde', () => {
    expect(badgeVariacion(1200, 1000, '2025')).toEqual({
      badge: '+20 % vs 2025',
      badgeTone: 'bg-success-soft text-success',
    })
  })

  it('gastos que suben se ven en rojo', () => {
    expect(badgeVariacion(1200, 1000, '2025', { mayorEsMejor: false }).badgeTone).toBe(
      'bg-danger-soft text-danger'
    )
  })

  it('una baja lleva signo menos', () => {
    expect(badgeVariacion(900, 1000, '2025').badge).toBe('−10 % vs 2025')
  })

  it('sin datos previos lo dice en vez de inventar un porcentaje', () => {
    expect(badgeVariacion(900, 0, '2025').badge).toBe('Sin datos de 2025')
  })
})

describe('etiquetas', () => {
  it('nombra meses y días en corto', () => {
    expect(etiquetaPeriodo('2026-01')).toBe('ene 2026')
    expect(etiquetaPeriodo('2026-12-05')).toBe('5 dic')
  })

  it('nombra el periodo anterior según el atajo', () => {
    expect(etiquetaAnterior('anio', { fechaInicio: '2025-01-01', fechaFin: '2025-10-23' })).toBe('2025')
    expect(etiquetaAnterior('trimestre')).toBe('el trimestre anterior')
    expect(etiquetaAnterior('personalizado', { fechaInicio: '2026-01-01' })).toBe('el periodo anterior')
  })
})
