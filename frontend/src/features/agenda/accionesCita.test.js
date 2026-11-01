import { describe, expect, it } from 'vitest'
import { accionesAlDeslizar, accionesDeCita } from './accionesCita'

const todos = { puedeGestionarEstado: true, puedeReprogramar: true }
const keys = (lista) => lista.map((accion) => accion.key)

describe('accionesDeCita', () => {
  it('ofrece las transiciones válidas, reprogramar y cancelar al final', () => {
    expect(keys(accionesDeCita({ estado: 'programada' }, todos))).toEqual([
      'en_espera',
      'en_atencion',
      'no_asistio',
      'reprogramar',
      'cancelada',
    ])
  })

  it('sin permisos no ofrece nada', () => {
    expect(accionesDeCita({ estado: 'programada' })).toEqual([])
  })

  it('no reprograma una cita completada ni cancelada', () => {
    expect(keys(accionesDeCita({ estado: 'completada' }, todos))).toEqual([])
    expect(keys(accionesDeCita({ estado: 'cancelada' }, todos))).toEqual([])
    expect(keys(accionesDeCita({ estado: 'no_asistio' }, todos))).toEqual(['reprogramar'])
  })

  it('cancelar abre el detalle (pide el motivo)', () => {
    const cancelar = accionesDeCita({ estado: 'en_espera' }, todos).find((a) => a.key === 'cancelada')
    expect(cancelar.tipo).toBe('cancelar')
  })
})

describe('accionesAlDeslizar', () => {
  it('deja la acción principal, reprogramar y cancelar', () => {
    expect(keys(accionesAlDeslizar({ estado: 'programada' }, todos))).toEqual(['en_espera', 'reprogramar', 'cancelada'])
    expect(keys(accionesAlDeslizar({ estado: 'en_atencion' }, todos))).toEqual(['completada', 'reprogramar', 'cancelada'])
  })

  it('una cita resuelta no se desliza', () => {
    expect(accionesAlDeslizar({ estado: 'no_asistio' }, todos)).toEqual([])
  })

  it('solo reprogramar si no gestiona estados', () => {
    expect(keys(accionesAlDeslizar({ estado: 'programada' }, { puedeReprogramar: true }))).toEqual(['reprogramar'])
  })
})
