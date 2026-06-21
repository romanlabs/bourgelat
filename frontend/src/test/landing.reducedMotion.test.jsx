import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LandingPage from '../pages/LandingPage'

describe('prefers-reduced-motion', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('la página se renderiza sin errores con reduced-motion activo', () => {
    expect(() =>
      render(<MemoryRouter><LandingPage /></MemoryRouter>)
    ).not.toThrow()
  })

  it('el canvas de DogTug sigue montándose con reduced-motion', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const canvas = document.getElementById('contacto')?.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })
})
