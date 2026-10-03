import { useEffect } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { HoraPicker } from './HoraPicker'

// jsdom no implementa las APIs de puntero que usa el menu de Radix.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

// Reproduce el panel de "Programar cita": monta con una hora por defecto y, en
// el mismo arranque, un efecto aplica la hora del hueco clicado en la agenda.
function PanelConPrefill({ prefill }) {
  const { control, setValue } = useForm({ defaultValues: { horaInicio: '09:00' } })
  const valor = useWatch({ control, name: 'horaInicio' })
  useEffect(() => {
    if (prefill) setValue('horaInicio', prefill)
  }, [prefill, setValue])
  return (
    <form>
      <Controller
        name="horaInicio"
        control={control}
        render={({ field }) => <HoraPicker aria-label="Hora" value={field.value} onChange={field.onChange} />}
      />
      <output aria-label="valor">{valor}</output>
    </form>
  )
}

describe('HoraPicker', () => {
  it('conserva la tarde al precargar una hora al montar (16:00 → 4 p. m.)', async () => {
    render(<PanelConPrefill prefill="16:00" />)

    await waitFor(() => expect(screen.getByLabelText('Hora: hora')).toHaveTextContent('4'))
    expect(screen.getByLabelText('Hora: AM o PM')).toHaveTextContent('p. m.')
    expect(screen.getByLabelText('valor')).toHaveTextContent('16:00')
  })

  it('deja que el usuario cambie a. m./p. m. con el mouse', async () => {
    render(<PanelConPrefill />)

    fireEvent.pointerDown(screen.getByLabelText('Hora: AM o PM'), { button: 0, ctrlKey: false, pointerType: 'mouse' })
    fireEvent.click(await screen.findByRole('option', { name: 'p. m.' }))

    await waitFor(() => expect(screen.getByLabelText('valor')).toHaveTextContent('21:00'))
  })
})
