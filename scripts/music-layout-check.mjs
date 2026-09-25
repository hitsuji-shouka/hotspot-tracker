import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
try {
  for (const width of [1440, 800, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
    await page.goto('http://127.0.0.1:4190/shelf', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: '音乐' }).click()
    await page.waitForTimeout(260)
    const covers = page.locator('.shelf-grid article > div:first-child')
    const featured = await covers.nth(0).boundingBox()
    const album = await covers.nth(1).boundingBox()
    assert.ok(featured && album)
    assert.ok(Math.abs(featured.height - album.height) < 15, `featured video and album covers differ at ${width}px`)
    assert.equal(await page.locator('.shelf-card-featured').count(), 1)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: `design/shelf-music-${width}.png` })
    await page.close()
  }
  console.log('Featured music video aligns with album covers at 1440, 800, and 390px.')
} finally { await browser.close() }
