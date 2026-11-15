import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

for (const file of ['index.html', 'scripts/presentation-fixture.html']) {
  const html = readFileSync(file, 'utf8')
  assert.match(html, /<head(?:\s[^>]*)?>[\s\S]*<\/head>/i, `${file} needs a complete head for PWA injection`)
  assert.match(html, /<body(?:\s[^>]*)?>[\s\S]*<\/body>/i, `${file} needs a complete body for service-worker injection`)
}
const html = readFileSync('dist/index.html', 'utf8')
assert.match(html, /<link[^>]+rel=["']manifest["'][^>]*>/i, 'production HTML is missing the web manifest link')
const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'))
assert.ok(manifest.name && manifest.start_url && manifest.icons.length >= 2)
for (const icon of manifest.icons) assert.ok(existsSync(join('dist', icon.src)), `missing PWA icon ${icon.src}`)
const sw = readFileSync('dist/sw.js', 'utf8')
assert.match(sw, /precacheAndRoute/, 'service worker was not populated')
assert.match(sw, /index\.html/, 'application entry is absent from offline precache')
const scripts = readdirSync('dist/assets').filter(name => name.endsWith('.js')).map(name => readFileSync(join('dist/assets', name), 'utf8')).join('\n')
assert.match(html + scripts, /serviceWorker|registerSW\.js/, 'production has no service-worker registration')
console.log('PWA: complete HTML documents, injected manifest, installed icons, populated worker and registration verified')
