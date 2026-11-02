import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AntecedentesConsulta } from './ConsultaPartes'

const fichaVacia = { alergias: [], medicamentosActuales: [], esterilizado: false }
const valorDe = (etiqueta) => screen.getByText(etiqueta).nextElementSibling.textContent

describe('AntecedentesConsulta', () => {
  it('no afirma nada que nadie haya registrado', () => {
    render(<AntecedentesConsulta antecedentes={fichaVacia} mascota={{ esterilizado: false }} />)
    expect(valorDe('Alergias')).toBe('Sin registrar')
    expect(valorDe('Esterilizado')).toBe('Sin registrar')
    expect(valorDe('Medicación actual')).toBe('Sin registrar')
  })

  it('muestra la esterilización registrada solo en la ficha del paciente', () => {
    render(<AntecedentesConsulta antecedentes={fichaVacia} mascota={{ esterilizado: true }} />)
    expect(valorDe('Esterilizado')).toBe('Sí')
  })

  it('muestra lo que sí está registrado', () => {
    render(
      <AntecedentesConsulta
        antecedentes={{ ...fichaVacia, alergias: [{ descripcion: 'Penicilina' }], medicamentosActuales: [{ nombre: 'Meloxicam' }] }}
      />
    )
    expect(valorDe('Alergias')).toBe('Penicilina')
    expect(valorDe('Medicación actual')).toBe('Meloxicam')
  })
})
