import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cargar = async (siteKey) => {
  vi.resetModules()
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', siteKey)
  return (await import('./TurnstileWidget')).default
}

describe('TurnstileWidget', () => {
  beforeEach(() => {
    delete window.turnstile
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    document.head.querySelectorAll('script[src*="turnstile"]').forEach((s) => s.remove())
  })

  it('no renderiza nada sin site key', async () => {
    const Widget = await cargar('')
    const { container } = render(<Widget onToken={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
    expect(document.head.querySelector('script[src*="turnstile"]')).toBeNull()
  })

  it('si el script falla muestra el aviso y Reintentar vuelve a cargarlo', async () => {
    const Widget = await cargar('clave-prueba')
    const onToken = vi.fn()
    render(<Widget onToken={onToken} />)

    document.head.querySelector('script[src*="turnstile"]').onerror()
    expect(await screen.findByText(/No pudimos cargar la verificación de seguridad/)).toBeInTheDocument()
    expect(onToken).toHaveBeenCalledWith(null)

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(document.head.querySelector('script[src*="turnstile"]')).not.toBeNull())
    expect(screen.queryByText(/No pudimos cargar/)).not.toBeInTheDocument()

    const render_ = vi.fn(() => 'w1')
    window.turnstile = { render: render_, reset: vi.fn(), remove: vi.fn() }
    document.head.querySelector('script[src*="turnstile"]').onload()
    await waitFor(() => expect(render_).toHaveBeenCalled())
    expect(render_.mock.calls[0][1]).toMatchObject({ sitekey: 'clave-prueba', theme: 'light' })
  })
})
