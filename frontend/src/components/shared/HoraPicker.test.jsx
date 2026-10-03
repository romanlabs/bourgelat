import { useEffect } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Controller, useForm } from 'react-hook-form'
import { HoraPicker } from './HoraPicker'

// Reproduce el panel de "Programar cita": monta con una hora por defecto y, en
// el mismo arranque, un efecto aplica la hora del hueco clicado en la agenda.
function PanelConPrefill({ prefill, registro }) {
  const { control, setValue, watch } = useForm({ defaultValues: { horaInicio: '09:00' } })
  useEffect(() => {
    if (prefill) setValue('horaInicio', prefill)
  }, [prefill, setValue])
  registro.valor = watch('horaInicio')
  return (
    <form>
      <Controller
        name="horaInicio"
        control={control}
        render={({ field }) => <HoraPicker aria-label="Hora" value={field.value} onChange={field.onChange} />}
      />
    </form>
  )
}

// jsdom no implementa las APIs de puntero que usa el menu de Radix.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

describe('HoraPicker', () => {
  it('conserva la tarde al precargar una hora al montar (16:00 → 4 p. m.)', async () => {
    const registro = {}
    render(<PanelConPrefill prefill="16:00" registro={registro} />)

    await waitFor(() => expect(screen.getByLabelText('Hora: hora')).toHaveTextContent('4'))
    expect(screen.getByLabelText('Hora: AM o PM')).toHaveTextContent('p. m.')
    expect(registro.valor).toBe('16:00')
  })

  it('deja que el usuario cambie a. m./p. m. con el mouse', async () => {
    const registro = {}
    render(<PanelConPrefill registro={registro} />)

    const periodo = screen.getByLabelText('Hora: AM o PM')
    fireEvent.pointerDown(periodo, { button: 0, ctrlKey: false, pointerType: 'mouse' })
    fireEvent.click(await screen.findByRole('option', { name: 'p. m.' }))

    await waitFor(() => expect(registro.valor).toBe('21:00'))
  })
})
