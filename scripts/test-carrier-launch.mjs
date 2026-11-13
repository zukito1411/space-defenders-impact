import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const module=async path=>{
 const text=read(path).replace(/^import .*\n/gm,'')
 const js=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
 return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
}
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
const calls=[]
const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args]),set:(o,k,v)=>(o[k]=v,true)})
const {drawCarrierClamps}=await module('src/components/games/raid/carrierLaunch.ts')
drawCarrierClamps(ctx,10,20,100,1);assert.equal(calls.length,0,'released clamps disappear')
drawCarrierClamps(ctx,10,20,100,0);assert.equal(calls.filter(c=>c[0]==='fillRect').length,4)
const {getCarrierMission}=await module('src/components/games/raid/carrierMission.ts')
for(const language of ['en','zh','ja','ko'])for(const mode of ['campaign','endless','bossRush']){
 const m=getCarrierMission(language,mode)
 assert.equal(m.goals.length,3);assert.equal(m.beats.length,3)
 assert.ok(m.beats.every(b=>b.length===3&&b[2].length>0))
}
const runtime=read('src/components/games/raid/GradiusRaidRuntime.tsx')
assert.match(runtime,/stageEntryRef.current = underway \? MESIAH_ENTRY_SECONDS : CARRIER_LAUNCH_SECONDS/)
assert.match(runtime,/carrierLaunch: initialLaunchRef.current/)
assert.match(runtime,/if \(carrierActive\) \{[\s\S]*?renderCarrierPilot\(ownShipRef[\s\S]*?return/)
const assets=read('src/components/games/raid/carrierAssets.ts')
for(const path of assets.matchAll(/'([^']+\.webp)'/g))assert.ok(readFileSync(new URL('../public/'+path[1],import.meta.url)).length>10000)
console.log('Carrier: dock/ignition/release/flight/settle at 30/60/120Hz, reduced motion, co-op clock fields and all twelve mission scripts passed')
