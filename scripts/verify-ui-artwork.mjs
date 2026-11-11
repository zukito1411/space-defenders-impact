import { existsSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Fail production builds before a Netlify deploy or signed Android release
// if the shared menu artwork was not copied from public/ into dist/.
const campaignBossAssets = JSON.parse(readFileSync('docs/campaign-boss-art-manifest.json', 'utf8')).assets
const required = [
  ...campaignBossAssets.map((asset) => asset.path.replace(/^public\//, '')),
  'assets/raid-fx/wreck-ships-v1.webp',
  'assets/raid-fx/wreck-stations-v1.webp',
  'assets/raid-fx/terrain-water-v1.webp',
  'assets/raid-fx/terrain-basalt-v1.webp',
  'assets/raid-fx/destination-worlds-v1.webp',
  'assets/raid-fx/cosmos-regions-v1.webp',
  'assets/raid-fx/cosmos-landmarks-v1.webp',
  'audio/cosmos-hull-v1.ogg',
  'assets/raid-fx/player-missiles-v1.webp',
  'assets/raid-fx/nuke-missile-v1.webp',
  'assets/ui/space-door-v1.webp',
  'assets/ui/orbital-hangar-v1.png',
  'assets/ui/console-plate-v1.png',
  'assets/raid-fx/combat-atlas-v2.png',
  'assets/raid-fx/explosion-atlas-v2.png',
  'assets/raid-fx/boss-atlas-v1.png',
  'assets/raid-fx/boss-combat-effects-v1.webp',
  'assets/raid-fx/boss-plasma-beam-v1.webp',
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
