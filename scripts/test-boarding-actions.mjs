import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const read=p=>readFileSync(new URL('../src/components/games/raid/'+p,import.meta.url),'utf8')
const strip=s=>s.replace(/^import .*\n/gm,'')
const code=['carrierLaunch.ts','carrierDeckLayout.ts','carrierCanopyProfiles.ts','carrierBoarding.ts','mechAttack.ts','deckServiceArt.ts'].map(p=>strip(read(p))).join('\n')
const stubs=`
const getPublicAssetUrl=p=>p;
const makeImageCanvasSprite=(id)=>({loaded:true,image:{id}});
const getShipCanvasSprite=key=>({loaded:true,key,view:'portrait',width:512,height:512});
const getRaidSideShipCanvasSprite=key=>({loaded:true,key,view:'side',width:2048,height:768});
const getMechDockAtlas=key=>({loaded:true,key,view:'mech',width:1536,height:1024});
const getCanvasSpriteDimensions=(sprite)=>({source:sprite,width:sprite.width??1536,height:sprite.height??1024});
\n`
const lib=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(stubs+code,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'))
for(const hz of[30,60,120])for(const reduced of[false,true]){
 let wasSealed=false
 for(let i=0;i<=Math.ceil(4*hz);i++){
  const t=i/hz,b=lib.sampleCarrierBoarding(t,false,reduced),ship=lib.sampleCarrierLaunch(t,true,reduced)
  if(t<2.8)assert.equal(b.canopy,1,'cockpit closes on the boarding pilot')
  if(t<3.1)assert.equal(b.ladder,1,'ladder stows before pilot finishes climbing')
  if(ship.engine>0){assert.equal(b.canopy,0);assert.equal(b.ladder,0);assert.equal(b.sealed,true)}
  if(wasSealed)assert.equal(b.sealed,true)
  wasSealed=b.sealed
 }
}
assert.equal(lib.sampleCarrierBoarding(0,true,false,0).canopy,0)
assert.equal(lib.sampleCarrierBoarding(0,true,false,1).canopy,1)
for(const landscape of[false,true])for(const key of['rocket','fast','gatling','laser','dreadnought','xwing','spaceEt','coreLander','coreLanderBurning','coreLanderElite','coreLanderBurningElite','rocketElite','fastElite','gatlingElite','laserElite','dreadnoughtElite','xwingElite','spaceEtElite','godGundam','spiegel'])for(const size of[70,120,180]){
 const mech = key === 'godGundam' || key === 'spiegel'
 const profile = lib.getCarrierCanopyProfile(key, landscape, mech)
 assert.ok(profile.outline.length >= 6, key + ' needs a trace of the real artwork')
 const g=lib.getCarrierBoardingGeometry(800,500,size,key,landscape,1,mech)
 const m=lib.getCarrierCockpitMount(key,landscape,mech)
 assert.equal(g.topY,g.cockpitY+size*m.h)
 assert.ok(g.footX<g.topX&&g.floorY>g.topY,'ladder must rise from deck to cockpit lip')
 assert.ok(Math.abs(g.cockpitX-(800+size*m.x))<1e-8)
}
// Exercising the actual draw path catches mirrored art, accidental full-atlas
// crops, and draw-order bugs that a coordinate-only check cannot see.
const canopyCtx = {
  calls: [], depth: 0, globalAlpha: 1,
  save(){this.depth++}, restore(){this.depth--}, translate(){}, rotate(){}, scale(){},
  beginPath(){}, moveTo(){}, lineTo(){}, closePath(){}, clip(){}, fillRect(){},
  drawImage(...args){this.calls.push(args)},
}
for (const landscape of [false,true]) {
 for (const [key,mech] of [['rocket',false],['laserElite',false],['coreLanderBurningElite',false],['godGundam',true],['spiegel',true]]) {
  canopyCtx.calls.length=0
  lib.drawCarrierCockpit(canopyCtx,200,300,160,key,landscape,0,mech,1)
  assert.equal(canopyCtx.calls.length,0,'closed hull is the original artwork')
  lib.drawCarrierCockpit(canopyCtx,200,300,160,key,landscape,1,mech,1)
  assert.equal(canopyCtx.depth,0)
  const [pit,pilot,glass]=canopyCtx.calls
  assert.equal(pit[0].id,'carrier-deck:cockpit')
  assert.equal(pilot[0].id,'carrier-deck:crew')
  assert.equal(glass[0].key,key)
  assert.equal(glass[0].view,mech?'mech':landscape?'side':'portrait')
  assert.ok(glass[1] >= (mech ? 768 : 0) && glass[1]+glass[3] <= glass[0].width)
  assert.ok(glass[2] >= 0 && glass[2]+glass[4] <= glass[0].height/(mech?2:1))
  assert.ok(glass[3] < glass[0].width/2 && glass[4] < glass[0].height/2,'draw only the real canopy pixels')
 }
 const rest=lib.sampleCanopyHinge(0,40,20,landscape), open=lib.sampleCanopyHinge(1,40,20,landscape)
 assert.equal(Math.abs(rest.rotation),0)
 assert.ok(Math.abs(open.rotation)>.9 && open.scaleY<1)
}
for (const blue of [false,true]) {
 const idle=lib.sampleDeckPatrolPose(0,false,blue)
 const walk=[0,6,12,18].map(distance=>lib.sampleDeckPatrolPose(distance,true,blue))
 assert.equal(idle,blue?0:4)
 assert.equal(new Set(walk).size,3)
 assert.ok(walk.every(frame=>frame>idle&&frame<=idle+3),'walk and idle use the same uniform row')
}
const servicePoses=Array.from({length:180},(_,i)=>lib.sampleDeckServicePoses(i/10))
assert.equal(new Set(servicePoses.map(p=>p.inspector)).size,4)
assert.equal(new Set(servicePoses.map(p=>p.bot)).size,4)
assert.ok(servicePoses.some(p=>p.welder===6)&&servicePoses.some(p=>p.welder===null))
assert.equal(lib.sampleCarrierBoarding(0,false,false,0).canopy,0,'an early launch cannot snap the canopy open')
for(const interval of[.2,.22,.32,.5]){
 assert.equal(lib.sampleMechAttack(interval,interval,true,false).stage,'release','actual shot reset must show release pose')
 assert.equal(lib.sampleMechAttack(.001,interval,true,false).stage,'charge','anticipation must precede the shot')
 const stages=new Set()
 for(let i=0;i<=120;i++)stages.add(lib.sampleMechAttack(interval*(1-i/120),interval,true,false).stage)
 assert.deepEqual([...stages],['release','recover','windup','charge'])
 for(const c of[0,interval/2,interval])assert.equal(lib.sampleMechAttack(c,interval,true,true).stage,'idle')
}
const ctx={depth:0,calls:[],globalAlpha:1,save(){this.depth++},restore(){this.depth--},translate(){},rotate(){},scale(){},drawImage(...a){this.calls.push(a)}}
for(const model of['godGundam','spiegel'])for(const burning of[false,true]){
 ctx.calls.length=0;lib.drawMechAction(ctx,model,burning,2,10,20,120,1,0,1)
 assert.equal(ctx.calls.length,1,'only one pose/hull may be drawn per frame')
 const a=ctx.calls[0];assert.deepEqual(a.slice(1,5),[0,512,768,512]);assert.equal(a[7]/a[8],1.5,'do not distort the frame to fit a slot')
 assert.equal(ctx.depth,0)
}
for(const file of Object.values(lib.MECH_ACTION_PATHS)){
 const b=readFileSync(new URL('../public/'+file,import.meta.url))
 assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&16,'atlas must have genuine alpha')
 assert.equal(b.readUIntLE(24,3)+1,1536);assert.equal(b.readUIntLE(27,3)+1,1024)
}
console.log('Boarding: cockpit/ladder close before ignition; measured mounts; four attack phases follow shot cooldown; one undistorted frame with alpha passed')
