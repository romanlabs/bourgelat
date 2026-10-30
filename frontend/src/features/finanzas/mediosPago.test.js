import { describe, expect, it } from 'vitest'
import { CONFIG_MEDIOS, colorMedio, etiquetaMedio, mediosVisibles, netoDelGrupo, semanaDesdeLunes } from './mediosPago'

const medio = (id, cobrado, extra = {}) => ({ id, cobrado, anterior: 0, ...extra })

describe('mediosVisibles', () => {
  it('deja los usados ahora o antes, ordenados por lo cobrado', () => {
    const medios = [medio('efectivo', 100), medio('nequi', 300), medio('daviplata', 0, { anterior: 50 }), medio('otro', 0)]
    expect(mediosVisibles(medios).map((m) => m.id)).toEqual(['nequi', 'efectivo', 'daviplata'])
  })
})

describe('semanaDesdeLunes', () => {
  it('reordena domingo-sábado a lunes-domingo', () => {
    const semana = semanaDesdeLunes([7, 1, 2, 3, 4, 5, 6])
    expect(semana[0]).toEqual({ id: 1, label: 'Lunes', valor: 1 })
    expect(semana.at(-1)).toEqual({ id: 0, label: 'Domingo', valor: 7 })
  })
})

describe('netoDelGrupo', () => {
  const medios = [
    medio('efectivo', 500, { grupoGasto: 'efectivo', gastosGrupo: 120 }),
    medio('transferencia', 200, { grupoGasto: 'transferencia', gastosGrupo: 90 }),
    medio('nequi', 300, { grupoGasto: 'transferencia', gastosGrupo: 90 }),
  ]

  it('resta los gastos del grupo a lo cobrado por todos sus medios', () => {
    expect(netoDelGrupo(medios, 'nequi')).toMatchObject({
      grupo: 'transferencia', medios: ['transferencia', 'nequi'], cobrado: 500, gastos: 90, neto: 410,
    })
    expect(netoDelGrupo(medios, 'efectivo').neto).toBe(380)
  })

  it('sin gastos en la respuesta no hay neto', () => {
    expect(netoDelGrupo([medio('efectivo', 10)], 'efectivo')).toBeNull()
  })
})

describe('colores y etiquetas', () => {
  it('cada medio tiene color fijo por tema y config de gráfica', () => {
    expect(colorMedio('efectivo')).toBe(colorMedio('efectivo', { oscuro: true }))
    expect(colorMedio('desconocido')).toBe(colorMedio('otro'))
    expect(CONFIG_MEDIOS.nequi.label).toBe('Nequi')
    expect(etiquetaMedio('tarjeta_debito')).toBe('Tarjeta débito')
  })
})
