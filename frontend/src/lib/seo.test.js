import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import { RUTAS_PUBLICAS } from '@/content/seo'
import { aplicarSeo } from './seo'

const leer = (relativo) =>
  readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')

const indexHtml = leer('../../index.html')
const head = indexHtml.match(/<head>([\s\S]*)<\/head>/)[1]

const meta = (selector) => document.head.querySelector(selector).getAttribute('content')
const canonical = () => document.head.querySelector('link[rel="canonical"]').getAttribute('href')

describe('aplicarSeo', () => {
  beforeEach(() => {
    document.head.innerHTML = head
    document.title = 'Título previo'
  })

  it('pone el head propio de cada ruta pública', () => {
    aplicarSeo('/nosotros', 'bourgelat.co')

    expect(document.title).toBe(RUTAS_PUBLICAS['/nosotros'].title)
    expect(meta('meta[name="description"]')).toBe(RUTAS_PUBLICAS['/nosotros'].description)
    expect(meta('meta[property="og:title"]')).toBe(RUTAS_PUBLICAS['/nosotros'].title)
    expect(canonical()).toBe('https://bourgelat.co/nosotros')
    expect(meta('meta[name="robots"]')).toBe('index, follow')
  })

  it('no indexa el host de la app y apunta el canonical al sitio público', () => {
    aplicarSeo('/nosotros', 'app.bourgelat.co')

    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow')
    expect(canonical()).toBe('https://bourgelat.co/nosotros')
  })

  it('no indexa rutas fuera del mapa y respeta el título de su página', () => {
    aplicarSeo('/no-existe', 'bourgelat.co')

    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow')
    expect(document.title).toBe('Título previo')
  })

  it('vuelve a indexar al pasar de una ruta privada a una pública', () => {
    aplicarSeo('/login', 'bourgelat.co')
    aplicarSeo('/', 'bourgelat.co')

    expect(meta('meta[name="robots"]')).toBe('index, follow')
    expect(canonical()).toBe('https://bourgelat.co/')
  })
})

describe('coherencia del SEO estático', () => {
  it('render.yaml enruta cada página pública a su propio HTML', () => {
    const renderYaml = leer('../../../render.yaml')

    for (const ruta of Object.keys(RUTAS_PUBLICAS).filter((r) => r !== '/')) {
      expect(renderYaml).toContain(`source: ${ruta}\n        destination: ${ruta}/index.html`)
    }
  })

  it('el head no promete la facturación DIAN (llega en una versión posterior)', () => {
    expect(indexHtml).not.toMatch(/DIAN/i)
  })
})
