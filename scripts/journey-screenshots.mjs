import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
})

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('http://127.0.0.1:4190/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1300)
    await page.screenshot({ path: `design/home-voyage-${viewport.width}.png` })
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, document.querySelector('.home-hero').getBoundingClientRect().height - 230)
    })
    await page.screenshot({ path: `design/home-showcase-wander-${viewport.width}.png` })
    console.log(viewport.width, 'errors', errors)
    await page.close()
  }
} finally {
  await browser.close()
}
