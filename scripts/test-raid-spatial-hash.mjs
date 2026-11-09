import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Load the same source module the game builds, without a duplicate test-only
// implementation. This module has no runtime imports.
const source = readFileSync(new URL('../src/components/games/raid/spatialHash.ts', import.meta.url), 'utf8')
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { createRaidSpatialHash, clearRaidSpatialHash, insertRaidSpatialHash, queryRaidSpatialHash } =
  await import('data:text/javascript;base64,' + Buffer.from(transpiled).toString('base64'))

const grid = createRaidSpatialHash()
const boundary = { id: 1, x: 20, y: 30 }
const large = { id: 2, x: 50, y: 50 }
insertRaidSpatialHash(grid, boundary, 3)
insertRaidSpatialHash(grid, large, 24, 16)
assert.ok(queryRaidSpatialHash(grid, 24, 30, 2).some((item) => item.id === 1), 'boundary collision omitted')
assert.equal(queryRaidSpatialHash(grid, 72, 60, 2).filter((item) => item.id === 2).length, 1, 'multi-cell duplicate')
assert.equal(queryRaidSpatialHash(grid, 1, 1, 1).length, 0, 'distant object was not culled')
clearRaidSpatialHash(grid)
assert.equal(queryRaidSpatialHash(grid, 20, 30, 1).length, 0, 'stale object after reset')

let seed = 123456789
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 4294967296
}
for (let trial = 0; trial < 250; trial++) {
  clearRaidSpatialHash(grid)
  const shapes = []
  for (let index = 0; index < 75; index++) {
    const item = { id: index + 1, x: -12 + random() * 124, y: -12 + random() * 124,
      rx: 1 + random() * 18, ry: 1 + random() * 20 }
    shapes.push(item)
    insertRaidSpatialHash(grid, item, item.rx, item.ry)
  }
  const x = -15 + random() * 130
  const y = -15 + random() * 130
  const radius = 0.5 + random() * 8
  const candidates = queryRaidSpatialHash(grid, x, y, radius)
  const ids = new Set(candidates.map((item) => item.id))
  assert.equal(ids.size, candidates.length, 'duplicate candidate')
  for (const shape of shapes) {
    if (Math.abs(shape.x - x) <= shape.rx + radius &&
        Math.abs(shape.y - y) <= shape.ry + radius) {
      assert.ok(ids.has(shape.id), 'missed valid broad-phase contact')
    }
  }
}
console.log('Air Raid spatial hash: 250 randomized broad-phase trials passed')
