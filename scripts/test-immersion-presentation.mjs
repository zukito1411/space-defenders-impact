import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'

function load(file, imports = {}, globals = {}) {
  const exports = {}
  const source = ts.transpileModule(readFileSync(`src/components/games/${file}`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, { exports, require: name => {
    assert.ok(name in imports, `Unmocked dependency ${name}`)
    return imports[name]
  }, console, ...globals }, { filename: file })
  return exports
}
const manifest = JSON.parse(readFileSync('public/audio/immersion/manifest.json', 'utf8'))
assert.equal(manifest.files.length, 44)
for (const entry of manifest.files) {
  const bytes = readFileSync(`public/${entry.file}`)
  assert.equal(bytes.subarray(0, 4).toString(), 'OggS')
  assert.equal(bytes.length, entry.bytes)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256)
  assert.ok(entry.peak < .7 && entry.rms > .0001 && entry.seconds > .1)
  assert.ok(entry.sources.length)
}
const mix = { master: 1, bgm: 1, player: 1, explosion: 1, beam: 1, impact: 1, ui: 1 }
let enabled = true, now = 10000
const window = new EventTarget(), document = new EventTarget()
document.hidden = false
const sources = [], gains = [], media = []
class Param { value = 0; setTargetAtTime(value) { this.value = value } }
class Node { connect() {} disconnect() {} }
class Source extends Node {
  playbackRate = new Param(); stopped = false
  connect(node) { this.output = node }
  start() { this.started = true }
  stop(at) { this.stopped = true; if (!at) this.onended?.() }
}
class Context {
  state = 'running'; currentTime = 0; destination = {}
  createDynamicsCompressor() { return Object.assign(new Node(), Object.fromEntries(['threshold','knee','ratio','attack','release'].map(key => [key,new Param()]))) }
  createGain() { const node = Object.assign(new Node(), { gain: new Param() }); gains.push(node); return node }
  createStereoPanner() { return Object.assign(new Node(), { pan: new Param() }) }
  createBufferSource() { const source = new Source(); sources.push(source); return source }
  decodeAudioData() { return Promise.resolve({ length: 32000, numberOfChannels: 1 }) }
  resume() { return Promise.resolve() }
}
window.AudioContext = Context
class Audio {
  paused = true; readyState = 1; currentTime = 0; volume = 0; playbackRate = 1
  constructor() { media.push(this) }
  play() { this.paused = false; return new Promise(resolve => { this.resolvePlay = resolve }) }
  pause() { this.paused = true }
  removeAttribute() {} load() {}
}
const sound = { getGameAudioMixSettings: () => mix, getGameSoundEnabled: () => enabled }
const assets = load('presentationAssets.ts', { './sound': { getPublicAssetUrl: path => '/' + path } })
let deferred
const flush = async () => { for (let n = 0; n < 12; n++) await Promise.resolve() }
const audio = load('presentationAudio.ts', { './sound': sound, './presentationAssets': assets }, {
  window, document, Audio, performance: { now: () => now },
  fetch: url => url.includes('combined-break') ? new Promise(resolve => { deferred = resolve })
    : Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)) }),
})
const a = new audio.SampleScene(), b = new audio.SampleScene()
for (let n = 0; n < 16; n++) a.play('fighter-death', .4, 0, 'explosion', 1, 0, 0)
await flush()
assert.equal(sources.filter(source => source.started && !source.stopped).length, 12, 'one-shot pool exceeded its budget')
b.play('field-break', .5, 0, 'impact', 4, 0, 0)
await flush()
assert.equal(sources.filter(source => source.started && !source.stopped).length, 12, 'priority preemption exceeded the pool')
enabled = false
window.dispatchEvent(new Event('game-audio-settings'))
assert.ok(sources.filter(source => source.started && !source.stopped).every(source => source.output.gain.value === 0), 'mute must silence existing voices immediately')
enabled = true
a.stop(); b.stop()
assert.equal(sources.filter(source => source.started && !source.stopped).length, 0)
a.play('combined-break', .4, 0, 'impact', 2, 0, 0)
a.stop()
deferred({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)) })
await flush()
assert.equal(sources.filter(source => source.started && !source.stopped).length, 0, 'late decode resurrected a stopped scene')
a.loop('engine', 'engine-fast', .3)
await flush()
a.loop('engine', 'engine-laser', .3)
await flush()
a.stop()
assert.equal(sources.filter(source => source.started && !source.stopped).length, 0, 'crossfade voices survived teardown')
const score = new audio.AdaptiveScore()
const original = { paused: false, currentTime: 23.5, playbackRate: 1 }
score.update(original, '/audio/bgm_scifi_loop.ogg', 1, true)
const stem = media.at(-1)
assert.equal(stem.currentTime, original.currentTime, 'stem did not align with source score')
score.update(original, '/audio/bgm_scifi_loop.ogg', 0, false)
stem.resolvePlay(); await flush()
assert.equal(stem.paused, true, 'late play completion resurrected a paused score')
score.stop()

