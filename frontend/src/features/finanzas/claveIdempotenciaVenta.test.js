import { describe, expect, it, vi } from 'vitest'
import { crearGestorClaveVenta, generarUuid } from './claveIdempotenciaVenta'

const PATRON_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('crearGestorClaveVenta', () => {
  it('repite la misma clave en los reintentos del mismo carrito', () => {
    const generar = vi.fn().mockReturnValueOnce('clave-1').mockReturnValueOnce('clave-2')
    const gestor = crearGestorClaveVenta(generar)

    expect(gestor.obtener()).toBe('clave-1')
    expect(gestor.obtener()).toBe('clave-1')
    expect(generar).toHaveBeenCalledTimes(1)
  })

  it('genera una clave nueva después de reiniciar', () => {
    const generar = vi.fn().mockReturnValueOnce('clave-1').mockReturnValueOnce('clave-2')
    const gestor = crearGestorClaveVenta(generar)

    gestor.obtener()
    gestor.reiniciar()
    expect(gestor.obtener()).toBe('clave-2')
  })

  it('no genera nada hasta el primer intento', () => {
    const generar = vi.fn(() => 'x')
    const gestor = crearGestorClaveVenta(generar)
    gestor.reiniciar()
    expect(generar).not.toHaveBeenCalled()
  })
})

describe('generarUuid', () => {
  it('usa crypto.randomUUID cuando existe', () => {
    expect(generarUuid({ randomUUID: () => 'desde-randomUUID' })).toBe('desde-randomUUID')
  })

  it('arma un UUID v4 válido sin randomUUID', () => {
    const cryptoSinRandomUuid = { getRandomValues: (arr) => globalThis.crypto.getRandomValues(arr) }
    const uuid = generarUuid(cryptoSinRandomUuid)
    expect(uuid).toMatch(PATRON_UUID_V4)
    expect(generarUuid(cryptoSinRandomUuid)).not.toBe(uuid)
  })

  it('por defecto devuelve un UUID v4', () => {
    expect(generarUuid()).toMatch(PATRON_UUID_V4)
  })
})
