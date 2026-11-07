import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

import { CIERRE, FAQS, HECHOS, HERO, MODULOS, NAV } from './contenido'

// Vitest corre desde frontend/.
const publico = (ruta) => resolve(process.cwd(), 'public' + ruta)

const todosLosTextos = () =>
  [
    ...HERO.titulo, HERO.frase, HERO.nota,
    ...MODULOS.flatMap((m) => [m.titulo, m.frase, m.alt]),
    HECHOS.titulo, HECHOS.proximamente, ...HECHOS.items.flatMap((h) => [h.titulo, h.texto]),
    ...FAQS.flatMap((f) => [f.pregunta, f.respuesta]),
    ...CIERRE.titulo, CIERRE.nota,
  ]

describe('contenido de la landing', () => {
  it('muestra los cuatro módulos en orden', () => {
    expect(MODULOS.map((m) => m.id)).toEqual(['agenda', 'historia', 'caja', 'inventario'])
  })

  it('cada captura existe en public/', () => {
    for (const ruta of [HERO.imagen, ...MODULOS.map((m) => m.imagen)]) {
      expect(existsSync(publico(ruta)), ruta).toBe(true)
    }
  })

  it('tiene al menos cinco preguntas frecuentes', () => {
    expect(FAQS.length).toBeGreaterThanOrEqual(5)
  })

  it('la DIAN siempre aparece como próximamente', () => {
    // Las preguntas pueden nombrarla; toda afirmación debe decir «próximamente».
    const conDian = todosLosTextos().filter((t) => /DIAN/.test(t) && !t.trim().endsWith('?'))
    expect(conDian.length).toBeGreaterThan(0)
    for (const texto of conDian) expect(texto).toMatch(/próximamente/i)
  })

  it('no publica precios', () => {
    for (const texto of todosLosTextos()) expect(texto).not.toMatch(/\$/)
  })

  it('el menú apunta a anclas de la página', () => {
    expect(NAV.map((n) => n.href)).toEqual(['#producto', '#como-funciona', '#preguntas'])
  })
})
