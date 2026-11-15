import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { readFileSync, mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'

// includeAssets can repeat icon URLs already found by Workbox's glob.
const expected = new Set([...readFileSync('dist/sw.js', 'utf8').matchAll(/url:"([^"]+)"/g)].map(match => match[1])).size
assert.ok(expected > 0, 'Build the production service worker before running this check')
const port = 5184, base = `http://localhost:${port}`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
let browser
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break } catch { /* Server starting. */ }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } })
  const page = await context.newPage()
  // Install without racing the game's own media decoding. The worker still
  // fetches the unchanged production index and every real production asset.
  await page.route('**/pwa-probe', route => route.fulfill({ contentType: 'text/html',
    body: '<!doctype html><html><head><title>Offline check</title></head><body>Installing production assets</body></html>' }))
  await page.goto(`${base}/pwa-probe`)
  await page.evaluate(() => navigator.serviceWorker.register('/sw.js'))
  let cached = 0
  for (let attempt = 0; attempt < 1200; attempt++) {
    cached = await page.evaluate(async () => {
      const key = (await caches.keys()).find(name => name.includes('precache'))
      return key ? (await (await caches.open(key)).keys()).length : 0
    })
    if (cached >= expected) break
    await page.waitForTimeout(100)
  }
  assert.ok(cached >= expected, `Production install incomplete: ${cached}/${expected} files`)
  await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated', {}, { timeout: 30000 })
  await context.setOffline(true)
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
  await page.locator('#startup-splash').waitFor({ state: 'detached', timeout: 30000 })
  assert.equal(await page.locator('link[rel="manifest"]').count(), 1)
  assert.ok(await page.getByRole('button', { name: /Air Raid|Ship Defense/ }).count() > 0)
  mkdirSync('presentation-review', { recursive: true })
  await page.screenshot({ path: 'presentation-review/pwa-offline.png' })
  console.log(`PWA: ${cached} production cache entries, activated service worker and offline menu passed`)
} finally {
  await browser?.close()
  server.kill()
}
