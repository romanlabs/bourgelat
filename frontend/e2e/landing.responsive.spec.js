import { test, expect } from '@playwright/test'

// La landing en la matriz de dispositivos que usan las clinicas: telefonos
// pequenos y comunes, telefono en horizontal, tablet vertical, portatil pequeno
// y escritorio. Cada caso revisa lo que ya se rompio alguna vez: scroll
// horizontal, CTAs inalcanzables, textos cortados y decoraciones (perros, boton
// de WhatsApp) encima de titulos o botones.

const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1536, height: 864 },
]

// Zona del perro dentro del cuadro del video del hero, en fracciones del frame
// (medida sobre perroHero-poster.webp, 3:2). Se toma hacia adentro porque el
// perro se mueve y el borde de su pelaje se funde con el fondo.
const PERRO_HERO = { x0: 0.31, x1: 0.63, y0: 0.16, y1: 0.93 }

// Donde el velo crema del hero (data-velo) ya deja ver el video: a la izquierda
// de este punto el perro esta desvanecido a proposito y el texto puede pasar.
const VELO_TRANSPARENTE = 0.5

// Recorre la pagina con scroll real para que las animaciones de entrada
// (IntersectionObserver) terminen, y en cada parada ejecuta `alPaso`.
async function recorrer(page, alPaso) {
  const { height } = page.viewportSize()
  const total = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < total; y += Math.round(height / 2)) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(1000)
    await alPaso(y)
  }
}

// Cruces entre decoraciones y contenido en lo que se ve en pantalla. Titulos y
// parrafos se miden por sus lineas de texto (un h2 centrado ocupa todo el
// ancho, pero su texto no); botones y enlaces por su caja, que es el area tactil.
function buscarSuperposiciones({ perroHero, veloTransparente }) {
  const vw = window.innerWidth
  const vh = window.innerHeight

  const esVisible = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false
    }
    return true
  }
  const enPantalla = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw

  // Los PNG de los perros traen mucho margen transparente: se usa la caja de
  // los pixeles opacos (alfa > 40), llevada al tamano con que se pinta la imagen.
  window.__cajaOpaca ??= new Map()
  const cajaOpaca = (img) => {
    let f = window.__cajaOpaca.get(img.currentSrc)
    if (!f) {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let x0 = canvas.width, x1 = 0, y0 = canvas.height, y1 = 0
      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          if (data[(y * canvas.width + x) * 4 + 3] > 40) {
            if (x < x0) x0 = x
            if (x > x1) x1 = x
            if (y < y0) y0 = y
            if (y > y1) y1 = y
          }
        }
      }
      f = { x0: x0 / canvas.width, x1: x1 / canvas.width, y0: y0 / canvas.height, y1: y1 / canvas.height }
      window.__cajaOpaca.set(img.currentSrc, f)
    }
    const r = img.getBoundingClientRect()
    return {
      left: r.left + r.width * f.x0,
      right: r.left + r.width * f.x1,
      top: r.top + r.height * f.y0,
      bottom: r.top + r.height * f.y1,
    }
  }

  const decoraciones = []
  for (const sel of ['.flow-dog', '.flow-dog-medic', '.contact-dog']) {
    const el = document.querySelector(sel)
    if (el && el.complete && el.naturalWidth && esVisible(el)) decoraciones.push({ nombre: sel, caja: cajaOpaca(el) })
  }
  const fab = document.querySelector('a[aria-label="Escríbenos por WhatsApp"]')

  const video = document.querySelector('#hero video')
  if (video && video.videoWidth) {
    // Rectangulo real del cuadro con object-fit: contain y su object-position.
    const r = video.getBoundingClientRect()
    const escala = Math.min(r.width / video.videoWidth, r.height / video.videoHeight)
    const ancho = video.videoWidth * escala
    const alto = video.videoHeight * escala
    const [px, py] = getComputedStyle(video).objectPosition
      .split(' ')
      .map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5))
    const x = r.left + (r.width - ancho) * px
    const y = r.top + (r.height - alto) * py
    const velo = document.querySelector('#hero [data-velo]')
    const inicioVisible = velo && esVisible(velo) ? vw * veloTransparente : -Infinity
    decoraciones.push({
      nombre: 'perro del hero',
      caja: {
        left: Math.max(x + ancho * perroHero.x0, inicioVisible),
        right: x + ancho * perroHero.x1,
        top: y + alto * perroHero.y0,
        bottom: y + alto * perroHero.y1,
      },
    })
  }

  const contenido = []
  for (const el of document.querySelectorAll('h1, h2, h3, p, a, button')) {
    if (el.closest('header, a[aria-label="Escríbenos por WhatsApp"], .flow-slide__num, [aria-hidden="true"]')) continue
    if (!esVisible(el)) continue
    const texto = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')
    if (!texto) continue
    let cajas
    if (el.matches('a, button')) {
      cajas = [el.getBoundingClientRect()]
    } else {
      if (el.closest('a, button')) continue
      const rango = document.createRange()
      rango.selectNodeContents(el)
      cajas = [...rango.getClientRects()].filter((q) => q.width > 2 && q.height > 2)
    }
    cajas = cajas.filter(enPantalla)
    if (cajas.length) contenido.push({ el, texto: texto.slice(0, 40), cajas })
  }

  const hallazgos = []

  // El boton flotante siempre pasa sobre algun texto al hacer scroll; lo que no
  // puede es tapar un boton o enlace (el toque caeria en WhatsApp).
  if (fab && esVisible(fab)) {
    const f = fab.getBoundingClientRect()
    for (const c of contenido) {
      if (!c.el.matches('a, button')) continue
      const r = c.cajas[0]
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      if (cx > f.left && cx < f.right && cy > f.top && cy < f.bottom) {
        hallazgos.push(`FAB WhatsApp tapa ${c.el.tagName.toLowerCase()} "${c.texto}"`)
      }
    }
  }

  for (const d of decoraciones) {
    for (const c of contenido) {
      for (const q of c.cajas) {
        const ix = Math.min(q.right, d.caja.right) - Math.max(q.left, d.caja.left)
        const iy = Math.min(q.bottom, d.caja.bottom) - Math.max(q.top, d.caja.top)
        if (ix > 8 && iy > 8 && ix * iy > 150) {
          hallazgos.push(`${d.nombre} sobre ${c.el.tagName.toLowerCase()} "${c.texto}"`)
          break
        }
      }
    }
  }
  return hallazgos
}

