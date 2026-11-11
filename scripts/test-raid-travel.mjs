import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const read = name => readFileSync(new URL('../src/components/games/raid/' + name, import.meta.url), 'utf8')
const source = read('combatFeel.ts') + '\n' + read('travelMotion.ts').replace(/^import .*\n/gm, '')
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
const steer = new RaidTravelMotion()
steer.update(0, 0, 1, 50, 65)
for (let step = 1; step <= 20; step++) steer.update(step * 16, 0, 1, 50 + step * .8, 65)
assert.ok(steer.drift > .8, 'moving right should bank the streaks away from the travel direction')
for (let step = 21; step <= 40; step++) steer.update(step * 16, 0, 1, 66 - (step - 20) * .8, 65)
assert.ok(steer.drift < -.8, 'reversing direction should reverse the streaks')
steer.update(900, 0, 1, 50, 65)
assert.equal(steer.drift, 0, 'resume should clear the visual bank')
console.log('Travel: 30/60/120/144Hz agreement, rush continuity, resume and parallax bounds passed')

const cueCode = ts.transpileModule('const HEIGHT=100,WIDTH=100,PLAYER_RADIUS=3.2;\n' +
  read('flightCues.ts').replace(/^import .*\n/gm, ''), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const cues = await import('data:text/javascript;base64,' + Buffer.from(cueCode).toString('base64'))
const pilot = { x: 50, y: 75, hp: 1, maxHp: 4 }
const shot = { x: 55.6, y: 75.6, vx: 0, vy: 30, kind: 'boss', radius: 1.5 }
assert.equal(cues.passesNearPilot(shot, pilot, .025), true)
assert.equal(cues.passesNearPilot({ ...shot, x: 53 }, pilot, .025), false, 'collision should not sound like a dodge')
assert.equal(cues.passesNearPilot({ ...shot, y: 76.4 }, pilot, .025), false, 'a flyby should trigger only once')
assert.equal(cues.passesNearPilot({ ...shot, kind: 'beam' }, pilot, .025), false)
assert.equal(cues.needsRepair(pilot), true)
assert.equal(cues.needsRepair({ ...pilot, hp: 0 }), false)
assert.equal(cues.needsRepair({ ...pilot, hp: 2 }), false)
const farAsteroid = { x: 50, y: -18, vx: 0, vy: 14, radius: 5, hp: 10 }
const incoming = { x: 48, y: -12, vx: 2, vy: 28, radius: 5, life: 2 }
assert.equal(cues.findIncomingHazard([farAsteroid], [incoming], pilot), incoming)
assert.equal(cues.findIncomingHazard([farAsteroid], [{ ...incoming, x: 4 }], pilot), undefined)
assert.equal(cues.findIncomingHazard([], [{ ...incoming, y: 12 }], pilot), undefined)
assert.equal(cues.findIncomingHazard([], [{ ...incoming, life: 0 }], pilot), undefined)
console.log('Flight cues: close-pass detection, repair thresholds, and nearest offscreen hazard passed')

const mechanics = read('mechanics.ts')
const clearStart = mechanics.indexOf('export function animateStageClearPlayer(')
const clearSource = 'const clamp = (value, min, max) => Math.max(min, Math.min(max, value));\n' +
  mechanics.slice(clearStart, mechanics.indexOf('export function movePlayerWithInput(', clearStart))
const clearCode = ts.transpileModule(clearSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { animateStageClearPlayer } = await import('data:text/javascript;base64,' + Buffer.from(clearCode).toString('base64'))
const idle = { x: 50, y: 80, invuln: 0 }
const steering = { ...idle }
animateStageClearPlayer(idle, .1, 50)
animateStageClearPlayer(steering, .1, 50, {x: 96, y: 80})
assert.ok(steering.x > idle.x && steering.x < 61)
assert.equal(steering.y, idle.y, 'lateral steering should preserve departure timing')
animateStageClearPlayer(steering, .1, 50, null, new Set(['arrowleft']))
assert.ok(steering.x < 50)
console.log('Departure: keyboard and pointer steering preserve forward flight')
