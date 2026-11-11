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
const { pushSquidBubble, advanceBubble } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))

const sample = { kind: 'squidBubble', x: 50, y: 55, vx: 0, vy: 8.8, hp: 340 }
const light = { ...sample }
const heavy = { ...sample }
pushSquidBubble(light, 0, -100, 1)
pushSquidBubble(heavy, 0, -60, 9)
assert.equal(light.y, sample.y)
assert.equal(light.hp, sample.hp)
assert.ok(heavy.vy < light.vy && light.vy < 0)
for (let i = 0; i < 30; i++) pushSquidBubble(heavy, 1, -1, 100)
assert.ok(Math.hypot(heavy.vx, heavy.vy) <= 22.000001)
for (const fps of [30, 60, 120]) {
  const bubble = { ...light }
  const target = { x: 50, y: 90 }
  for (let i = 0; i < Math.round(fps * .25); i++) advanceBubble(bubble, 1 / fps, target)
  assert.ok(bubble.y < sample.y - .65)
  for (let i = 0; i < fps; i++) advanceBubble(bubble, 1 / fps, target)
  assert.ok(bubble.vy > 0, 'homing should naturally resume after recoil')
}
assert.match(runtime, /if \(bubble\.hp > 0\) pushSquidBubble\(bubble, shot\.vx, shot\.vy, bubbleDamage\)/)
assert.match(runtime, /if \(bubble\.hp > 0\) pushSquidBubble\(bubble, bubble\.x - player\.x, bubble\.y - player\.y, damage\)/)
console.log('Bubble recoil: weak and heavy hits, recoil cap, homing recovery at 30/60/120 FPS, and combat wiring passed')
