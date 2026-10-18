import { describe, expect, it } from 'vitest'
import { mensajeDeError } from './errores'

describe('mensajeDeError', () => {
  it('usa el mensaje del servidor', () => {
    expect(mensajeDeError({ response: { data: { message: 'Stock insuficiente' } } }, 'x')).toBe('Stock insuficiente')
  })

  it('no muestra el error técnico del backend', () => {
    expect(mensajeDeError({ response: { status: 500, data: { error: 'relation does not exist' } } }, 'No se pudo')).toBe('No se pudo')
  })

  it('traduce la falta de conexión y el timeout', () => {
    const red = mensajeDeError({ code: 'ERR_NETWORK', message: 'Network Error' }, 'x')
    const lento = mensajeDeError({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' }, 'x')
    expect(red).toMatch(/Sin conexión/)
    expect(lento).toBe(red)
    expect(red).not.toMatch(/Network Error|timeout/)
  })

  it('cae al mensaje por defecto sin datos', () => {
    expect(mensajeDeError(new Error('boom'), 'No se pudo')).toBe('No se pudo')
  })
})
