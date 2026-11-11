import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = (name) => readFileSync(new URL('../src/components/games/raid/' + name, import.meta.url), 'utf8')
const runtime = read('GradiusRaidRuntime.tsx')
const start = runtime.indexOf("      if (shot.kind === 'squidBubble') {\n        shot.retargetTime")
const end = runtime.indexOf('      const beamMargin', start)
assert.ok(start >= 0 && end > start)
const code = ts.transpileModule([
  read('bubbleRecoil.ts').replace(/^import .*\n/gm, ''),
  'export function advanceBubble(shot, dt, target) { const getNearestLivingPlayerThisTick = () => target;',
  runtime.slice(start, end),
  '}',
].join('\n'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { registerSquidBubbleHit, advanceBubble } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))

const sample = { kind: 'squidBubble', x: 50, y: 55, vx: 0, vy: 8.8, hp: 340 }
const target = { x: 50, y: 90 }
const hit = (bubble, damage = 1) => registerSquidBubbleHit(bubble, 0, -100, damage)
for (const [splitLevel, requiredHits] of [[0, 8], [1, 6], [2, 4]]) {
  const bubble = { ...sample, splitLevel }
  assert.equal(hit(bubble, 0), false)
  for (let i = 1; i < requiredHits; i++) {
    assert.equal(hit(bubble, i === 1 ? 999 : 1), false, 'damage should never skip the hit count')
    assert.equal(bubble.vy, sample.vy)
  }
  assert.equal(hit(bubble), true)
  assert.equal(bubble.y, sample.y)
  assert.equal(bubble.hp, sample.hp)
  assert.ok(bubble.vy < 0 && bubble.vy >= -4.2)
  assert.equal(bubble.bubbleRecoilHits, 0)

  const recoilVY = bubble.vy
  for (let i = 0; i < 100; i++) assert.equal(hit(bubble), false, 'a single volley should only push once')
  assert.equal(bubble.bubbleRecoilHits, 0)
  assert.equal(bubble.vy, recoilVY)
  for (let i = 0; i < 60; i++) advanceBubble(bubble, 1 / 60, target)
  assert.ok(bubble.vy > 0, 'homing should resume during recovery')
  for (let i = 1; i < requiredHits; i++) assert.equal(hit(bubble), false, 'hits during recovery must not bank')
  assert.equal(hit(bubble), true)
}

for (const fps of [30, 60, 120]) {
  const bubble = { ...sample }
  const child = { ...sample, x: 3, splitLevel: 1 }
  let recoils = 0
  for (let frame = 0; frame < fps * 8; frame++) {
    for (let hitIndex = 0; hitIndex < 12; hitIndex++) {
      if (hit(bubble, 999)) recoils++
      registerSquidBubbleHit(child, -100, 0, 999)
    }
    advanceBubble(bubble, 1 / fps, target)
    advanceBubble(child, 1 / fps, { x: 8, y: 99 })
    assert.ok(child.x > -12, 'continuous side fire pushed a child out of the arena')
  }
  assert.ok(recoils >= 6 && recoils <= 8, 'full auto fire must respect the recovery time')
  assert.ok(bubble.y > sample.y + 2, 'the main bubble should still close in under full auto fire')
}
const dying = { ...sample, hp: 0, bubbleRecoilHits: 7 }
assert.equal(hit(dying), false)
assert.equal(dying.vy, sample.vy)
assert.match(runtime, /bubble\.hp = \(bubble\.hp \?\? 1\) - bubbleDamage\s+if \(registerSquidBubbleHit\(bubble, shot\.vx, shot\.vy, bubbleDamage\)\)/)
assert.match(runtime, /bubble\.hp = splitHp - damage\s+if \(registerSquidBubbleHit\(bubble, bubble\.x - player\.x, bubble\.y - player\.y, damage\)\)/)
console.log('Bubble recoil: size-based hit thresholds, volley recovery, sustained fire and homing at 30/60/120 FPS passed')
