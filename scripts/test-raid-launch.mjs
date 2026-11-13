import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const code = ts.transpileModule(read('src/components/games/raid/raidLaunch.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { sampleLaunchFlight } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
for (const hz of [30,60,120]) {
  let previous=-1
  for (let frame=0;frame<=hz;frame++) {
    const p=sampleLaunchFlight(frame/hz,false)
    assert.ok(p>=previous && p>=0 && p<=1)
    previous=p
  }
  assert.equal(previous,1)
}
assert.equal(sampleLaunchFlight(0,true),1)
assert.equal(sampleLaunchFlight(NaN,false),0)
const component=read('src/components/games/raid/RaidLaunchSequence.tsx')
assert.doesNotMatch(component,/RaidShipSprite|<img|setTimeout/,'launch must never create another ship or race a timer')
const runtime=read('src/components/games/raid/GradiusRaidRuntime.tsx')
assert.match(runtime,/stageEntryRef.current = underway \? MESIAH_ENTRY_SECONDS : CARRIER_LAUNCH_SECONDS/)
assert.match(runtime,/const easedEntry = sampleLaunchFlight/)
assert.match(runtime,/stageEntryRef.current <= 0 && gfxProfile.drawOptionShips/)
const css=read('src/landscape-ui.css')
assert.match(css,/\.raid__launch-sequence\s*\{[^}]*pointer-events:\s*none/s)
console.log('Launch: one simulation ship, frame-rate independent flight, reduced motion and no duplicate overlay ship passed')
