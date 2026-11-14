import { existsSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Fail production builds before a Netlify deploy or signed Android release
// if the shared menu artwork was not copied from public/ into dist/.
const campaignBossAssets = JSON.parse(readFileSync('docs/campaign-boss-art-manifest.json', 'utf8')).assets
const required = [
  'assets/carrier/dock-clamp-atlas-v2.png',
  'assets/carrier/deck-cockpit-v1.webp',
  'assets/carrier/deck-props-v1.webp',
  'assets/carrier/deck-workers-v1.webp',
  'assets/carrier/deck-repair-v1.webp',
  'assets/carrier/deck-crew-motion-v1.webp',
  'assets/brand/zuki-logo-v1.png',
  'assets/ships/sideview/god-gundam-launch-v3.webp',
  'assets/ships/sideview/spiegel-launch-v1.webp',
  'assets/ships/sideview/god-gundam-burning-flight-v5.webp',
  'assets/ships/sideview/god-gundam-burning-two-palm-v1.webp',
  'assets/ships/sideview/god-gundam-two-palm-v1.webp',
  'assets/ships/sideview/god-gundam-burning-actions-v1.webp',
  'assets/ships/sideview/spiegel-actions-v1.webp',
  'assets/ships/sideview/god-gundam-flight-v4.webp',
  'assets/ships/sideview/god-gundam-burning-flight-v2.webp',
  'assets/ships/sideview/spiegel-flight-v2.webp',
  'assets/carrier/carrier-bay-landscape-v1.webp',
  'assets/carrier/carrier-bay-portrait-v1.webp',
  ...campaignBossAssets.map((asset) => asset.path.replace(/^public\//, '')),
  'assets/aliens/fighter-auric-artillery-v1.webp',
  'assets/aliens/fighter-cinder-interceptor-v1.webp',
  'assets/aliens/fighter-crimson-ram-v1.webp',
  'assets/aliens/fighter-jade-sensor-v1.webp',
  'assets/aliens/fighter-needle-scout-v1.webp',
  'assets/aliens/fighter-violet-gunship-v1.webp',
  'assets/ships/black-comet-elite-remaster-v1.webp',
  'assets/ships/black-comet-remaster-v1.webp',
  'assets/ships/core-lander-burning-elite.webp',
  'assets/ships/core-lander-elite.webp',
  'assets/ships/crimson-saw-elite-remaster-v1.webp',
  'assets/ships/crimson-saw-remaster-v1.webp',
  'assets/ships/crosswing-nova-elite-remaster-v1.webp',
  'assets/ships/crosswing-nova-remaster-v1.webp',
  'assets/ships/mesiah-black-elite-remaster-v1.webp',
  'assets/ships/mesiah-black-remaster-v1.webp',
  'assets/ships/mesiah-white-elite-remaster-v1.webp',
  'assets/ships/mesiah-white-remaster-v1.webp',
  'assets/ships/night-lance-elite-remaster-v1.webp',
  'assets/ships/night-lance-remaster-v1.webp',
  'assets/ships/obsidian-ark-elite-remaster-v1.webp',
  'assets/ships/obsidian-ark-remaster-v1.webp',
  'assets/ships/red-wraith-elite-remaster-v1.webp',
  'assets/ships/red-wraith-remaster-v1.webp',
  'assets/ships/space-jet-elite-remaster-v1.webp',
  'assets/ships/space-jet-remaster-v1.webp',
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
