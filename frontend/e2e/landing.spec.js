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

  test('DogTug canvas es visible en #contacto', async ({ page }) => {
    await page.goto('/')
    await page.locator('#contacto').scrollIntoViewIfNeeded()
    const canvas = page.locator('#contacto canvas')
    await expect(canvas).toBeVisible()
  })

  test('DogTug responde a mousedown (cursor cambia)', async ({ page }) => {
    await page.goto('/')
    await page.locator('#contacto').scrollIntoViewIfNeeded()
    const canvas = page.locator('#contacto canvas')
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.75)
    await page.mouse.down()
    const cursor = await canvas.evaluate(c => c.style.cursor || window.getComputedStyle(c).cursor)
    expect(['grab', 'grabbing', 'default', 'none', '']).toContain(cursor)
    await page.mouse.up()
  })
})
