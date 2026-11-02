import { describe, expect, it } from 'vitest'
import { avisoCobroConsulta } from './avisoCobroConsulta'

const errorApi = (status, data) => ({ response: { status, data } })

describe('avisoCobroConsulta', () => {
  it('con la historia abierta explica qué falta y lleva a la consulta', () => {
    const aviso = avisoCobroConsulta(errorApi(400, { message: 'x', mascotaId: 'm1' }), 'h1')
    expect(aviso.mensaje).toMatch(/Sigue abierta/)
    expect(aviso.consultaHref).toBe('/pacientes/m1/historial?historiaId=h1')
  })

  it('una consulta ya facturada muestra el motivo del servidor, sin enlace', () => {
    const aviso = avisoCobroConsulta(errorApi(409, { message: 'Esta consulta ya fue facturada' }), 'h1')
    expect(aviso.mensaje).toBe('Esta consulta ya fue facturada')
    expect(aviso.consultaHref).toBeNull()
  })

  it('sin respuesta del servidor da un mensaje comprensible', () => {
    expect(avisoCobroConsulta(new Error('Network Error'), 'h1').mensaje).toMatch(/Inténtalo de nuevo/)
  })
})
