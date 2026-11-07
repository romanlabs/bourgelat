import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LandingPage from './LandingPage'
import { MODULOS, NAV } from '@/components/landing/contenido'

const pintar = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  )

const matchMediaOriginal = window.matchMedia

afterEach(() => {
  window.matchMedia = matchMediaOriginal
})

describe('LandingPage', () => {
  it('tiene un solo h1', () => {
    pintar()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('todo «Crear cuenta» lleva a /registro', () => {
    pintar()
    const enlaces = screen.getAllByRole('link', { name: /crear cuenta/i })
    expect(enlaces.length).toBeGreaterThanOrEqual(3)
    for (const enlace of enlaces) expect(enlace).toHaveAttribute('href', '/registro')
  })

  it('cada enlace del menú tiene su sección', () => {
    const { container } = pintar()
    for (const item of NAV) {
      expect(container.querySelector(item.href), item.href).not.toBeNull()
    }
  })

  it('las preguntas abren y cierran con aria-expanded', async () => {
    pintar()
    const seccion = document.getElementById('preguntas')
    const botones = within(seccion).getAllByRole('button')
    const segundo = botones[1]
    expect(segundo).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(segundo)
    expect(segundo).toHaveAttribute('aria-expanded', 'true')
    expect(botones[0]).toHaveAttribute('aria-expanded', 'false')
  })

  it('con movimiento reducido muestra las cuatro capturas', () => {
    window.matchMedia = vi.fn((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }))
    pintar()
    for (const modulo of MODULOS) {
      expect(screen.getByAltText(modulo.alt)).toBeInTheDocument()
    }
  })
})
