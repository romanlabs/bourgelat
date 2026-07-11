import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import LandingPage from '../pages/LandingPage'

describe('Cierre #contacto', () => {
  it('renderiza la sección de contacto', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(document.getElementById('contacto')).toBeInTheDocument()
  })

  it('muestra el perro de despedida dentro de #contacto', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const dog = document.getElementById('contacto').querySelector('.contact-dog')
    expect(dog).toBeInTheDocument()
    expect(dog.getAttribute('src')).toMatch(/perro-despedida/)
  })

  it('incluye el CTA de crear cuenta', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const contacto = document.getElementById('contacto')
    expect(contacto.textContent).toMatch(/crear cuenta/i)
  })
})
