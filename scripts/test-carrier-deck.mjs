import assert from 'node:assert/strict'
import {readFileSync}from'node:fs'
import ts from'typescript'
const read=p=>readFileSync(new URL('../src/components/games/raid/'+p,import.meta.url),'utf8')
const mod=async s=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'))
const launch=await mod(read('carrierLaunch.ts'))
const deck=await mod(`const CARRIER_BOARDING_SECONDS=${launch.CARRIER_BOARDING_SECONDS},CARRIER_CLEAR_SECONDS=${launch.CARRIER_CLEAR_SECONDS},CARRIER_IGNITION_START=${launch.CARRIER_IGNITION_START};\n`+['crewMotion.ts','carrierDeckLayout.ts','deckServiceArt.ts','carrierCanopyProfiles.ts','carrierBoarding.ts'].map(p=>read(p).replace(/^import .*\n/gm,'')).join('\n')+'\n'+read('carrierDeck.ts').replace(/^import .*\n/gm,''))
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
// Source-art measurements. Each lower landscape platform stops at a different
// wall pier, with exposed pipework between them.
const walkable = {
 landscape: {
  catwalks: [[700,880,222,234],[1030,1270,222,234],[218,398,788,801],[924,1067,788,801]],
  flightDeck: [220,1270,613,633],
 },
 portrait: {
  catwalks: [[88,245,441,452],[780,936,441,452],[88,245,794,806],[775,932,794,806]],
  flightDeck: [342,666,227,1192],
 },
}
const onFloor=([x,y],[left,right,back,front],label,margin=0)=>{
 assert.ok(x-margin>=left&&x+margin<=right&&y>=back&&y<=front,`${label} at (${x}, ${y}) is outside its painted floor`)
}
for(const [view,layout] of Object.entries(deck.CARRIER_DECK_LAYOUTS)){
 const {catwalks,flightDeck}=walkable[view]
 for (const [index,[start,end,y,height]] of layout.patrols.entries()){
  for(let t=0;t<40;t+=.25){
   const {x}=deck.sampleCrewPatrol(t,start,end,22,index*3.7)
   // The widest walking frame extends 38 source pixels either side of its foot anchor.
   onFloor([x,y],catwalks[index],`${view} patrol ${index}`,Math.ceil(height*38/107))
  }
 }
 const {tug,...stations}=layout.services
 for (const [role,point] of Object.entries(stations)){
  onFloor(point,flightDeck,`${view} ${role}`,role==='cart'?17:10)
 }
 for (const x of tug.slice(0,2)) onFloor([x,tug[2]],flightDeck,`${view} tug`,19)
 for (const x of layout.marshal.slice(0,2)) onFloor([x,layout.marshal[2]],flightDeck,`${view} marshal`,5)
 for (const [w,h] of view==='landscape'?[[844,390],[640,320],[1024,768]]:[[393,852],[360,640],[600,800]]){
  const landscape=view==='landscape'
  const cover=deck.carrierCover(w,h,landscape)
  const route=launch.sampleCarrierLaunch(0,landscape,false,h<700)
  const shipX=((landscape?1-route.y/100:route.x/100)*w-cover.x)/cover.scale
  const shipY=((landscape?route.x:route.y)*h/100-cover.y)/cover.scale
  const hull=Math.min(180,w*.34)/cover.scale
  for (const [key,mech] of [['xwing',false],['dreadnought',false],['godGundam',true],['spiegel',true]]){
   const boarding=deck.getCarrierBoardingGeometry(shipX,shipY,hull,key,landscape,1,mech)
   onFloor([boarding.startX,boarding.floorY],flightDeck,`${view} ${key} walking start`,5)
   onFloor([boarding.footX,boarding.floorY],flightDeck,`${view} ${key} ladder foot`,5)
  }
 }
}
for(const age of[0,1,2,3.2,3.8]){
 const c=deck.sampleCarrierCrew(age,false,true)
 assert.equal(c.walk,0);assert.equal(c.climb,0);assert.ok(c.retreat===0||c.retreat===1)
}
assert.doesNotMatch(read('carrierDeck.ts'),/shadowBlur/,'frame rendering must not run live blur filters')
console.log('Deck: painted floors and catwalks, boarding and marshal clearance, cover/crop alignment, reduced motion and 30/60/120Hz sequencing passed')
