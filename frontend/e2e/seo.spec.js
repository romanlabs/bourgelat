import { test, expect } from '@playwright/test'
import { RUTAS_PUBLICAS, urlCanonica } from '../src/content/seo.js'

const rutas = Object.entries(RUTAS_PUBLICAS)

test.describe('SEO — head por ruta', () => {
  // Lo que ve un crawler sin JS o una vista previa de WhatsApp: el HTML crudo.
  for (const [ruta, { title }] of rutas) {
    test(`HTML estático de ${ruta} trae su title y canonical`, async ({ request }) => {
      const archivo = ruta === '/' ? '/index.html' : `${ruta}/index.html`
      const html = await (await request.get(archivo)).text()

      expect(html).toContain(`<title>${title}</title>`)
      expect(html).toContain(`<link rel="canonical" href="${urlCanonica(ruta)}" />`)
      expect(html).toContain('og-image.png')
    })
  }

  test('los titles de las páginas públicas no se repiten', () => {
    const titles = rutas.map(([, { title }]) => title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  test('al navegar en el SPA el head sigue a la ruta', async ({ page }) => {
    await page.goto('/')
    await page.click('a[href="/planes"]')
    await page.waitForURL('**/planes')

    await expect(page).toHaveTitle(RUTAS_PUBLICAS['/planes'].title)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', urlCanonica('/planes'))
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')
  })

  test('una ruta inexistente muestra la 404 con noindex (no la landing)', async ({ page }) => {
    await page.goto('/ruta-que-no-existe')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esta página no existe.')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  })

  test('sitemap.xml lista todas las páginas públicas', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    for (const [ruta] of rutas) expect(xml).toContain(`<loc>${urlCanonica(ruta)}</loc>`)
  })
})
