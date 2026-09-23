// Capability probe only: a local test page, no merchant, model call, or API key.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.ROOM_BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})
try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 } })
  await page.setContent(`<!doctype html><title>Local stream capability probe</title>
    <style>body{margin:0;background:#efeddf;font:24px sans-serif}
    button{position:absolute;left:400px;top:300px;width:240px;height:80px}
    #cursor{position:fixed;pointer-events:none;width:18px;height:18px;background:#195b43;border:2px solid white;border-radius:50%;z-index:5}
    #pulse{width:60px;height:60px;background:#319869;animation:slide .7s infinite alternate linear}
    @keyframes slide{to{transform:translateX(300px)}}</style>
    <div id="pulse"></div><div id="cursor"></div><button>Test selection</button>
    <script>window.events=[];
    for(const type of ['mousemove','mousedown','mouseup','click'])addEventListener(type,e=>{
      window.events.push({type,x:e.clientX,y:e.clientY});
      document.querySelector('#cursor').style.transform='translate('+e.clientX+'px,'+e.clientY+'px)';
    });document.querySelector('button').onclick=()=>document.querySelector('button').textContent='Selected';</script>`)
  const client = await page.context().newCDPSession(page)
  let frames = 0
  let bytes = 0
  client.on('Page.screencastFrame', ({ data, sessionId }) => {
    frames++
    bytes += Buffer.byteLength(data, 'base64')
    void client.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 65, maxWidth: 1180, maxHeight: 760 })
  const started = Date.now()
  await page.waitForTimeout(500)
  const framesBeforeAction = frames
  for (let step = 1; step <= 12; step++) {
    await page.mouse.move(520 * step / 12, 340 * step / 12)
    await page.waitForTimeout(25)
  }
  await page.mouse.down()
  await page.waitForTimeout(70)
  await page.mouse.up()
  await page.waitForTimeout(500)
  const events = await page.evaluate(() => window.events)
  assert.ok(framesBeforeAction > 1, 'Frames must arrive independently of actions/model responses')
  assert.ok(frames > framesBeforeAction + 2, 'Frames must continue during movement and after click')
  assert.ok(events.filter(event => event.type === 'mousemove').length >= 12)
  assert.deepEqual(events.find(event => event.type === 'click'), { type: 'click', x: 520, y: 340 })
  assert.equal(await page.locator('button').innerText(), 'Selected')
  await client.send('Page.stopScreencast')
  await client.detach()
  console.log(JSON.stringify({
    result: 'passed', fixture: 'local synthetic page; not an IKEA or model test',
    viewport: '1180x760', elapsedMs: Date.now() - started, framesBeforeAction, frames,
    jpegBytes: bytes, pointerMoves: events.filter(event => event.type === 'mousemove').length,
    click: { x: 520, y: 340 }, modelCalls: 0,
  }, null, 2))
} finally {
  await browser.close()
}
