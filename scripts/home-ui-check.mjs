import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright-core'

const origin = process.env.HOME_CHECK_URL || 'http://127.0.0.1:3000'
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
})

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(origin, { waitUntil: 'domcontentloaded' })
  await page.locator('.home-journey-canvas canvas').waitFor()
  assert.equal(await page.locator('#resume').count(), 0)
  assert.equal(await page.locator('#projects').count(), 0)
  assert.equal(await page.getByText('教育经历').count(), 0)
  assert.equal(await page.getByText('科研论文').count(), 0)
  assert.equal(await page.getByRole('heading', { name: /喜欢探究技术.*喜欢感受故事/ }).count(), 1)
  assert.equal(await page.locator('.home-intro-copy p').count(), 2)
  assert.equal(await page.locator('.home-profile').count(), 0)

  const canvas = page.locator('.home-journey-canvas canvas')
  const first = createHash('sha256').update(await canvas.screenshot()).digest('hex')
  await page.waitForTimeout(600)
  const second = createHash('sha256').update(await canvas.screenshot()).digest('hex')
  assert.notEqual(first, second, '3D scene should animate')
  assert.equal(await page.locator('.home-space-art').count(), 1)
  assert.equal(await page.locator('.home-route, .sticker-controls').count(), 0)

  for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.goto(origin, { waitUntil: 'domcontentloaded' })
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      heroBottom: document.querySelector('.home-hero').getBoundingClientRect().bottom,
      introBottom: document.querySelector('.home-intro-copy').getBoundingClientRect().bottom,
      artwork: getComputedStyle(document.querySelector('.home-space-art')).backgroundImage,
      width: innerWidth, height: innerHeight,
    }))
    assert.ok(metrics.scrollWidth <= metrics.width, `home overflows horizontally at ${viewport.width}px`)
    assert.ok(metrics.introBottom <= metrics.heroBottom - 8, `intro is clipped at ${viewport.width}px`)
    assert.match(metrics.artwork, /home-earth-blackhole-(mobile|desktop)\.webp/)
  }
  assert.deepEqual(errors, [])
  console.log('Homepage artwork, responsive layout, and moving 3D spacecraft passed.')
} finally {
  await browser.close()
}
