import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import LandingPage from '../pages/LandingPage'

describe('Hero video', () => {
  it('tiene autoPlay, muted, loop, playsInline y poster', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const video = document.querySelector('video')
    expect(video).toBeInTheDocument()
    expect(video.hasAttribute('autoplay')).toBe(true)
    // 'muted' is a DOM property in React, not an HTML attribute — check it directly
    expect(video.muted).toBe(true)
    expect(video.hasAttribute('loop')).toBe(true)
    expect(video.hasAttribute('playsinline')).toBe(true)
    expect(video).toHaveAttribute('poster', '/videos/perroHero-poster.webp')
    // preload="auto" — el hero hace autoplay, necesita buffer desde el inicio
    // para no entrecortarse (preload="none" causaba stutter)
    expect(video).toHaveAttribute('preload', 'auto')
  })

  it('tiene source WebM y MP4', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const video = document.querySelector('video')
    const sources = [...video.querySelectorAll('source')]
    const types = sources.map(s => s.type)
    expect(types).toContain('video/webm')
    expect(types).toContain('video/mp4')
  })

  it('WebM aparece antes que MP4 (prioridad de decodificación)', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const sources = [...document.querySelector('video').querySelectorAll('source')]
    const idx = (type) => sources.findIndex(s => s.type === type)
    expect(idx('video/webm')).toBeLessThan(idx('video/mp4'))
  })
})
