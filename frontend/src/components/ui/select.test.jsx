import { useState } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Select } from './select'

// jsdom no implementa las APIs de puntero que usa el menu de Radix.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

function Campo({ registro }) {
  const [valor, setValor] = useState('')
  registro.valor = valor
  return (
    <form>
      <Select
        aria-label="Paciente"
        placeholder="Selecciona el paciente"
        value={valor}
        onValueChange={setValor}
        options={[{ value: 'toby', label: 'Toby' }]}
      />
    </form>
  )
}

describe('Select', () => {
  // Caso real de la agenda: el selector de paciente arranca vacio (Radix queda
  // sin controlar) y la eleccion con el mouse debe llegar al formulario.
  it('entrega al formulario la opcion elegida con el mouse desde vacio', async () => {
    const registro = {}
    render(<Campo registro={registro} />)

    fireEvent.pointerDown(screen.getByLabelText('Paciente'), { button: 0, ctrlKey: false, pointerType: 'mouse' })
    fireEvent.click(await screen.findByRole('option', { name: 'Toby' }))

    await waitFor(() => expect(registro.valor).toBe('toby'))
  })
})
