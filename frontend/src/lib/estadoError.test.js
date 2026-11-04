import { describe, expect, it } from 'vitest'
import { clasificarError, debeReintentarCarga, esErrorDeCarga, textoAvisoError } from './estadoError'

const almacenDePrueba = () => {
  const datos = new Map()
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => datos.set(clave, valor),
  }
}

describe('esErrorDeCarga', () => {
  it('reconoce los módulos que no se pudieron descargar', () => {
    expect(esErrorDeCarga(new Error('Failed to fetch dynamically imported module: https://x/a.js'))).toBe(true)
    expect(esErrorDeCarga(new Error('Importing a module script failed.'))).toBe(true)
    expect(esErrorDeCarga(new Error('x is not a function'))).toBe(false)
    expect(esErrorDeCarga(null)).toBe(false)
  })
})

describe('clasificarError', () => {
  it('sin internet manda la conexión, sea cual sea el error', () => {
    expect(clasificarError(new Error('Importing a module script failed.'), false)).toBe('conexion')
  })

  it('separa una versión vieja de un error de la pantalla', () => {
    expect(clasificarError(new Error('Importing a module script failed.'))).toBe('actualizacion')
    expect(clasificarError(new Error('x is not a function'))).toBe('revision')
  })
})

describe('textoAvisoError', () => {
  it('respeta el motivo escrito de un 4xx y no ofrece reintentar', () => {
    const error = { response: { status: 403, data: { message: 'Tu rol no permite ver esto.' } } }
    expect(textoAvisoError(error)).toEqual({ motivo: 'Tu rol no permite ver esto.', reintenta: false })
  })

  it('nunca muestra el texto técnico de un 500 ni de axios', () => {
    const error500 = { message: 'Request failed with status code 500', response: { status: 500, data: { message: 'relation does not exist' } } }
    const errorRed = { message: 'Network Error', code: 'ERR_NETWORK' }
    for (const error of [error500, errorRed]) {
      const { motivo, reintenta } = textoAvisoError(error)
      expect(motivo).toMatch(/Seguimos intentando/)
      expect(motivo).not.toMatch(/relation|Network|status code/)
      expect(reintenta).toBe(true)
    }
  })
})

describe('debeReintentarCarga', () => {
  it('reintenta una vez y no entra en bucle', () => {
    const almacen = almacenDePrueba()
    expect(debeReintentarCarga('/agenda', 1_000_000, almacen)).toBe(true)
    expect(debeReintentarCarga('/agenda', 1_005_000, almacen)).toBe(false)
  })

  it('vuelve a reintentar tras otra publicación en la misma pestaña', () => {
    const almacen = almacenDePrueba()
    debeReintentarCarga('/agenda', 1_000_000, almacen)
    expect(debeReintentarCarga('/agenda', 1_000_000 + 3_600_000, almacen)).toBe(true)
  })

  it('cada ruta lleva su propia cuenta', () => {
    const almacen = almacenDePrueba()
    debeReintentarCarga('/agenda', 1_000_000, almacen)
    expect(debeReintentarCarga('/finanzas', 1_000_000, almacen)).toBe(true)
  })

  it('sin almacenamiento no recarga', () => {
    const roto = { getItem: () => { throw new Error('bloqueado') }, setItem: () => {} }
    expect(debeReintentarCarga('/agenda', 1_000_000, roto)).toBe(false)
  })
})
