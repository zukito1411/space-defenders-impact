import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('../src/components/games/raid/travelMotion.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { RaidTravelMotion } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
function run(hz) {
  const motion = new RaidTravelMotion()
  motion.update(0, 0, 1, 50, 65)
  for (let i = 1; i <= hz * 6; i++) {
    const t = i / hz
    motion.update(t * 1000, t <= 2 ? 0 : t <= 4 ? 1 : 0, 1, 90, 25)
  }
  return motion
}
const baseline = run(60)
for (const hz of [30, 120, 144]) {
  const other = run(hz)
  assert.ok(Math.abs(other.far - baseline.far) < 0.00001, `far differs at ${hz}Hz`)
  assert.ok(Math.abs(other.near - baseline.near) < 0.00001, `near differs at ${hz}Hz`)
  assert.ok(Math.abs(other.x - baseline.x) < 0.00001, `parallax differs at ${hz}Hz`)
}
const motion = new RaidTravelMotion()
motion.update(1e8, 0, 1, 50, 65)
const before = motion.near
motion.update(1e8 + 16, 1, 1, 100, 100)
assert.ok(motion.near > before && motion.near - before < 4, 'rush transition teleported starfield')
const prior = motion.near
motion.update(1e8 + 60000, 1, 1, 100, 100)
assert.ok(motion.near - prior < 25, 'tab resume jumped forward')
assert.ok(Math.abs(motion.x) <= 1 && Math.abs(motion.y) <= 1, 'parallax exceeds bounds')
console.log('Travel: 30/60/120/144Hz agreement, rush continuity, resume and parallax bounds passed')
