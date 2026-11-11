import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const withoutImports = source => source.replace(/^import .*\n/gm, '')
const section = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end))
const raid = 'src/components/games/raid/'
const state = read(raid + 'state.ts')
const progression = read('src/progression.ts')
const relay = read('server/raid-relay.mjs')
const code = ts.transpileModule([
  withoutImports(read(raid + 'shipArtwork.ts')),
  'const LEGACY_FIGHTER_COUNT = 8, RAID_FIGHTER_ASSETS = [], getPublicAssetUrl = path => path;',
  section(withoutImports(read('src/components/games/RaidShipSprite.tsx')), 'export const RAID_SHIP_SPRITE_PATHS', 'export function RaidShipSprite'),
  'const getMesiahShipColor = progress => progress.color, getCoreLanderModel = progress => progress.model;',
  'const hasProgressionUnlockOverride = () => false;',
  ...progression.match(/^export const SHIP_COSMETIC_(?:SINGLE_RUN_SCORE|TOTAL_SCORE) = \d+$/gm),
  section(progression, 'export function isShipCosmeticUnlocked(', 'export function setShipCosmeticEquipped('),
  section(state, 'export function sanitizePlayerVisualShipKey(', 'export function getInitialPlayer('),
  section(state, 'export function getRaidPlayerVisualShipKey(', 'export function getPlayerCoreLanderCombatModel('),
  'export ' + section(relay, 'function cleanVisualShipKey(', 'function cleanOptionalShipKey('),
].join('\n'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText

const art = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const shipKeys = ['rocket', 'fast', 'gatling', 'laser', 'dreadnought', 'xwing', 'spaceEt', 'mesiah', 'coreLander']
for (const shipKey of shipKeys) {
  const progress = { color: 'black', model: 'coreLander', equippedCosmetics: {}, shipMastery: {} }
  const base = art.getDefaultPlayerVisualShipKey(shipKey, progress)
  const elite = art.getDefaultPlayerVisualShipKey(shipKey, progress, true)
  assert.notEqual(base, elite)
  if (shipKey !== 'coreLander') {
    for (const key of [base, elite]) {
      assert.match(art.getRaidShipSpriteUrl(key), /-remaster-v1\.webp$/)
      for (const [x, y, aperture] of art.getRaidShipNozzles(key)) {
        assert.ok(Math.abs(x) < .25 && y > .33 && y < .47 && aperture > 0 && aperture < .12)
      }
    }
  }
  assert.equal(art.getRaidShipBaseVisualKey(elite), base)
  assert.equal(art.sanitizePlayerVisualShipKey(shipKey, elite), elite)
  assert.equal(art.cleanVisualShipKey(elite, shipKey), elite)
  progress.shipMastery[shipKey] = { totalScore: art.SHIP_COSMETIC_TOTAL_SCORE - 1 }
  assert.equal(art.getDefaultPlayerVisualShipKey(shipKey, progress), base)
  progress.shipMastery[shipKey].totalScore++
  assert.equal(art.getDefaultPlayerVisualShipKey(shipKey, progress), elite)
  progress.equippedCosmetics[shipKey] = { frame: false }
  assert.equal(art.getDefaultPlayerVisualShipKey(shipKey, progress), base)
  assert.equal(art.getRaidPlayerVisualShipKey({ ship: { key: shipKey }, visualShipKey: elite }, progress), elite)
  const foreignElite = shipKey === 'rocket' ? 'fastElite' : 'rocketElite'
  assert.equal(art.sanitizePlayerVisualShipKey(shipKey, foreignElite), base)
  assert.equal(art.cleanVisualShipKey(foreignElite, shipKey), shipKey)
}
const core = { ship: { key: 'coreLander' }, visualShipKey: 'coreLanderElite', burningBlend: .99 }
assert.equal(art.getRaidPlayerVisualShipKey(core, {}), 'coreLanderBurningElite')
assert.equal(art.getRaidPlayerVisualShipKey({ ...core, visualShipKey: 'godGundam' }, {}), 'godGundam')
assert.equal(art.getRaidPlayerVisualShipKey({ ...core, visualShipKey: 'spiegel' }, {}), 'spiegel')
assert.equal(art.getDefaultPlayerVisualShipKey('mesiah', { color: 'white' }, true), 'mesiahWhiteElite')
assert.equal(art.getRaidShipBaseVisualKey('mesiahWhiteElite'), 'mesiahWhite')
assert.equal(art.cleanVisualShipKey('mesiahWhiteElite', 'mesiah'), 'mesiahWhiteElite')
assert.equal(art.cleanVisualShipKey('coreLanderBurningElite', 'coreLander'), 'coreLanderBurningElite')
for (const key of [...art.RAID_ELITE_FRAME_KEYS, ...shipKeys.filter(key => key !== 'coreLander'), 'mesiahWhite']) {
  const url = art.getRaidShipSpriteUrl(key)
  const file = readFileSync(new URL('../public/' + url, import.meta.url))
  assert.equal(file.toString('ascii', 8, 12), 'WEBP')
  assert.ok(file.length < 38_000)
  assert.equal(file.toString('ascii', 12, 16), 'VP8X')
  assert.ok(file[20] & 0x10, url + ' requires an alpha channel')
  assert.ok(art.getRaidShipNozzleY(key) > .25 && art.getRaidShipNozzleY(key) < .48)
}
assert.equal(art.getRaidShipSpriteUrl('godGundam'), 'assets/ships/god-gundam.png')
assert.equal(art.getRaidShipSpriteUrl('spiegel'), 'assets/ships/spiegel.png')
console.log('Playable art: all nine Elite Redesigns, unlock/equip handling, Mesiah paint, Core Lander burning, relay validation and asset alpha passed')
