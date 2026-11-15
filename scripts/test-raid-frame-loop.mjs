import assert from 'node:assert/strict'
import { startRaidFrameLoop } from '../src/components/games/raid/frameLoop.ts'

globalThis.document = Object.assign(new EventTarget(), { hidden: false })
globalThis.window = new EventTarget()
const pending = new Map()
let nextId = 0
globalThis.requestAnimationFrame = callback => {
  const id = nextId++
  pending.set(id, callback)
  return id
}
globalThis.cancelAnimationFrame = id => pending.delete(id)

function runFrame(time) {
  assert.equal(pending.size, 1)
  const [[id, callback]] = pending
  pending.delete(id)
  callback(time)
}

const failure = new Error('Combat draw failed')
const frames = []
const errors = []
let resumed = 0
let suspended = 0
const stop = startRaidFrameLoop(time => {
  if (time === 10) throw failure
  frames.push(time)
}, error => errors.push(error), () => suspended++, () => resumed++)

window.dispatchEvent(new Event('focus'))
assert.equal(resumed, 0)
runFrame(10)
assert.deepEqual(errors, [failure])
runFrame(20)
assert.deepEqual(frames, [20])

document.hidden = true
document.dispatchEvent(new Event('visibilitychange'))
window.dispatchEvent(new Event('pageshow'))
assert.equal(pending.size, 0)
assert.equal(suspended, 1)

document.hidden = false
window.dispatchEvent(new Event('pageshow'))
document.dispatchEvent(new Event('visibilitychange'))
window.dispatchEvent(new Event('focus'))
assert.equal(resumed, 1)
runFrame(1000)
assert.deepEqual(frames, [20, 1000])

stop()
window.dispatchEvent(new Event('focus'))
document.dispatchEvent(new Event('visibilitychange'))
assert.equal(pending.size, 0)
assert.equal(resumed, 1)

document.hidden = true
const stopInitiallyHidden = startRaidFrameLoop(() => assert.fail('Hidden loop ran'), assert.fail, () => {}, () => {})
assert.equal(pending.size, 0)
stopInitiallyHidden()
console.log('Raid frame recovery, visibility changes, and cleanup passed')
