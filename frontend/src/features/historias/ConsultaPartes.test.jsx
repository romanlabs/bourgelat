import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AntecedentesConsulta } from './ConsultaPartes'

const fichaVacia = { alergias: [], medicamentosActuales: [], esterilizado: null, sinAlergias: false, sinMedicacion: false }
const valorDe = (etiqueta) => screen.getByText(etiqueta).nextElementSibling.textContent

describe('AntecedentesConsulta', () => {
  it('no afirma nada que nadie haya registrado', () => {
    render(<AntecedentesConsulta antecedentes={fichaVacia} />)
    expect(valorDe('Alergias')).toBe('Sin registrar')
    expect(valorDe('Esterilizado')).toBe('Sin registrar')
    expect(valorDe('Medicación actual')).toBe('Sin registrar')
  })

  it('muestra las respuestas negativas confirmadas', () => {
    render(<AntecedentesConsulta antecedentes={{ ...fichaVacia, esterilizado: false, sinAlergias: true, sinMedicacion: true }} />)
    expect(valorDe('Alergias')).toBe('Sin alergias conocidas')
    expect(valorDe('Esterilizado')).toBe('No')
    expect(valorDe('Medicación actual')).toBe('No toma medicamentos')
  })

  it('muestra lo que sí está registrado', () => {
    render(
      <AntecedentesConsulta
        antecedentes={{ ...fichaVacia, esterilizado: true, alergias: [{ descripcion: 'Penicilina' }], medicamentosActuales: [{ nombre: 'Meloxicam' }] }}
      />
    )
    expect(valorDe('Alergias')).toBe('Penicilina')
    expect(valorDe('Esterilizado')).toBe('Sí')
    expect(valorDe('Medicación actual')).toBe('Meloxicam')
  })
})
