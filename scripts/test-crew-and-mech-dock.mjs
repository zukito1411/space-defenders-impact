import assert from 'node:assert/strict'
import {readFileSync}from'node:fs'
import ts from'typescript'
const read=p=>readFileSync(new URL('../src/components/games/raid/'+p,import.meta.url),'utf8')
const strip=s=>s.replace(/^import .*\n/gm,'')
const source=strip(read('crewMotion.ts'))+'\n'+strip(read('carrierLaunch.ts'))+'\n'+strip(read('mechFlight.ts'))+'\n'+strip(read('mechDock.ts'))
const lib=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'))
for(const running of[false,true])for(const leg of[0,1]){
 for(let d=0;d<100;d+=.03){
  const a=lib.sampleCrewFoot(d,leg,running),b=lib.sampleCrewFoot(d+.01,leg,running)
  if(a.planted&&b.planted&&Math.abs(a.x-b.x)<.1)assert.ok(Math.abs((d+a.x)-(d+.01+b.x))<1e-8,'stance foot slides across the ground')
  assert.ok(a.y<=0,'foot penetrates the deck')
  const k=lib.crewKnee(0,-8.7,a.x,a.y-1);assert.ok(Number.isFinite(k.x)&&Number.isFinite(k.y))
 }
}
for(let t=0;t<70;t+=1/60){const p=lib.sampleCrewPatrol(t,500,850,22,0);assert.ok(p.x>=500&&p.x<=850);const n=lib.sampleCrewPatrol(t+.001,500,850,22,0);assert.ok(n.distance>=p.distance);if(!p.moving&&!n.moving)assert.equal(p.x,n.x)}
for(const landscape of[false,true]){
 for(const [age,frame]of[[0,0],[2.8,0],[3.8,1],[4.5,2],[5.2,3]])assert.equal(lib.sampleMechDock(age,landscape).frame,frame)
 assert.equal(lib.sampleMechDock(6.2,landscape),null)
 assert.equal(lib.sampleMechDock(5.4,landscape,true),null)
}
for(const model of['godGundam','spiegel'])for(let frame=0;frame<4;frame++)for(const [x,y,a]of lib.getMechDockNozzles(model,frame).roots){assert.ok(Number.isFinite(x)&&Number.isFinite(y));assert.ok(a>0&&a<.04)}
for(const file of['god-gundam-launch-v1.webp','spiegel-launch-v1.webp','god-gundam-burning-flight-v3.webp','god-gundam-burning-actions-v2.webp']){
 const b=readFileSync(new URL('../public/assets/ships/sideview/'+file,import.meta.url));assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&16);assert.equal(b.readUIntLE(24,3)+1,1536);assert.equal(b.readUIntLE(27,3)+1,1024)
}
console.log('Crew planted feet, knees, eased patrol stops; Gundam ready/crouch/lift/fly timing, pose-mounted nozzles and alpha assets passed')
