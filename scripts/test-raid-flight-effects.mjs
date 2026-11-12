import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = file => readFileSync(new URL('../src/components/games/raid/' + file, import.meta.url), 'utf8')
const utils = read('utils.ts')
const sparkStart = utils.indexOf('export function acquireSpark(')
const sparkEnd = utils.indexOf('export function recycleRipple(', sparkStart)
const code = ts.transpileModule([
  read('flightEffects.ts'), read('combatFeel.ts'),
  'let sparkId = 0; export const sparkPool = [];', utils.slice(sparkStart, sparkEnd),
].join('\n'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { raidStereoPan, sampleCapitalFlyby, sampleDistantBattle, muzzleFlashProgress, sampleOrbitalShadow, orbitalShadowCoverage, updateFlightPose, getHullImpactDirection, acquireSpark, sparkPool } =
  await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))

assert.equal(sampleDistantBattle(0, 0), -1)
assert.equal(sampleDistantBattle(18.5, 0), .5)
assert.equal(sampleDistantBattle(21, 0), -1)
assert.equal(sampleDistantBattle(NaN, 1), -1)
assert.equal(muzzleFlashProgress(1000, 1000), 0)
assert.equal(muzzleFlashProgress(1055, 1000), .5)
assert.equal(muzzleFlashProgress(1110, 1000), -1)
assert.equal(muzzleFlashProgress(900, 1000), -1)
assert.equal(sampleCapitalFlyby(0, 3), -1)
assert.equal(sampleCapitalFlyby(11, 3), .5)
assert.equal(sampleCapitalFlyby(22, 3), -1)
assert.equal(sampleCapitalFlyby(43, 3), .5)

for (const [w, h] of [[360, 800], [800, 360], [1440, 900]]) {
  for (const side of [.35, .65]) {
    const shadow = {}
    sampleOrbitalShadow(shadow, side * w, .24 * h, Math.max(w, h) * .7, w, h, .2)
    assert.equal(orbitalShadowCoverage(shadow, shadow.x, shadow.y), 0)
    sampleOrbitalShadow(shadow, side * w, .24 * h, Math.max(w, h) * .7, w, h, .82)
    assert.equal(orbitalShadowCoverage(shadow, shadow.x, shadow.y), 1)
    assert.ok(orbitalShadowCoverage(shadow, w / 2, h * .8) > .8)
    assert.equal(orbitalShadowCoverage(shadow, w / 2, -h), 0)
    assert.equal(shadow.sunSide, side < .5 ? -1 : 1)
  }
}

for (const fps of [30, 60, 120]) {
  const step = 1000 / fps
  const pose = { time: 0, x: 50, bank: 0 }
  updateFlightPose(pose, step, 50 + 48 / fps)
  assert.ok(pose.maneuverJet > .8)
  updateFlightPose(pose, step * 2, 50)
  assert.ok(pose.maneuverJet < -.8, 'reversal must switch thrusters immediately')
  for (let n = 3; n < 3 + fps; n++) updateFlightPose(pose, step * n, 50)
  assert.ok(Math.abs(pose.maneuverJet) < .065, 'idle thrust should fade out')
}
assert.equal(getHullImpactDirection(3, 0, -5, 0), 0)
assert.equal(getHullImpactDirection(0, 0, 0, -5), Math.PI / 2)
const chip = acquireSpark(0, 0, 8, 1, .2, '#fff', 5, true)
assert.equal(chip.fragment, true)
assert.equal(chip.maxLife, .2)
sparkPool.push(chip)
const normal = acquireSpark(0, 0, 4, 1, .5, '#fff', 5)
assert.equal(normal, chip)
assert.equal(normal.fragment, undefined)
assert.equal(normal.maxLife, .9)
console.log('Flight effects: bounded flybys, eclipse coverage, responsive side jets, directional impact and spark reuse passed')


assert.equal(raidStereoPan(0,50,false),-1)
assert.equal(raidStereoPan(100,50,false),1)
assert.equal(raidStereoPan(50,100,true),-1)
assert.equal(raidStereoPan(50,0,true),1)
