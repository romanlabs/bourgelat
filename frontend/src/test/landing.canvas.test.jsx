import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import LandingPage from '../pages/LandingPage'

describe('DogTug canvas', () => {
  it('se monta dentro de #contacto', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const contacto = document.getElementById('contacto')
    expect(contacto).toBeInTheDocument()
    const canvas = contacto.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('tiene dimensiones internas correctas (560 × 330)', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const canvas = document.getElementById('contacto').querySelector('canvas')
    expect(canvas.width).toBe(560)
    expect(canvas.height).toBe(330)
  })

  it('mensaje inicial está presente junto al canvas', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const canvas = document.getElementById('contacto').querySelector('canvas')
    // The message <p> is the next sibling of the canvas in the DogTug wrapper
    const msg = canvas.nextElementSibling
    expect(msg).toBeInTheDocument()
    expect(msg.textContent).toMatch(/cuerda/i)
  })
})
