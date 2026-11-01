import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CierreTurnoModal from './CierreTurnoModal'

// Turno abierto con base $0 y solo ventas por transferencia: el esperado es $0
const turnoSinEfectivo = {
  montoInicial: 0,
  totalVentasEfectivo: 0,
  totalIngresosManuales: 0,
  totalEgresosManuales: 0,
}

describe('CierreTurnoModal', () => {
  it('permite cerrar con $0 contado cuando no hubo efectivo', () => {
    const mutate = vi.fn()
    render(
      <CierreTurnoModal
        open
        onClose={() => {}}
        turnoActivo={turnoSinEfectivo}
        cerrarTurnoMutation={{ mutate, isPending: false }}
      />
    )

    const boton = screen.getByRole('button', { name: 'Cerrar turno' })
    expect(boton).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('$ 0'), { target: { value: '0' } })
    expect(screen.getByText('Cierre cuadrado, sin diferencias.')).toBeInTheDocument()
    expect(boton).toBeEnabled()

    fireEvent.click(boton)
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ montoFinalContado: 0 }),
      expect.anything()
    )
  })
})
