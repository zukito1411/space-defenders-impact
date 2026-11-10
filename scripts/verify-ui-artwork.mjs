import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Fail production builds before a Netlify deploy or signed Android release
// if the shared menu artwork was not copied from public/ into dist/.
const required = [
  'assets/ui/orbital-hangar-v1.png',
  'assets/ui/console-plate-v1.png',
  'assets/raid-fx/combat-atlas-v2.png',
  'assets/raid-fx/explosion-atlas-v2.png',
]

for (const asset of required) {
  const source = join('public', asset)
  const destination = join('dist', asset)
  if (!existsSync(source) || !existsSync(destination)) {
    throw new Error(`Missing production asset: ${asset} (source: ${existsSync(source)}, dist: ${existsSync(destination)})`)
  }
  const expected = statSync(source).size
  const actual = statSync(destination).size
  if (actual !== expected || actual === 0) {
    throw new Error(`Production asset corrupted: ${asset} (expected ${expected} bytes, found ${actual})`)
  }
  console.log(`Verified production art: ${asset} (${actual} bytes)`)
}

console.log('All shared UI and raid artwork assets are present in dist.')
