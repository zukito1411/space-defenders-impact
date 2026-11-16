import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const path = 'src/components/games/raid/'
const registrations = JSON.parse(readFileSync(path + 'bankingAnchors.json', 'utf8'))
const assets = readFileSync('src/components/games/RaidShipSprite.tsx', 'utf8') +
  readFileSync(path + 'shipArtwork.ts', 'utf8')
const expectedKeys = [...assets.matchAll(/^  (\w+): 'assets\/ships\//gm)].map(match => match[1]).filter(key => key !== 'mesiah')
assert.deepEqual(Object.keys(registrations).sort(), [...new Set(expectedKeys)].sort())

function compile(source) {
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
  return import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'))
}

const source = readFileSync(path + 'bankingArt.ts', 'utf8')
const art = await compile(`
  const anchors = ${JSON.stringify(registrations)}
  const getPublicAssetUrl = path => '/base/' + path
  const releaseCanvasSprite = () => {}
  const makeImageCanvasSprite = (cacheKey, url) => ({ cacheKey, url, loaded: !cacheKey.includes('rocket-v1') })
` + source.replace(/^import .*\n/gm, ''))
// Use the in-game indexing logic to exercise extremes, the portrait/landscape split and reduced motion.
for (const [landscape, offset] of [[false, 0], [true, 7]]) {
  assert.deepEqual([-.3, -.14, 0, .14, .3].map(bank => art.raidBankingFrameIndex(bank, landscape, false)),
    [0, 0, 3, 6, 6].map(i => i + offset))
  assert.equal(art.raidBankingFrameIndex(.14, landscape, true), 3 + offset)
}
assert.equal(art.getRaidBankingAtlasUrl('mesiah'), art.getRaidBankingAtlasUrl('mesiahBlack'))
assert.equal(art.getRaidBankingFrame('toString', 0, false, false), null)
assert.equal(art.getRaidBankingFrame('rocket', 0, false, false), null, 'keep the original sprite until the atlas loads')
assert.equal(art.getBankingProtectionHull(art.getRaidBankingAtlas('laser'), true).frame, 10)
for (const [key, entry] of Object.entries(registrations)) {
  const image = readFileSync('public/assets/ships/banking/' + key + '-v1.webp')
  assert.equal(image.toString('ascii', 0, 4), 'RIFF', key)
  assert.equal(image.toString('ascii', 8, 16), 'WEBPVP8X', key)
  assert.equal(image.readUIntLE(24, 3) + 1, art.BANKING_CELL * art.BANKING_COLUMNS, key)
  assert.equal(image.readUIntLE(27, 3) + 1, art.BANKING_CELL * art.BANKING_ROWS, key)
  assert.equal(entry.nozzles.length, 14, key)
  for (const outlets of entry.nozzles) {
    assert.ok(outlets.length > 0, key)
    for (const [x, y, aperture] of outlets) {
      assert.ok(Math.abs(x) < .5 && y >= 0 && y < .5 && aperture > 0 && aperture < .18, key)
    }
  }
  if (entry.wing) {
    assert.equal(entry.wing.length, 14, key)
    for (const tips of entry.wing) {
      assert.equal(tips.length, 4, key)
      assert.ok(tips.every(([x, y]) => Math.abs(x) < .5 && y < 0 && y > -.5), key)
    }
  }
}
const { createRaidMainShotEmitter, getRaidPlayerHullSize } = await compile(
  readFileSync(path + 'playerMuzzle.ts', 'utf8').replace(/^import .*\n/gm, '') + '\nconst WIDTH = 100, HEIGHT = 100;\n',
)
const tips = art.getRaidBankingFrame('xwingElite', .12, true, false).wing
const ship = { x: 45, y: 63 }, shots = [], bank = .12
const emit = createRaidMainShotEmitter(shot => shots.push(shot), ship, 'xwing', false, 400, 800, bank, true, 1, null, tips)
emit({ x: 50, y: 60, vx: 2, vy: -80 }, 'inner')
const size = getRaidPlayerHullSize('xwing', 400, true)
const [x, y] = tips[3]
assert.equal(shots[0].x, ship.x + (Math.cos(bank) * x - Math.sin(bank) * y) * (size * 100 / 400))
assert.equal(shots[0].y, ship.y + (Math.sin(bank) * x + Math.cos(bank) * y) * (size * 100 / 800))
assert.equal(shots[0].vy, -80)
console.log('27 banking atlases, seven banks, both views, reduced motion, fallback and cannon registration verified')
