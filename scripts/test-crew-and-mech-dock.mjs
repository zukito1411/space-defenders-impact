import assert from 'node:assert/strict'
import {readFileSync}from'node:fs'
import ts from'typescript'
const read=p=>readFileSync(new URL('../src/components/games/raid/'+p,import.meta.url),'utf8')
const strip=s=>s.replace(/^import .*\n/gm,'')
const source=strip(read('crewMotion.ts'))+'\n'+strip(read('carrierLaunch.ts'))+'\n'+strip(read('mechFlight.ts'))+'\n'+strip(read('mechDock.ts'))
const lib=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'))
for(let t=0;t<70;t+=1/60){const p=lib.sampleCrewPatrol(t,500,850,22,0);assert.ok(p.x>=500&&p.x<=850);const n=lib.sampleCrewPatrol(t+.001,500,850,22,0);assert.ok(n.distance>=p.distance);if(!p.moving&&!n.moving)assert.equal(p.x,n.x)}
for(const landscape of[false,true]){
 for(const [age,frame]of[[0,1],[2.8,1],[3.8,1],[4.5,1],[5.2,1],[6.2,1],[8.399,1],[8.4,2],[8.81,3]])assert.equal(lib.sampleMechDock(age,landscape).frame,frame)
 assert.equal(lib.sampleMechDock(lib.CARRIER_EXIT_SECONDS+.8,landscape),null)
 assert.equal(lib.sampleMechDock(5.4,landscape,true),null)
 for(const reduced of[false,true])for(const hz of[30,60,120])for(let i=0;i<lib.CARRIER_LAUNCH_SECONDS*hz;i++){
  const age=i/hz,ship=lib.sampleCarrierLaunch(age,landscape,reduced),pose=lib.sampleMechDock(age,landscape,reduced)
  if(ship.backdrop>0)assert.equal(pose?.frame,1,'Gundam changes its crouched pose while still inside the dock')
  if(pose&&pose.frame!==1)assert.equal(ship.backdrop,0,'flight transition must begin only outside')
 }
}
for(const model of['godGundam','spiegel'])for(let frame=0;frame<4;frame++)for(const [x,y,a]of lib.getMechDockNozzles(model,frame).roots){assert.ok(Number.isFinite(x)&&Number.isFinite(y));assert.ok(a>0&&a<.04)}
for(const [file,height] of [
 ['god-gundam-launch-v3.webp',1024], ['spiegel-launch-v1.webp',1024],
 ['god-gundam-flight-v4.webp',1024], ['god-gundam-actions-v3.webp',1024],
 ['god-gundam-burning-flight-v5.webp',1024], ['god-gundam-burning-actions-v4.webp',1024],
]){
 const b=readFileSync(new URL('../public/assets/ships/sideview/'+file,import.meta.url))
 assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&16,file+' must retain its silhouette alpha')
 assert.equal(b.readUIntLE(24,3)+1,1536);assert.equal(b.readUIntLE(27,3)+1,height)
}
console.log('Crew eased patrol stops; Gundam ready/crouch/lift/fly timing, pose-mounted nozzles and alpha assets passed')
