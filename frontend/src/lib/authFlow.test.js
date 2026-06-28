import { describe, it, expect } from 'vitest'
import { debeIntentarRefresh } from './authFlow'

const error401 = ({ data = {}, url = '/mascotas', _retry = false } = {}) => ({
  response: { status: 401, data },
  config: { url, _retry },
})

describe('debeIntentarRefresh', () => {
  it('intenta refrescar cuando el access token expiró (code TOKEN_EXPIRED)', () => {
    expect(debeIntentarRefresh(error401({ data: { code: 'TOKEN_EXPIRED' } }))).toBe(true)
  })

  it('intenta refrescar cuando falta el access token (cookie borrada a los 15 min)', () => {
    // Este es el caso del bug: 401 sin code porque el navegador borró la cookie.
    expect(debeIntentarRefresh(error401({ data: { message: 'Acceso denegado, token requerido' } }))).toBe(true)
  })

  it('NO refresca el propio endpoint de refresh (evita bucle)', () => {
    expect(debeIntentarRefresh(error401({ url: '/auth/refresh' }))).toBe(false)
  })

  it('NO refresca en login (un 401 ahí es credencial incorrecta)', () => {
    expect(debeIntentarRefresh(error401({ url: '/auth/login' }))).toBe(false)
  })

  it('NO refresca en registro', () => {
    expect(debeIntentarRefresh(error401({ url: '/auth/registro' }))).toBe(false)
  })

  it('NO reintenta si ya se reintentó (_retry)', () => {
    expect(debeIntentarRefresh(error401({ data: { code: 'TOKEN_EXPIRED' }, _retry: true }))).toBe(false)
  })

  it('NO refresca cuando el usuario fue desactivado (USER_INACTIVE)', () => {
    expect(debeIntentarRefresh(error401({ data: { code: 'USER_INACTIVE' } }))).toBe(false)
  })

  it('NO refresca cuando la clínica fue desactivada (CLINIC_INACTIVE)', () => {
    expect(debeIntentarRefresh(error401({ data: { code: 'CLINIC_INACTIVE' } }))).toBe(false)
  })

  it('ignora errores que no son 401', () => {
    expect(debeIntentarRefresh({ response: { status: 500, data: {} }, config: {} })).toBe(false)
  })
})
