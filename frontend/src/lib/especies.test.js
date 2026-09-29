import { describe, it, expect } from 'vitest'
import {
  ESPECIE_VALORES,
  ESPECIE_OPCIONES_FORM,
  ESPECIE_OPCIONES_FILTRO,
  etiquetaEspecie,
} from './especies'

describe('especies', () => {
  it('usa terminologia clinica sin cambiar el valor guardado', () => {
    expect(etiquetaEspecie('perro')).toBe('Canino')
    expect(etiquetaEspecie('gato')).toBe('Felino')
    expect(etiquetaEspecie('conejo')).toBe('Lagomorfo')
  })

  it('muestra tal cual un valor desconocido y vacio si no hay especie', () => {
    expect(etiquetaEspecie('jaguar')).toBe('jaguar')
    expect(etiquetaEspecie(null)).toBe('')
  })

  it('aclara el nombre comun en el formulario', () => {
    expect(ESPECIE_OPCIONES_FORM.find((o) => o.value === 'perro').label).toBe('Canino (perro)')
    expect(ESPECIE_OPCIONES_FORM.find((o) => o.value === 'reptil').label).toBe('Reptil')
  })

  it('mantiene los mismos valores que acepta el backend', () => {
    expect(ESPECIE_VALORES).toEqual(['perro', 'gato', 'ave', 'conejo', 'reptil', 'otro'])
    expect(ESPECIE_OPCIONES_FILTRO[0].value).toBe('todas')
  })
})