const cues = []
let fullStops = 0
class Sounds { play(...args) { cues.push(args) } loop() {} stop() { fullStops++ } stopLoops() {} }
class Score { update() {} stop() {} }
const fakeAudio = { SampleScene: Sounds, AdaptiveScore: Score, warmImmersionAudio() {} }
const condition = load('raid/playerCondition.ts', {
  './combatArt': { COMBAT_TILE: {}, getRaidCombatFrame: () => null },
  './shipProtection': { warmShipProtection: () => ({ fieldPath: { points: Float32Array.from({ length: 512 }, (_, i) => Math[i % 2 ? 'sin' : 'cos'](Math.floor(i/2)/256*Math.PI*2)*90) },
    shieldPath: { points: new Float32Array(512) }, repair: {} }) },
})
const player = { x: 50, y: 50, hp: 10, maxHp: 10 }
condition.recordPlayerFeedback(player, 'field-hit', { x: 100, y: 50 })
assert.equal(player.feedback.dx, 1)
assert.equal(condition.validPlayerFeedback({ serial: 5, kind: 'not-an-event', dx: 1, dy: 0 }), false)
// Execute the actual damage callback: presentation must preserve absorption and invulnerability.
const runtimeText = readFileSync('src/components/games/raid/GradiusRaidRuntime.tsx', 'utf8')
const runtimeAst = ts.createSourceFile('runtime.tsx', runtimeText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let damageArrow
function findDamage(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(runtimeAst) === 'damagePlayer') damageArrow = node.initializer.arguments[0]
  ts.forEachChild(node, findDamage)
}
findDamage(runtimeAst)
assert.ok(damageArrow)
const damageSource = ts.transpileModule('const damage = ' + damageArrow.getText(runtimeAst), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const damageContext = { enemyDamageMultRef: { current: 1 }, scenePresentation: { playerEvent: condition.recordPlayerFeedback },
  spawnSparks() {}, addRipple() {}, triggerScreenShake() {}, needsRepair: () => false, playGameSound() {} }
vm.createContext(damageContext)
vm.runInContext(damageSource + '\nglobalThis.damagePlayer = damage', damageContext)
for (const [field, shield, expected, remaining] of [[3,0,'field-hit',2],[1,0,'field-break',0],[3,8,'combined-hit',2],[1,8,'combined-break',0],[0,3,'shield-hit',0],[0,1,'shield-break',0],[0,0,'hull-hit',0]]) {
  const target = { x: 10, y: 10, forceField: field, shield, hp: 10, invuln: 0 }
  damageContext.damagePlayer(1, target, { x: 20, y: 10 })
  assert.equal(target.feedback.kind, expected)
  assert.equal(target.feedback.dx, 1)
  assert.equal(target.forceField, remaining)
  assert.equal(target.hp, field || shield ? 10 : 9)
  if (field) assert.equal(target.shield, shield, 'force field damage consumed shield armor')
  const serial = target.feedback.serial
  damageContext.damagePlayer(1, target, { x: 0, y: 0 })
  assert.equal(target.feedback.serial, serial, 'invulnerable collision replayed a hit')
}
// Losing one co-op pilot is not a lost run; announce defeat only once both are down.
const deathSounds = []
Object.assign(damageContext, { coOpRunRef: { current: true }, remotePlayerRef: { current: { hp: 5, score: 0 } },
  playerRef: { current: null }, phaseRef: { current: 'playing' }, highScoreRef: { current: 999 },
  playGameSound: kind => deathSounds.push(kind), stopBGM() {}, stopRaidBgm() {},
  submitRaidLeaderboardScore() {}, reportRaidRunComplete() {} })
for (const allyAlive of [true, false]) {
  deathSounds.length = 0
  const target = { x: 10, y: 10, hp: 1, maxHp: 1, invuln: 0, forceField: 0, shield: 0, score: 0 }
  damageContext.playerRef.current = target
  damageContext.remotePlayerRef.current.hp = allyAlive ? 5 : 0
  damageContext.damagePlayer(1, target)
  assert.equal(deathSounds.filter(kind => kind === 'gameover').length, allyAlive ? 0 : 1)
  assert.equal(damageContext.phaseRef.current, allyAlive ? 'playing' : 'gameover')
}
function context() { return { globalAlpha: 1, points: [], save() {}, restore() {}, translate() {}, scale() {}, beginPath() {},
  moveTo(...point) { this.points.push(point) }, lineTo(...point) { this.points.push(point) }, stroke() {}, fill() {}, rect() {}, clip() {}, drawImage() {} } }
const draw = (phase, time) => { const ctx = context(); condition.drawPlayerCondition(ctx, player, phase, 0, 0, 192, time, 'pilot', {}, false); return ctx.points }
const first = draw('playing', 100)
assert.deepEqual(draw('paused', 5100), first, 'paused protection ripple moved')
for (let i = 1; i <= 30; i++) draw('playing', 5100 + i * 16)
assert.equal(draw('playing', 5600).length, 0, 'impact ripple never expired')

const { RaidScenePresentation } = load('raid/scenePresentation.ts', {
  '../presentationAudio': fakeAudio, '../sound': sound, './playerCondition': condition,
  './combatArt': { COMBAT_TILE: {} }, './cosmos': { cosmicRegionIndex: () => 0 }, './flightEffects': { raidStereoPan: () => 0 },
}, { document, performance: { now: () => now } })
const scene = new RaidScenePresentation()
for (let id = 1; id <= 40; id++) scene.defeat({ id, x: 50, y: 50, radius: 3, isBoss: id === 40 })
assert.equal(scene.snapshot().length, 12, 'snapshot destruction history must remain bounded')
const count = cues.length
scene.ingest(scene.snapshot())
scene.defeat({ id: 40 })
scene.ingest([{ serial: 9999, x: 1, y: 1, radius: 3, tier: 'fighter', seed: NaN }])
assert.equal(cues.length, count, 'duplicate or malformed destruction event replayed audio')
for (const phase of ['gameover', 'briefing', 'victory']) {
  const before = fullStops
  scene.update({ phase, enemies: [], player, stage: 1, landscape: false, stageClear: false })
  assert.ok(fullStops > before, 'leaving flight retained destruction one-shots or pending decodes')
}
const { DefensePresentation } = load('towerDefense/presentation.ts', { '../presentationAudio': fakeAudio }, { document, performance: { now: () => now } })
const defense = new DefensePresentation()
assert.deepEqual(Array.from(defense.update(true, true, .8, 1, [{ id: 1, active: true }], null)), [1])
const alerts = cues.filter(cue => cue[0] === 'hq-warning').length
assert.equal(defense.update(true, true, .8, 1, [{ id: 1, active: true }], null).length, 0, 'active synergy retriggered')
assert.equal(cues.filter(cue => cue[0] === 'hq-warning').length, alerts, 'HQ warning ignored cooldown')
defense.update(true, true, .8, 1, [{ id: 1, active: false }], null)
assert.deepEqual(Array.from(defense.update(true, true, .8, 1, [{ id: 1, active: true }], null)), [1])
now += 7000
defense.update(true, true, .8, 1, [], null)
assert.equal(cues.filter(cue => cue[0] === 'hq-warning').length, alerts + 1)
console.log('Immersion: 44 asset hashes, bounded voices, priority, immediate mute, late decode/play cancellation, score timing, pause-safe contacts, network deduplication, synergy activation and HQ cooldown passed')
