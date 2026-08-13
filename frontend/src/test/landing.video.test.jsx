import { describe, it, expect } from 'vitest'
import { renderLanding } from './renderLanding'

describe('Hero video', () => {
  it('tiene autoPlay, muted, loop, playsInline y poster', () => {
    renderLanding()
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
    renderLanding()
    const video = document.querySelector('video')
    const sources = [...video.querySelectorAll('source')]
    const types = sources.map(s => s.type)
    expect(types).toContain('video/webm')
    expect(types).toContain('video/mp4')
  })

  it('MP4 (H.264) aparece antes que WebM (decodificación por hardware)', () => {
    // H.264 se decodifica por hardware en casi todos los equipos; el VP9 del
    // WebM caía a software → thermal throttling → stutter tras un rato.
    renderLanding()
    const sources = [...document.querySelector('video').querySelectorAll('source')]
    const idx = (type) => sources.findIndex(s => s.type === type)
    expect(idx('video/mp4')).toBeLessThan(idx('video/webm'))
  })
})
