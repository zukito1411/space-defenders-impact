import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const moduleUrl=async (path, imports = {})=>{
 const text=read(path).replace(/^import .* from '([^']+)'\n/gm,(line,ref)=>imports[ref] ? line.replace(ref,imports[ref]) : '')
 const js=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
 return 'data:text/javascript;base64,'+Buffer.from(js).toString('base64')
}
const module = async path => import(await moduleUrl(path))
const {sampleCarrierLaunch:sample,CARRIER_LAUNCH_SECONDS:duration,MESIAH_ENTRY_SECONDS:mesiahDuration}=await module('src/components/games/raid/carrierLaunch.ts')
for(const landscape of [false,true])for(const compact of [false,true]){
 const dock=sample(0,landscape,false,compact)
 assert.equal(dock.engine,0);assert.equal(dock.release,0);assert.equal(dock.backdrop,1)
 for(const hz of [30,60,120]){
  let prior=dock
  for(let frame=1;frame<=Math.ceil(duration*hz);frame++){
   const p=sample(Math.min(duration,frame/hz),landscape,false,compact)
   assert.ok(p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100)
   assert.ok(p.engine>=prior.engine&&p.release>=prior.release&&p.shift>=prior.shift)
   assert.ok(Math.abs(p.y-prior.y)<2,'no frame-to-frame teleport')
   assert.ok(p.scale<=1.65&&p.scale>=1)
   if(frame/hz<1.6)assert.equal(p.y,dock.y,'ship stays docked during ignition')
   prior=p
  }
  assert.equal(prior.y,82);assert.equal(prior.x,50);assert.equal(prior.scale,1);assert.equal(prior.done,true)
 }
 for(const age of [0,1,2,4,6.4])assert.equal(sample(age,landscape,true,compact).shift,0,'reduced motion has no carrier pan')
}
for (const landscape of [false, true]) for (const age of [0, mesiahDuration / 2, mesiahDuration]) {
 const flight = sample(age, landscape, false, false, true)
 assert.equal(flight.backdrop, 0)
 assert.equal(flight.engine, 1)
 assert.equal(flight.release, 1)
 assert.equal(flight.done, age === mesiahDuration)
 if (flight.done) assert.deepEqual([flight.x, flight.y, flight.scale], [50, 82, 1])
}
const {sampleCarrierRecovery: recover, shouldRecoverAfterStage, shouldRecoverBeforeEndlessBoss, CARRIER_RECOVERY_SECONDS} =
 await import(await moduleUrl('src/components/games/raid/carrierRecovery.ts', {
  './carrierLaunch': await moduleUrl('src/components/games/raid/carrierLaunch.ts'),
 }))
for (const [stage, next] of [[4,5],[9,10],[14,15],[15,16]]) {
 assert.equal(shouldRecoverAfterStage('campaign',stage,next),true)
 assert.equal(shouldRecoverAfterStage('endless',stage,next),false)
}
assert.equal(shouldRecoverAfterStage('campaign',3,4),false)
assert.equal(shouldRecoverAfterStage('campaign',15,15),false)
for (const boss of ['super','squid','snake','final','devil']) assert.ok(shouldRecoverBeforeEndlessBoss(boss))
for (const boss of ['carrier','orb','mantis','serpent','hydra','gate']) assert.ok(!shouldRecoverBeforeEndlessBoss(boss))
for (const landscape of [false,true]) for (const reduced of [false,true]) for (const underway of [false,true]) {
 const first=recover(0,landscape,reduced,false,underway)
 const last=recover(CARRIER_RECOVERY_SECONDS,landscape,reduced,false,underway)
 const dock=sample(0,landscape,reduced,false,underway)
 assert.deepEqual([last.x,last.y,last.scale],[dock.x,dock.y,dock.scale])
 assert.deepEqual([last.engine,last.release,last.exteriorAlpha,last.backdrop],[0,0,0,underway?0:1])
 assert.equal(first.backdrop,reduced&&!underway?1:0)
 assert.ok(last.engine <= first.engine)
 assert.ok(last.release <= first.release)
 const exterior=recover(2.2,landscape,reduced,false,underway)
 assert.equal(exterior.exteriorAlpha,!reduced&&!underway?1:0)
}
const {getCarrierMission}=await module('src/components/games/raid/carrierMission.ts')
const commsSource = read('src/components/games/raid/hostileBriefing.ts').replace(/^import .*\n/gm, '')
const commsJs = ts.transpileModule('const getPublicAssetUrl = path => path;\n' + commsSource, {compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {getCarrierConversation} = await import('data:text/javascript;base64,' + Buffer.from(commsJs).toString('base64'))
for(const language of ['en','zh','ja','ko'])for(const mode of ['campaign','endless','bossRush']){
 const m=getCarrierMission(language,mode)
 assert.equal(m.goals.length,3)
 const opening = getCarrierConversation(language,mode,1,false)
 assert.deepEqual(opening.map(line => line[0]), ['commander','pilot','commander','commander'])
 for (const boss of ['squid','snake','final','devil','super']) {
  const recovery = getCarrierConversation(language,mode,5,false,boss)
  assert.deepEqual(recovery.map(line => line[0]), ['commander','pilot','enemy','commander'])
  assert.ok(recovery.every(line => line[1].length > 0))
 }
}
const runtime=read('src/components/games/raid/GradiusRaidRuntime.tsx')
assert.match(runtime,/stageEntryRef.current = underway \? MESIAH_ENTRY_SECONDS : CARRIER_LAUNCH_SECONDS/)
assert.match(runtime,/carrierLaunch: initialLaunchRef.current/)
assert.match(runtime,/if \(carrierActive\) \{[\s\S]*?renderCarrierPilot\(ownShipRef[\s\S]*?return/)
const assets=read('src/components/games/raid/carrierAssets.ts')
for(const path of assets.matchAll(/'([^']+\.webp)'/g))assert.ok(readFileSync(new URL('../public/'+path[1],import.meta.url)).length>10000)
console.log('Carrier: dock/ignition/release/flight/settle at 30/60/120Hz, reduced motion, co-op clock fields and all twelve mission scripts passed')
