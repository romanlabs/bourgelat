import { test, expect } from '@playwright/test'

test.describe('Landing page — integración', () => {
  test('hero video carga y arranca autoplay', async ({ page }) => {
    await page.goto('/')
    const video = page.locator('section video').first()
    await expect(video).toBeVisible()
    await page.waitForTimeout(2000)
    const playing = await video.evaluate(v => !v.paused && v.currentTime > 0)
    expect(playing).toBe(true)
  })

  test('CLS del hero es < 0.1', async ({ page }) => {
    await page.goto('/')
    const cls = await page.evaluate(() =>
      new Promise(resolve => {
        let total = 0
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            if (!e.hadRecentInput) total += e.value
          }
        }).observe({ type: 'layout-shift', buffered: true })
        setTimeout(() => resolve(total), 3000)
      })
    )
    expect(cls).toBeLessThan(0.1)
  })

  // #contacto ya no usa el canvas de DogTug: cierra con la imagen del perro que
  // se despide (desde md; en movil se oculta para no competir con los CTAs).
  test('el perro de despedida se ve en #contacto', async ({ page }) => {
    await page.goto('/')
    await page.locator('#contacto').scrollIntoViewIfNeeded()
    const perro = page.locator('#contacto img.contact-dog')
    await expect(perro).toBeVisible()
    await expect.poll(() => perro.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true)
  })
})
