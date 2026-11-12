import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
let source=readFileSync(new URL('../src/components/games/raid/playerRender.ts',import.meta.url),'utf8')
source=source.replace(/^import .*\n/gm,'')
const artwork=readFileSync(new URL('../src/components/games/raid/shipArtwork.ts',import.meta.url),'utf8')
const muzzle=readFileSync(new URL('../src/components/games/raid/playerMuzzle.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'')
source=`
const WIDTH=100, HEIGHT=100, DEG=Math.PI/180, PLAYER_COLOR='#ef233c';
const updateFlightPose=(pose)=>{pose.maneuverJet=globalThis.testManeuverJet??0;return 0};
const GOD_GUNDAM_BURNING_BODY_SCALE=1.09,GOD_GUNDAM_BURNING_BODY_Y_OFFSET=-.064;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const isCoreLanderBurning=()=>false, getCoreLanderBurningRage=()=>0;
const getShipCanvasSprite=()=>({});
const getRaidSideShipCanvasSprite=()=>({loaded:true}),getRaidSideShipNozzles=()=>[[.10,.22,.05]],drawCanvasSpriteContain=(ctx,sprite,x,y,size)=>ctx.hulls.push(size);
const getOptionSupportStacks=()=>1,getShipSpriteSize=()=>30;
const getRaidCombatFrame=()=>({source:{resource:{}}});
const COMBAT_TILE={exhaust:12};
const drawRaidCombatTexture=(ctx,...args)=>{ctx.images.push(args);return true};
const drawCanvasSprite=()=>{},drawSpriteGlow=()=>{};
const hexToRgba=()=>'';
`+artwork+'\n'+muzzle+'\n'+source
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {drawRaidPlayer,drawRaidOptions,drawSupportEngineTrail,drawPlayerEngine,getRaidShipNozzles,getRaidPlayerHullSize,getRaidShipBaseVisualKey,warmRaidEngineExhaust}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')).catch(error=>{console.error(error.message);process.exit(1)})
function context(){
 const ctx={images:[],hulls:[],gradients:0,depth:0,globalAlpha:1,
 drawImage(...args){this.images.push(args)},fillRect(){},
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
const hullKeys=['rocket','fast','gatling','laser','dreadnought','xwing','spaceEt','mesiahBlack','mesiahWhite','coreLander']
const combatKeys=['godGundam','spiegel']
const assertAtlasMount = ([,x,centerY,length,width],[offsetX,offsetY,aperture],size,y) => {
 assert.ok(Math.abs(x-width*(.5-.452)-(500+size*offsetX))<1e-9,'wake shifted horizontally')
 assert.ok(Math.abs(centerY-length*(.5-.25)-(y+size*offsetY))<1e-9,'boost moved the exhaust root away from its nozzle')
 assert.ok(Math.abs(width*.12-size*aperture)<1e-9,'boost widened the exhaust at the nozzle')
}
const regularCosmetics={trail:false,aura:false,frame:false}
for(const key of [...hullKeys,...hullKeys.map(key=>key+'Elite'),...combatKeys]) {
 const base=getRaidShipBaseVisualKey(key)
 const shipKey=combatKeys.includes(key) ? 'coreLander' : base.startsWith('mesiah') ? 'mesiah' : base
 for(const viewportWidth of [420,1000]) for(const boost of [0,0.5,1.35]) {
  const ctx=context()
  drawRaidPlayer(ctx,{...player,ship:{key:shipKey},engineBoost:boost},'playing',v=>v*10,v=>v*5,viewportWidth,1100+boost,'#ef233c',regularCosmetics,key)
  const nozzles=getRaidShipNozzles(key)
  const size=getRaidPlayerHullSize(shipKey,viewportWidth)*(combatKeys.includes(key)?1.08:1)
  assert.equal(ctx.images.length,nozzles.length,key+' emitted at an unexpected number of outlets')
  for(const [i,nozzle] of nozzles.entries()) assertAtlasMount(ctx.images[i],nozzle,size,350)
 }
}
// Side-view thruster roots stay attached when the configured ship size changes.
for(const sizeScale of [1,1.2,1.5]) {
 const ctx=context()
 drawRaidPlayer(ctx,{...player,sizeScale},'playing',v=>v*10,v=>v*5,420,1100,'#ef233c',regularCosmetics,'rocket',null,null,0,0,false,true)
 const size=getRaidPlayerHullSize('rocket',420,true,sizeScale)
 assert.equal(ctx.images.length,1)
 assertAtlasMount(ctx.images[0],[.10,.22,.05],size,350)
}
// Scout artwork and exhaust use the same configured size.
for(const sizeScale of [1,1.2,1.5]) {
 const ctx=context()
 drawRaidOptions(ctx,{...player,sizeScale},v=>v*10,v=>v*5,420,1100,'#ef233c','rocket',true)
 const scoutSize=Math.min(30*1.28,36)*1.15*sizeScale
 assert.equal(ctx.hulls.length,2)
 assert.equal(ctx.images.length,2)
 for(const size of ctx.hulls) assert.ok(Math.abs(size-scoutSize)<1e-9)
 for(const [,left,top,width,length] of ctx.images) {
  assert.ok(Math.abs(left+width*.452-scoutSize*.10)<1e-9)
  assert.ok(Math.abs(top+length*.25-scoutSize*.22)<1e-9)
  assert.ok(Math.abs(width*.12-scoutSize*.05)<1e-9)
 }
}
for(const [baseKey,burningKey] of [['coreLander','coreLanderBurning'],['coreLanderElite','coreLanderBurningElite'],['godGundam','godGundamBurning']]) {
 const ctx=context()
 const blend=.025
 const gundam=baseKey==='godGundam'
 const baseSize=getRaidPlayerHullSize('coreLander',420)*(gundam?1.08:1)
 const burnSize=baseSize*(gundam?1.09:1+.06*blend)
 const burnY=gundam?350-baseSize*.064:350
 drawRaidPlayer(ctx,{...player,ship:{key:'coreLander'},burningBlend:blend},'playing',v=>v*10,v=>v*5,420,1100,'#ef233c',regularCosmetics,baseKey)
 const baseNozzles=getRaidShipNozzles(baseKey)
 const burnNozzles=getRaidShipNozzles(burningKey)
 assert.equal(ctx.images.length,baseNozzles.length+burnNozzles.length)
 for(const [i,nozzle] of baseNozzles.entries()) assertAtlasMount(ctx.images[i],nozzle,baseSize,350)
 for(const [i,nozzle] of burnNozzles.entries()) assertAtlasMount(ctx.images[baseNozzles.length+i],nozzle,burnSize,burnY)
}
for(const side of [-1,1]) {
 globalThis.testManeuverJet=side
 const ctx=context()
 const moves=[],rotations=[]
 ctx.translate=(...args)=>moves.push(args)
 ctx.rotate=(angle)=>rotations.push(angle)
 drawRaidPlayer(ctx,player,'playing',v=>v*10,v=>v*5,420,1100,'#ef233c',regularCosmetics,'rocket')
 const nozzles=getRaidShipNozzles('rocket')
 const [x,y,aperture]=nozzles[side>0?0:nozzles.length-1]
 const size=getRaidPlayerHullSize('rocket',420)
 assert.equal(ctx.images.length,nozzles.length+1)
 assert.deepEqual(moves.at(-1),[500+size*(x-side*aperture*.33),350+size*(y-aperture*.12)])
 assert.equal(rotations.at(-1),side*Math.PI/3)
}
delete globalThis.testManeuverJet
const masteryCanvases=[]
globalThis.document={createElement(){
 const ctx=context()
 const canvas={ctx,getContext(){return ctx}}
 masteryCanvases.push(canvas)
 return canvas
}}
const ark={...player,ship:{key:'dreadnought'}}
const renderSignature = (visualKey,time,boost) => {
 const ctx=context()
 drawRaidPlayer(ctx,{...ark,engineBoost:boost},'playing',v=>v*10,v=>v*5,420,time,'#ef233c',{trail:true,aura:false,frame:false},visualKey)
 assert.equal(ctx.images.length,1,'the Ark has one main nozzle')
 assert.equal(ctx.gradients,0,'signature wake should reuse its baked plume')
 return ctx.images[0]
}
const signatureIdle=renderSignature('dreadnought',0,0)
const signatureBoost=renderSignature('dreadnought',0,1.35)
assert.equal(signatureIdle[0],signatureBoost[0])
assert.ok(Math.abs(signatureBoost[4]/signatureIdle[4]-(1+1.35*.36))<1e-9,'signature trail lost its original boost response')
assert.equal(renderSignature('dreadnoughtElite',1500,0)[0],signatureIdle[0])
assert.equal(masteryCanvases.length,2)
const [wake,texture]=masteryCanvases
assert.equal(wake.ctx.gradients,2,'original core and bloom are baked into the signature')
assert.equal(texture.ctx.gradients,1)
assert.equal(wake.ctx.images[0][0],texture,'signature texture was not combined with the original bloom')
assert.equal(texture.ctx.globalCompositeOperation,'source-in','atlas plume should take the ship palette')
const [,left,top,width,length]=signatureIdle
assert.equal(left+width/2,500)
assert.ok(Math.abs(top+length*18/116-(350+62*1.16*(274-144)/288))<1e-9,'signature trail detached from the Ark outlet')
delete globalThis.document

const heatCanvases=[]
globalThis.document={createElement(){
 const ctx=context()
 const canvas={getContext(){return ctx}}
 heatCanvases.push({canvas,ctx})
 return canvas
}}
warmRaidEngineExhaust()
warmRaidEngineExhaust()
assert.equal(heatCanvases.length,7)
assert.equal(new Set(heatCanvases.map(({ctx})=>ctx.filter)).size,7)
const thermalDraw = (boost) => {
 const ctx=context()
 ctx.drawImage=(...args)=>ctx.images.push(args)
 drawPlayerEngine(ctx,30,100,50,0,boost,6)
 assert.equal(ctx.images.length,1)
 assert.equal(ctx.gradients,0)
 return ctx.images[0]
}
const idle=thermalDraw(0)
const boosted=thermalDraw(1.35)
assert.notEqual(idle[0],boosted[0],'boost never changes the flame palette')
assert.ok(idle[4] < boosted[4] / 2,'idle plume should be compact')
assert.equal(idle[3],boosted[3])
assert.ok(Math.abs(idle[1]+idle[3]*.452-30)<1e-9,'cached atlas hot core shifted away from the nozzle')
assert.equal(idle[2]+idle[4]*.25,boosted[2]+boosted[4]*.25)

for(const key of ['mesiahRaptorBlack','mesiahRaptorWhite','rocket','spaceEt','godGundam','spiegel']) {
 const ctx=context()
 const rotations=[]
 ctx.rotate=(angle)=>rotations.push(angle)
 ctx.drawImage=(...args)=>ctx.images.push(args)
 drawSupportEngineTrail(ctx,64,40,32,0,.6,.82,key,.06)
 const vents=getRaidShipNozzles(key)
 assert.equal(ctx.images.length,vents.length)
 assert.deepEqual(rotations,[.6])
 for(const [i,[x,y,aperture]] of vents.entries()) {
  const [,left,top,width,length]=ctx.images[i]
  assert.ok(Math.abs(left+width*.452-32*x)<1e-9)
  assert.ok(Math.abs(top+length*.25-32*y)<1e-9)
  assert.ok(Math.abs(width*.12-32*aperture)<1e-9)
 }
}
delete globalThis.document
console.log('Engine: shorter idle, heat ramp, mounted scout exhaust, aligned atlas hot core, layered signature, and bounded bitmap draws passed')

} catch(error) { console.error(error.message); process.exit(1) }
