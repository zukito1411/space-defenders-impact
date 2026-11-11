import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
let source=readFileSync(new URL('../src/components/games/raid/playerRender.ts',import.meta.url),'utf8')
source=source.replace(/^import .*\n/gm,'')
const artwork=readFileSync(new URL('../src/components/games/raid/shipArtwork.ts',import.meta.url),'utf8')
const muzzle=readFileSync(new URL('../src/components/games/raid/playerMuzzle.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'')
source=`
const WIDTH=100, HEIGHT=100, DEG=Math.PI/180, PLAYER_COLOR='#ef233c';
const updateFlightPose=()=>0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const isCoreLanderBurning=()=>false, getCoreLanderBurningRage=()=>0;
const getShipCanvasSprite=()=>({});
const getRaidCombatFrame=()=>({});
const COMBAT_TILE={exhaust:12};
const drawRaidCombatTexture=(ctx,...args)=>{ctx.images.push(args);return true};
const drawCanvasSprite=()=>{},drawSpriteGlow=()=>{};
const hexToRgba=()=>'';
`+artwork+'\n'+muzzle+'\n'+source
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {drawRaidPlayer,getRaidShipNozzles}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')).catch(error=>{console.error(error.message);process.exit(1)})
function context(){
 const ctx={images:[],gradients:0,depth:0,globalAlpha:1,
 save(){this.depth++},restore(){this.depth--},translate(){},rotate(){},
 createLinearGradient(){this.gradients++;return {addColorStop(){}}},
 beginPath(){},moveTo(){},bezierCurveTo(){},closePath(){},fill(){}}
 return ctx
}
const player={x:50,y:70,hp:3,ship:{key:'rocket'},engineBoost:1,forceField:0,shield:0,invuln:0}
try {
for(const trail of [false,true]) {
 const ctx=context()
 const count=getRaidShipNozzles('rocket').length
 drawRaidPlayer(ctx,player,'playing',v=>v*10,v=>v*5,1000,1000,'#ef233c',{trail,aura:false,frame:false},'rocket')
 assert.equal(ctx.images.length,trail?0:count,'base engine duplicated the equipped cosmetic trail')
 assert.equal(ctx.gradients,trail?count*2:0,'unexpected procedural exhaust work')
 assert.equal(ctx.depth,0,'ship draw leaked its bank transform')
}
for(const key of ['rocket', 'rocketElite', 'xwingElite']) for(const boost of [0,0.5,1.35]) {
 const ctx=context()
 drawRaidPlayer(ctx,{...player,engineBoost:boost},'playing',v=>v*10,v=>v*5,1000,1100+boost,'#ef233c',{trail:false,aura:false,frame:false},key)
 const nozzles=getRaidShipNozzles(key)
 assert.equal(ctx.images.length,nozzles.length)
 for(const [i,[offsetX,offsetY,aperture]] of nozzles.entries()) {
  const [,x,centerY,length,width]=ctx.images[i]
  const size=76*1.16
  assert.ok(Math.abs(x-(500+size*offsetX))<1e-9,'wake shifted horizontally')
  assert.ok(Math.abs(centerY-length*.25-(350+size*offsetY))<1e-9,'boost moved the exhaust root away from its nozzle')
  assert.ok(Math.abs(width*.12-size*aperture)<1e-9,'boost widened the exhaust at the nozzle')
 }
}
const bakeCtx=context()
let baked=0
globalThis.document={createElement(){baked++;return {getContext(){return bakeCtx}}}}
for(let i=0;i<3;i++){
 const ctx=context()
 ctx.drawImage=(...args)=>ctx.images.push(args)
 drawRaidPlayer(ctx,player,'playing',v=>v*10,v=>v*5,1000,1000+i,'#ef233c',{trail:true,aura:false,frame:false},'rocketElite')
 assert.equal(ctx.images.length,2)
 assert.equal(ctx.gradients,0,'mastery wake should reuse its baked plume')
}
delete globalThis.document
assert.equal(baked,1)
assert.equal(bakeCtx.gradients,2)
console.log('Engine: one treatment per nozzle, no extra live gradients, anchored boost and balanced transforms passed')

} catch(error) { console.error(error.message); process.exit(1) }
