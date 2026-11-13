import assert from 'node:assert/strict'
import {readFileSync}from'node:fs'
import ts from'typescript'
const read=p=>readFileSync(new URL('../src/components/games/raid/'+p,import.meta.url),'utf8')
const mod=async s=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'))
const launch=await mod(read('carrierLaunch.ts'))
const deck=await mod(`const CARRIER_BOARDING_SECONDS=${launch.CARRIER_BOARDING_SECONDS},CARRIER_CLEAR_SECONDS=${launch.CARRIER_CLEAR_SECONDS},CARRIER_IGNITION_START=${launch.CARRIER_IGNITION_START};\n`+['crewMotion.ts','crewPeople.ts','carrierBoarding.ts'].map(p=>read(p).replace(/^import .*\n/gm,'')).join('\n')+'\nconst person=drawDeckPerson;\n'+read('carrierDeck.ts').replace(/^import .*\n/gm,''))
for(const hz of[30,60,120])for(let n=0;n<=launch.CARRIER_LAUNCH_SECONDS*hz;n++){
 const age=n/hz,c=deck.sampleCarrierCrew(age,false,false),p=launch.sampleCarrierLaunch(age,true)
 if(c.pilotVisible||!c.clear)assert.equal(p.engine,0,'no ignition while pilot/marshal is in the lane')
 if(p.shift>0){assert.equal(c.pilotState,'aboard');assert.equal(c.marshalState,'safe')}
}
assert.equal(deck.sampleCarrierCrew(0,true,false).pilotState,'waiting')
assert.equal(deck.sampleCarrierCrew(3,false,false).pilotState,'aboard')
assert.equal(deck.sampleCarrierCrew(3.2,false,false).marshalState,'clearing')
assert.equal(deck.sampleCarrierCrew(3.8,false,false).marshalState,'safe')
for(const [w,h,l]of[[393,852,false],[360,640,false],[844,390,true],[640,320,true]]){
 const c=deck.carrierCover(w,h,l)
 assert.ok(c.sw*c.scale>=w&&c.sh*c.scale>=h)
 assert.ok(Math.abs(c.x+(c.sw*.5)*c.scale-w*.5)<1e-8)
 assert.ok(Math.abs(c.y+(c.sh*.5)*c.scale-h*.5)<1e-8)
}
for(const age of[0,1,2,3.2,3.8]){
 const c=deck.sampleCarrierCrew(age,false,true)
 assert.equal(c.walk,0);assert.equal(c.climb,0);assert.ok(c.retreat===0||c.retreat===1)
}
assert.doesNotMatch(read('carrierDeck.ts'),/shadowBlur/,'frame rendering must not run live blur filters')
console.log('Deck: boarding and marshal retreat finish before ignition, safe lane before launch, cover/crop alignment, reduced-motion cuts and 30/60/120Hz sequencing passed')
