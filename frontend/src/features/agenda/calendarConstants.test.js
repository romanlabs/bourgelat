import { describe, expect, it } from 'vitest'
import { horaAlAbrirGrilla } from './calendarConstants'

const LUNES_8_A_5 = { 1: [{ inicio: '08:00', fin: '17:00' }] }

describe('horaAlAbrirGrilla', () => {
  it('sin horario: de día abre en la hora actual', () => {
    expect(horaAlAbrirGrilla(14, null)).toBe(14)
    expect(horaAlAbrirGrilla(7, null)).toBe(7)
    expect(horaAlAbrirGrilla(18, {})).toBe(18)
  })

  it('sin horario: de noche y de madrugada abre en la mañana, no a medianoche', () => {
    expect(horaAlAbrirGrilla(0, null)).toBe(7)
    expect(horaAlAbrirGrilla(3, null)).toBe(7)
    expect(horaAlAbrirGrilla(19, null)).toBe(7)
    expect(horaAlAbrirGrilla(23, {})).toBe(7)
  })

  it('con horario: fuera de la jornada abre al inicio de lo visible', () => {
    expect(horaAlAbrirGrilla(23, LUNES_8_A_5)).toBe(7)
    expect(horaAlAbrirGrilla(2, LUNES_8_A_5)).toBe(7)
    expect(horaAlAbrirGrilla(10, LUNES_8_A_5)).toBe(10)
  })

  it('clínica de 24 horas: siempre abre en la hora actual', () => {
    const veinticuatro = { 1: [{ inicio: '00:00', fin: '24:00' }] }
    expect(horaAlAbrirGrilla(3, veinticuatro)).toBe(3)
    expect(horaAlAbrirGrilla(23, veinticuatro)).toBe(23)
  })
})
