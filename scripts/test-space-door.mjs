import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('../src/components/ui/doorSequence.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: {module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022} }).outputText
const { DoorSequence } = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const wait = (ms) => new Promise(resolve => setTimeout(resolve,ms))

const phases=[]
let committed=0
const normal=new DoorSequence(phase=>phases.push(phase))
assert.equal(normal.busy,false)
assert.deepEqual(phases,[],'first screen must not animate')
normal.run(()=>{committed++})
normal.run(()=>{committed++})
assert.equal(committed,0,'navigation happened before closure')
assert.equal(normal.busy,true)
await wait(305)
assert.equal(committed,2,'related menu actions were dropped')
assert.equal(phases.at(-1),'closed')
await wait(420)
assert.deepEqual(phases,['closing','closed','opening','idle'])
assert.equal(normal.busy,false)

let finish
const loaded=new Promise(resolve=>{finish=resolve})
const loadingPhases=[]
const loading=new DoorSequence(phase=>loadingPhases.push(phase))
loading.run(()=>loaded,true)
await wait(150)
assert.equal(loadingPhases.at(-1),'closed','door revealed before async screen preparation')
finish()
await wait(45)
assert.equal(loadingPhases.at(-1),'opening')
assert.equal(loading.run(()=>assert.fail('input accepted during reveal')),false)
await wait(95)
assert.equal(loading.busy,false)

const cancelled=new DoorSequence(()=>{})
cancelled.run(()=>assert.fail('cancelled navigation ran'),true)
cancelled.cancel()
await wait(80)
assert.equal(cancelled.busy,false)
console.log('Space door: hidden navigation, batched actions, async preparation, reduced motion, input lock and cancellation passed')