for (const viewport of VIEWPORTS) {
  test.describe(`Landing ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport })

    test.beforeEach(async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' })
    })

    test('sin scroll horizontal', async ({ page }) => {
      const ancho = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(ancho).toBe(viewport.width)
    })

    test('el boton de WhatsApp no aparece sobre el hero ni sobre Contacto', async ({ page }) => {
      // Por selector y no por rol: oculto lleva aria-hidden y el rol no lo encuentra.
      const fab = page.locator('a[aria-label="Escríbenos por WhatsApp"]')
      await page.waitForTimeout(800)
      await expect(fab).toHaveCSS('opacity', '0')
      await page.evaluate(() => window.scrollTo(0, document.getElementById('contacto').offsetTop))
      await page.waitForTimeout(800)
      await expect(fab).toHaveCSS('opacity', '0')
    })

    test('los CTAs del hero se ven completos y se pueden tocar', async ({ page }) => {
      await page.waitForTimeout(800)
      const problemas = await page.evaluate(() =>
        [...document.querySelectorAll('#hero a, #hero button')].flatMap((el) => {
          const r = el.getBoundingClientRect()
          const nombre = el.innerText.trim()
          if (r.top < 0 || r.bottom > window.innerHeight) return [`"${nombre}" fuera de la pantalla (bottom ${Math.round(r.bottom)})`]
          const encima = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return el.contains(encima) ? [] : [`"${nombre}" tapado por ${encima?.tagName.toLowerCase()}`]
        })
      )
      expect(problemas).toEqual([])
    })

    test('el titulo del TrustBar no se sale de la pantalla', async ({ page }) => {
      const titulo = page.getByRole('heading', { name: /Infraestructura seria/ })
      // Solo scroll vertical, como el usuario: scrollIntoView tambien desplaza en
      // horizontal el contenedor con overflow-hidden y esconde el corte.
      await titulo.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 200))
      // Los logos del marquee son los que ensanchan (o no) la columna del grid.
      await page.waitForFunction(() =>
        [...document.querySelectorAll('.trust-marquee img')]
          .filter((img) => img.offsetParent !== null)
          .every((img) => img.complete && img.naturalWidth > 0)
      )
      await page.waitForTimeout(1000)
      const caja = await titulo.evaluate((el) => {
        const rango = document.createRange()
        rango.selectNodeContents(el)
        const lineas = [...rango.getClientRects()]
        return { left: Math.min(...lineas.map((l) => l.left)), right: Math.max(...lineas.map((l) => l.right)) }
      })
      expect(caja.left).toBeGreaterThanOrEqual(0)
      expect(caja.right).toBeLessThanOrEqual(viewport.width)
    })

    test('los enlaces del footer tienen area tactil suficiente', async ({ page }) => {
      test.skip(viewport.width >= 1024, 'Con mouse no aplica el minimo tactil')
      const bajos = await page.evaluate(() =>
        [...document.querySelectorAll('footer a, footer button')]
          .filter((el) => el.getBoundingClientRect().height < 40)
          .map((el) => `${(el.innerText || el.getAttribute('aria-label')).trim()} (${Math.round(el.getBoundingClientRect().height)}px)`)
      )
      expect(bajos).toEqual([])
    })

    test('ninguna decoracion tapa titulos ni botones', async ({ page }) => {
      test.setTimeout(180000)
      // Cada cruce se reporta una vez, con el primer scroll en que aparece.
      const hallazgos = new Map()
      await recorrer(page, async (y) => {
        const encontrados = await page.evaluate(buscarSuperposiciones, {
          perroHero: PERRO_HERO,
          veloTransparente: VELO_TRANSPARENTE,
        })
        for (const h of encontrados) if (!hallazgos.has(h)) hallazgos.set(h, y)
      })
      expect([...hallazgos].map(([h, y]) => `${h} (scroll ${y})`)).toEqual([])
    })
  })
}
