import { test, expect } from '@playwright/test'

test.describe('Core Web Vitals', () => {
  test('LCP < 2500 ms', async ({ page }) => {
    await page.goto('/')
    const lcp = await page.evaluate(() =>
      new Promise(resolve => {
        new PerformanceObserver(list => {
          const entries = list.getEntries()
          resolve(entries[entries.length - 1].startTime)
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        setTimeout(() => resolve(Infinity), 8000)
      })
    )
    expect(lcp).toBeLessThan(2500)
  })

  test('hero tiene poster para evitar pantalla negra (CLS implícito)', async ({ page }) => {
    await page.goto('/')
    const poster = await page.locator('section video').first().getAttribute('poster')
    expect(poster).toBeTruthy()
    expect(poster).toMatch(/\.webp$/)
  })
})
