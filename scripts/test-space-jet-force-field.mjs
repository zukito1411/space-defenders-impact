import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = name => readFileSync(new URL('../src/components/games/raid/' + name, import.meta.url), 'utf8').replace(/^import[^\r\n]*\r?\n/gm, '')
const geometry = read('protectionGeometry.ts')
const load = async source => import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64'))
const { hullDistanceField, protectionContour } = await load(geometry)
const alpha = new Uint8ClampedArray(256 * 256 * 4)
// A narrow nose and swept wings expose excess nose clearance and ellipse regressions.
for (let y = 42; y < 214; y++) {
  const halfWidth = y < 120 ? 3 + (y - 42) * .13 : y < 174 ? 14 + (y - 120) * .75 : 54 - (y - 174) * .55
  for (let x = Math.ceil(128 - halfWidth); x <= 128 + halfWidth; x++) alpha[(y * 256 + x) * 4 + 3] = 255
}
const distance = hullDistanceField(alpha, 256, 256)
const path = protectionContour(distance, 256, 256, 7)
const noseY = path.points[path.nose * 2 + 1] + 128
assert.ok(noseY >= 34 && noseY <= 36, 'field must stay within eight normalized pixels of the nose')
assert.ok(Math.max(...path.points.filter((_, i) => i % 2 === 0)) > 52, 'field must enclose the swept wing tips')
assert.ok(Math.max(...path.points.filter((_, i) => i % 2 === 0 && path.points[i + 1] < -40)) < 20,
  'nose region must follow the narrow hull instead of a bounding ellipse')
for (let i = 0; i < 256; i++) {
  const next = (i + 1) % 256
  assert.ok(Math.hypot(path.points[next * 2] - path.points[i * 2], path.points[next * 2 + 1] - path.points[i * 2 + 1]) < 5,
    'traveling energy path contains a discontinuity')
}
let allocations = 0, reads = 0
function context() {
  const stack = []
  return {
    globalAlpha: 1, depth: 0, images: [], lines: [],
    save() { this.depth++; stack.push(this.globalAlpha) }, restore() { this.depth--; this.globalAlpha = stack.pop() },
    translate() {}, rotate() {}, scale() {}, fillRect() {},
    drawImage(...args) { this.images.push({ args, alpha: this.globalAlpha }) },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) } },
    getImageData() { reads++; return { data: alpha } }, putImageData() {},
    beginPath() {}, closePath() {}, moveTo(...args) { this.lines.push(args) }, lineTo(...args) { this.lines.push(args) }, stroke() {}, fill() {},
  }
}
globalThis.document = { createElement() {
  allocations++
  const ctx = context()
  return { width: 0, height: 0, getContext: () => ctx }
} }
const renderer = await load('const getCanvasSpriteDimensions = sprite => ({source: sprite, width: 192, height: 192});\n' + geometry + '\n' + read('shipProtection.ts'))
const hull = { sprite: { cacheKey: 'test-jet', loaded: true } }
try {
  const draw = (field, shield, time = 0, reduced = false) => {
    const ctx = context()
    renderer.drawShipProtection(ctx, 0, 0, 100, time, field, shield, hull, reduced, 3)
    assert.equal(ctx.depth, 0, 'protection draw leaked a Canvas transform')
    return ctx
  }
  assert.equal(draw(0, 0).images.length, 0)
  assert.equal(allocations, 0, 'inactive protection must not allocate')
  const force = draw(1, 0), shield = draw(0, 1), combined = draw(1, 1)
  assert.equal(force.images.length, 1, 'force field should draw one cached shell')
  assert.notEqual(force.images[0].args[0], shield.images[0].args[0], 'shield needs its own armor appearance')
  assert.notEqual(force.images[0].args[0], combined.images[0].args[0], 'combined protection needs dedicated art')
  assert.notEqual(shield.images[0].args[0], combined.images[0].args[0], 'combined state must not duplicate the shield')
  assert.ok(draw(1/3, 0).images[0].alpha < force.images[0].alpha, 'depleted force field should dim')
  assert.notDeepEqual(force.lines, draw(1, 0, 700).lines, 'rim sweeps must follow the hull contour')
  assert.deepEqual(draw(1, 1, 0, true).lines, draw(1, 1, 700, true).lines, 'reduced motion should freeze the energy sweep')
  const warmAllocations = allocations, warmReads = reads
  for (let frame = 0; frame < 180; frame++) draw(frame % 3 ? 1 : 0, frame % 2 ? 1 : 0, frame * 16)
  assert.equal(allocations, warmAllocations, 'flight must not allocate new field textures')
  assert.equal(reads, warmReads, 'flight must not reread ship pixels')
  renderer.warmShipProtection({ sprite: { cacheKey: 'test-elite', loaded: true }, contain: true, rotation: -Math.PI / 2 })
  assert.ok(reads > warmReads, 'different hull artwork needs its own registered outline')
  console.log('Protection: tight nose, swept wings, continuous contours, three distinct states, reduced motion and cached pixel geometry passed')
} finally { delete globalThis.document }
