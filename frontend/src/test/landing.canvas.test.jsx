import { describe, it, expect } from 'vitest'
import { renderLanding } from './renderLanding'

describe('Cierre #contacto', () => {
  it('renderiza la sección de contacto', () => {
    renderLanding()
    expect(document.getElementById('contacto')).toBeInTheDocument()
  })

  it('muestra el perro de despedida dentro de #contacto', () => {
    renderLanding()
    const dog = document.getElementById('contacto').querySelector('.contact-dog')
    expect(dog).toBeInTheDocument()
    expect(dog.getAttribute('src')).toMatch(/perro-despedida/)
  })

  it('incluye el CTA de crear cuenta', () => {
    renderLanding()
    const contacto = document.getElementById('contacto')
    expect(contacto.textContent).toMatch(/crear cuenta/i)
  })
})
