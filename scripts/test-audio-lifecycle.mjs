import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

let now = 10000, nextTimer = 1
const timers = new Map(), media = [], sources = []
const schedule = (callback, delay, interval = 0) => {
  const id = nextTimer++; timers.set(id, { callback, at: now + delay, interval }); return id
}
function advance(ms) {
  const until = now + ms
  while (true) {
    const next = [...timers].sort((a, b) => a[1].at - b[1].at).find(([, value]) => value.at <= until)
    if (!next) break
    const [id, timer] = next; now = timer.at
    if (timer.interval) timer.at += timer.interval
    else timers.delete(id)
    timer.callback()
  }
  now = until
}
class Audio {
  paused = true; currentTime = 0; volume = 1
  constructor(url) { this.src = url; media.push(this) }
  play() { this.paused = false; return new Promise((resolve, reject) => { this.resolve = () => { this.paused = false; resolve() }; this.reject = reject }) }
  pause() { this.paused = true }
}
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} })
class Context {
  state = 'running'; currentTime = 0; destination = {}
  createOscillator() {
    const source = { frequency: param(), connect() {}, disconnect() {}, start() { this.started = true }, stop(at) { if (at === undefined) this.stopped = true } }
    sources.push(source); return source
  }
  createGain() { return { gain: param(), connect() {} } }
  createBiquadFilter() { return { frequency: param(), connect() {} } }
}
const window = Object.assign(new EventTarget(), {
  AudioContext: Context, setTimeout: (cb, delay) => schedule(cb, delay), clearTimeout: id => timers.delete(id),
  setInterval: (cb, delay) => schedule(cb, delay, delay), clearInterval: id => timers.delete(id),
})
const sound = {}
const source = readFileSync('src/components/games/sound.ts', 'utf8').replaceAll('import.meta.env.BASE_URL', "'/'")
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { exports: sound, window, Audio, Event, localStorage: { getItem: () => null, setItem() {} }, performance: { now: () => now } })
const flush = async () => { for (let n = 0; n < 4; n++) await Promise.resolve() }

sound.playGameSound('gameover')
const defeat = media.at(-1)
assert.ok(defeat.src.endsWith('/sfx_gameover.wav'))
assert.ok(defeat.volume < .2, 'defeat remained too loud')
defeat.resolve(); await flush()
advance(1000)
assert.ok(!defeat.paused && defeat.volume > 0, 'defeat was cut instead of fading')
const midFade = defeat.volume
advance(60)
assert.ok(defeat.volume < midFade, 'defeat tail did not fade')
advance(80)
assert.ok(defeat.paused, 'seven-second defeat tail survived its short cue')
assert.equal(timers.size, 0)

sound.playGameSound('destroyed_explosion')
const explosion = media.at(-1); explosion.resolve(); await flush()
assert.ok(explosion.volume < .12)
advance(1520)
assert.ok(explosion.paused, 'destruction tail exceeded 1.5 seconds')

sound.playGameSound('gameover'); const pending = media.at(-1)
sound.stopGameSounds(); assert.ok(pending.paused)
pending.resolve(); await flush()
assert.ok(pending.paused, 'late play() completion resurrected an exited game')
assert.equal(timers.size, 0)

sound.playGameSound('gameover'); const first = media.at(-1); first.resolve(); await flush()
sound.playGameSound('gameover'); assert.ok(first.paused, 'duplicate defeat cues overlapped')
sound.stopGameSounds(); assert.equal(timers.size, 0, 'exit leaked a fade timer')

const before = media.length
for (let i = 0; i < 60; i++) { sound.playGameSound('laser'); advance(1000 / 60) }
assert.ok(media.length - before <= 13, 'rapid fire created excessive laser voices')
assert.ok(media.filter(audio => !audio.paused).length <= 3)
assert.ok(media.slice(before).every(audio => audio.src.endsWith('/sfx_laser.wav')))
sound.stopGameSounds()
assert.ok(media.every(audio => audio.paused))

// Missing optional samples use synthesized cues; pending notes must also stop.
sound.setGameSoundPack({ sfx: { gameover: '' } })
sound.playGameSound('gameover'); assert.equal(sources.length, 2)
sound.stopGameSounds(); assert.ok(sources.every(source => source.stopped))
sound.playGameSound('gameover')
sound.setGameSoundEnabled(false); assert.ok(sources.every(source => source.stopped))
console.log('Audio lifecycle: quiet bounded defeat fades, duplicate suppression, pending-play cancellation, laser overlap limits, synthesized-note cleanup and immediate mute passed')
