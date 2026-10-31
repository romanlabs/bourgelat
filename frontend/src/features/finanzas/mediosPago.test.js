import { describe, expect, it } from 'vitest'
import { CONFIG_MEDIOS, colorMedio, etiquetaMedio, mediosVisibles, netoDelMedio, semanaDesdeLunes } from './mediosPago'

const medio = (id, cobrado, extra = {}) => ({ id, cobrado, anterior: 0, ...extra })

describe('mediosVisibles', () => {
  it('deja los usados ahora o antes, ordenados por lo cobrado', () => {
    const medios = [medio('efectivo', 100), medio('transferencia', 300), medio('tarjeta', 0, { anterior: 50 }), medio('otro', 0)]
    expect(mediosVisibles(medios).map((m) => m.id)).toEqual(['transferencia', 'efectivo', 'tarjeta'])
  })
})

describe('semanaDesdeLunes', () => {
  it('reordena domingo-sábado a lunes-domingo', () => {
    const semana = semanaDesdeLunes([7, 1, 2, 3, 4, 5, 6])
    expect(semana[0]).toEqual({ id: 1, label: 'Lunes', valor: 1 })
    expect(semana.at(-1)).toEqual({ id: 0, label: 'Domingo', valor: 7 })
  })
})

describe('netoDelMedio', () => {
  it('resta a lo cobrado los gastos pagados por el mismo medio', () => {
    expect(netoDelMedio(medio('transferencia', 500, { gastos: 90 }))).toMatchObject({
      id: 'transferencia', nombre: 'transferencias', cobrado: 500, gastos: 90, neto: 410,
    })
    expect(netoDelMedio(medio('efectivo', 100, { gastos: 120 })).neto).toBe(-20)
  })

  it('sin gastos en la respuesta no hay neto', () => {
    expect(netoDelMedio(medio('efectivo', 10))).toBeNull()
    expect(netoDelMedio(null)).toBeNull()
  })
})

describe('colores y etiquetas', () => {
  it('cada medio tiene color fijo por tema y config de gráfica', () => {
    expect(colorMedio('efectivo')).toBe(colorMedio('efectivo', { oscuro: true }))
    expect(colorMedio('desconocido')).toBe(colorMedio('otro'))
    expect(Object.keys(CONFIG_MEDIOS)).toEqual(['efectivo', 'transferencia', 'tarjeta', 'otro'])
    expect(etiquetaMedio('tarjeta')).toBe('Tarjeta')
  })
})
