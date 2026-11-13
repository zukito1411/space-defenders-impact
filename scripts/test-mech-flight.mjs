import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const strip=s=>s.replace(/^import .*\n/gm,'')
const js=ts.transpileModule('const WIDTH=100,HEIGHT=100;\n'+strip(read('src/components/games/raid/mechFlight.ts'))+'\n'+strip(read('src/components/games/raid/playerMuzzle.ts')),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {MECH_FLIGHT_ANCHORS:anchors,GOD_GUNDAM_PALMS,getMechShotAnchor,createRaidMainShotEmitter,getRaidPlayerHullSize,getMechFlightNozzles}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
for(const model of ['godGundam','spiegel'])for(const landscape of [false,true])for(const scale of [1,1.25,1.5])for(const [w,h] of [[393,852],[390,844],[900,1440]]){
 const ship={x:50,y:75},size=getRaidPlayerHullSize('coreLander',w,landscape,scale)*1.08
 for(const kind of ['coreBlast','spiegelKunai','laser','needle','spread','rocket','homing'])for(const lane of [-3,3]){
  let shot;const emit=createRaidMainShotEmitter(s=>shot=s,ship,'coreLander',true,w,h,0,landscape,scale,model)
  const input={x:50+lane,y:70,vx:12,vy:-90,damage:8,radius:2,kind}
  emit({...input})
  const [ax,ay]=getMechShotAnchor(model,kind,lane,landscape)
  near((shot.x-50)*w/100,ax*size);near((shot.y-75)*h/100,ay*size)
  assert.deepEqual({...shot,x:0,y:0},{...input,x:0,y:0},'anchors must not change combat values')
  if(landscape){
   if(kind==='coreBlast'||kind==='spiegelKunai'){near(-ay,anchors[model].hand[0]);near(ax,anchors[model].hand[1])}
   if(kind==='spread'||kind==='rocket')assert.ok(ax<-.03,'shoulder fire must be above the pelvis')
  }
 }
}
for(const model of ['godGundam','spiegel']){
 const nozzles=getMechFlightNozzles(model)
 for(const [i,[x,y,a]]of nozzles.entries()){
  near(x,anchors[model].nozzles[i][1]);near(-y,anchors[model].nozzles[i][0]);assert.ok(a>0&&a<.03)
 }
}
for(const landscape of [true,false])for(const burning of [true,false]){
 const ship={x:50,y:70},w=390,h=844
 let shot;const emit=createRaidMainShotEmitter(s=>shot=s,ship,'coreLander',true,w,h,0,landscape,1,'godGundam')
 emit({x:ship.x,y:ship.y,kind:'coreBlast',vx:0,vy:-82,damage:12,radius:2.8,burning})
 const [x,y]=GOD_GUNDAM_PALMS[burning?'burning':'folded'].release
 const hull=getRaidPlayerHullSize('coreLander',w,landscape)*1.08
 near((shot.x-ship.x)*w/100,hull*(landscape?y:.23))
 near((shot.y-ship.y)*h/100,hull*(landscape?-x:-.04))
}
for(const name of ['god-gundam-flight-v3.webp','god-gundam-burning-flight-v4.webp','spiegel-flight-v3.webp']){
 const b=readFileSync(new URL('../public/assets/ships/sideview/'+name,import.meta.url))
 assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&16,'sprite must retain transparency')
 assert.equal(b.readUIntLE(24,3)+1,1536);assert.equal(b.readUIntLE(27,3)+1,1024)
}
console.log('Mechs: shoulder/head/hand origins, aspect-correct landscape mapping, unchanged damage/velocity, scaled nozzle mounts and transparent 1536x1024 flight art passed')
