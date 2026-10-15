import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./authApi', () => ({
  authApi: { verificarCodigo: vi.fn(), reenviarCodigo: vi.fn() },
}))
vi.mock('@/components/auth/TurnstileWidget', () => ({ default: () => null }))
vi.mock('@/lib/turnstile', () => ({ turnstileHabilitado: false, turnstileSiteKey: undefined }))

import { authApi } from './authApi'
import CodigoVerificacionPaso from './CodigoVerificacionPaso'

const montar = (props = {}) => {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={cliente}>
      <CodigoVerificacionPaso email="a@b.co" onVerificado={vi.fn()} onVolver={vi.fn()} {...props} />
    </QueryClientProvider>
  )
}

describe('CodigoVerificacionPaso', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.useRealTimers())

  it('acepta solo dígitos y máximo 6', async () => {
    authApi.verificarCodigo.mockResolvedValue({})
    montar()
    const input = screen.getByLabelText('Código de verificación')
    await userEvent.type(input, '12ab34-5678')
    expect(input).toHaveValue('123456')
  })

  it('muestra el error del backend', async () => {
    authApi.verificarCodigo.mockRejectedValue({
      response: { data: { message: 'Código incorrecto. Te quedan 3 intentos.' } },
    })
    montar()
    await userEvent.type(screen.getByLabelText('Código de verificación'), '123456')
    expect(await screen.findByText('Código incorrecto. Te quedan 3 intentos.')).toBeInTheDocument()
    expect(authApi.verificarCodigo.mock.calls[0][0]).toEqual({ email: 'a@b.co', codigo: '123456' })
  })

  it('bloquea el reenvío durante la cuenta atrás y lo habilita al terminar', async () => {
    vi.useFakeTimers()
    montar()
    const boton = screen.getByRole('button', { name: 'Reenviar código' })
    expect(boton).toBeDisabled()
    expect(screen.getByText('Podrás pedir otro en 60 s')).toBeInTheDocument()
    for (let i = 0; i < 60; i += 1) {
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })
    }
    expect(screen.getByRole('button', { name: 'Reenviar código' })).toBeEnabled()
  })
})
