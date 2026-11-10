import { TilingSprite as RealTilingSprite, Texture as RealTexture, TextureSource } from 'pixi.js'
const { setUvs: realTilingUvs } = await import(new URL('./scene/sprite-tiling/utils/setUvs.mjs', import.meta.resolve('pixi.js')))
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const read = (file) => readFileSync(new URL('../'+file,import.meta.url),'utf8')
const load = (source, jsx=false) => import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:jsx?ts.JsxEmit.React:undefined}}).outputText).toString('base64'))
const surface = await load(read('src/components/games/raid/surfaceMotion.ts'))
const material = await load(read('src/components/games/raid/sceneryMaterial.ts'))
const journey = await load(read('src/components/games/raid/journey.ts'))
const regions = await load(read('src/components/games/raid/cosmos.ts'))
const {cosmicRegionIndex,edgeFlyby,cosmicArrival}=regions
for (const [stage,index] of [[1,0],[4,0],[5,1],[8,1],[9,2],[12,2],[13,3],[15,3],[999,3],[9101,1],[9102,2],[9103,3],[NaN,0]]) assert.equal(cosmicRegionIndex(stage),index)
assert.match(cosmicArrival(5,true).name,/Pelagic/)
assert.match(cosmicArrival(10,true).name,/Cinder/)
assert.equal(cosmicArrival(5,false).name,'Amber Ringway')
for(let t=0;t<260;t+=.02) {
 const passes=[edgeFlyby(t,0),edgeFlyby(t,1)]
 assert.ok(passes.every(v=>v===-1||(v>=0&&v<1)))
 assert.ok(passes.filter(v=>v>=0).length<=1,'edge passes should be rare and staggered')
}
// Exercise the production atlas loader with texture stand-ins. Assert pooling and gutters.
let art=read('src/components/games/raid/cosmosArt.ts').replace(/^import .*\n/gm,'')
art=`
export let loads=0, made=0;
class Rectangle { constructor(x,y,width,height){Object.assign(this,{x,y,width,height})} }
class Texture {constructor(options){made++;Object.assign(this,options)}}
const Assets={load:async()=>{loads++;return {width:1024,height:1024,source:{}}}};
const getPublicAssetUrl=p=>p;
const bakeSceneryLighting=()=>null;
`+art
const atlas=await load(art)
await Promise.all([atlas.preloadCosmosArt(),atlas.preloadCosmosArt()])
assert.equal(atlas.loads,3);assert.equal(atlas.made,12)
assert.equal(atlas.getJourneyPlanet(0).source,atlas.getJourneyPlanet(1).source)
assert.equal(atlas.getJourneyPlanet(0).source,atlas.getJourneySurface(0).source)
assert.equal(atlas.getJourneyPlanet(0).frame.width,464)
assert.equal(atlas.getJourneySurface(1).frame.width,504)
for(let i=0;i<4;i++) {
 const tile=atlas.getCosmosBackdrop(i),landmark=atlas.getCosmosLandmark(i)
 assert.equal(tile.frame.width,504);assert.equal(landmark.frame.width,464)
 assert.equal(tile.source.autoGenerateMipmaps,false)
 assert.equal(tile.source,atlas.getCosmosBackdrop(0).source)
 assert.equal(landmark.source,atlas.getCosmosLandmark(0).source)
}
// Use real scene methods, stubbing Pixi objects only: no browser/device FPS claim.
let source=read('src/components/games/raid/background.ts').replace(/^import .*\n/gm,'')
source=`
const unit=v=>Math.max(0,Math.min(1,v));
const sceneryTint=${material.sceneryTint.toString()};
const createRaidJourneyView=${journey.createRaidJourneyView.toString()};
const ease=n=>{const t=unit(n);return t*t*(3-2*t)};
const JOURNEY_CLEAR_SECONDS=3.15;
const getRaidStageEntrySeconds=${journey.getRaidStageEntrySeconds.toString()};
const sampleRaidJourney=${journey.sampleRaidJourney.toString()};
const createSurfaceCameraFrame=${surface.createSurfaceCameraFrame.toString()};
const positiveSurfaceModulo=${surface.positiveSurfaceModulo.toString()};
const sampleSurfaceCamera=${surface.sampleSurfaceCamera.toString()};
const getSurfaceIslandY=${surface.getSurfaceIslandY.toString()};
const PLANET_DEPTH=[30,20,10],PLANET_PARALLAX=[.018,.009,.004];
const COSMIC_REGIONS=${JSON.stringify(regions.COSMIC_REGIONS)};
const cosmicRegionIndex=${cosmicRegionIndex.toString()},edgeFlyby=${edgeFlyby.toString()};
const frame={width:512,height:512};
const getCosmosBackdrop=i=>i>=0&&i<4?frame:undefined,getCosmosLandmark=getCosmosBackdrop,getCosmosBloom=getCosmosBackdrop,getJourneyPlanet=getCosmosBackdrop,getJourneySurface=getCosmosBackdrop,getJourneyBloom=getCosmosBackdrop,getSurfaceTerrain=()=>globalThis.__surfaceTestTexture??frame;
const DEG=Math.PI/180,COMET_ASSET_HEAD_ANGLE=0;
const seededNoise=(i,s)=>((i*37+s*19)%100)/100;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export let sprites=0;
class Sprite {
 constructor(){sprites++;this.visible=false;this.texture=frame;this.zIndex=0;this.scaleX=this.scaleY=1;this.anchor={set(){}};this.scale={set:(x,y=x)=>{this.scaleX=x;this.scaleY=y}};this.position={set:(x,y)=>{this.x=x;this.y=y}}}
 get width(){return this.texture.width*this.scaleX} set width(v){this.scaleX=v/this.texture.width}
 get height(){return this.texture.height*this.scaleY} set height(v){this.scaleY=v/this.texture.height}
}
class TilingSprite extends Sprite {
 constructor(){super();this._width=this._height=1;this.tileScale={set:(x,y=x)=>{this.tileScale.x=x;this.tileScale.y=y}};this.tilePosition={set:(x,y)=>{this.tilePosition.x=x;this.tilePosition.y=y}}}
 get width(){return this._width} set width(v){this._width=v}
 get height(){return this._height} set height(v){this._height=v}
}
class Texture {static WHITE=frame}
class Container {constructor(){this.position={set(){}};this.pivot={set(){}};this.scale={set(){}}} }
class Graphics {constructor(){this.position={set(){}}} clear(){} }
class RaidGpuForeground {}
class RaidTravelMotion {x=0;y=0;}
`+source
const background=await load(source)
const scene=new background.PixiRaidBackground()
scene.planetSprites.forEach((sprite,i)=>sprite.zIndex=material.PLANET_DEPTH[i])
for(const key of ['asteroid','planet1','planet2','planet3','planet4','planet5','planetNebula','spaceStation','sun'])scene.assetTextures.set(key,{width:400,height:400})
const count=background.sprites
for(const [stage,region] of [[1,0],[5,1],[9,2],[13,3],[9101,1],[9102,2],[9103,3]]) for(const quality of ['low','medium','high']) {
 scene.cosmosRegion=region;scene.cosmosPrevious=(region+3)%4;scene.cosmosEntered=0
 for(const seconds of [0,.5,2,3,8,25,91,1e6]) {
  scene.updateGalaxies(1000,500,seconds,stage,quality==='low',quality==='medium')
  scene.updatePlanets(1000,500,seconds,background.DEFAULT_RAID_PALETTE,stage,quality==='low',quality==='medium')
  scene.updateWrecks(1000,500,seconds,stage,quality==='low',quality==='medium')
  scene.updateScenic(1000,500,seconds,stage,quality==='low',quality==='medium')
  scene.updateBackgroundObjects(1000,500,seconds,stage,quality==='low',quality==='medium')
  scene.updateSceneryBloom(stage,quality==='low',quality==='medium')
  for(const sprite of [...scene.planetSprites,...scene.wreckSprites,...scene.scenicSprites,...scene.asteroidSprites,...scene.debrisSprites].filter(s=>s.visible)) assert.equal(sprite.alpha,1,'solid scenery became transparent')
  assert.ok(scene.sceneryBloomSprites.filter(s=>s.visible).length <= (quality==='low'?0:quality==='medium'?1:2))
  const galaxies=scene.galaxySprites.filter(s=>s.visible)
  if(stage!==9101&&stage!==9102) {
   assert.equal(galaxies.length,quality==='low'||seconds>=2.4?1:2)
   assert.equal(scene.baseGraphics!==undefined,true)
  } else assert.equal(galaxies.length,0,'space art must not overwrite surface arenas')
  const all=[...scene.galaxySprites,...scene.planetSprites,...scene.scenicSprites,...scene.asteroidSprites,...scene.debrisSprites]
  for(const sprite of all.filter(s=>s.visible)) {
   assert.ok(Number.isFinite(sprite.x)&&Number.isFinite(sprite.y)&&Number.isFinite(sprite.scaleX))
   assert.ok(sprite.alpha>=0&&sprite.alpha<=1)
  }
 }
}
assert.equal(background.sprites,count,'scene updates allocated new sprites')
assert.ok(scene.planetSprites[0].zIndex>scene.planetSprites[1].zIndex && scene.planetSprites[1].zIndex>scene.planetSprites[2].zIndex,'near planets must occlude far planets')
scene.cosmosRegion=0;scene.travel.near=300;scene.travel.rush=0
scene.updateSpeedLines(1000,500,false,false,1)
assert.ok(scene.speedLineSprites.some(s=>s.visible&&s.alpha>0),'cruise speed lines are missing')
const line=scene.speedLineSprites.find(s=>s.visible&&s.alpha>0),beforeY=line.y,beforeAlpha=line.alpha
scene.travel.near+=1;scene.updateSpeedLines(1000,500,false,false,1)
assert.ok(line.y>beforeY,'speed lines must follow forward travel, not radiate sideways')
const cruiseY=line.y
scene.travel.rush=1;scene.updateSpeedLines(1000,500,false,false,1)
assert.equal(line.y,cruiseY,'changing rush strength teleported the line phase')
assert.ok(line.alpha>beforeAlpha,'rush lines must be stronger than cruise')
assert.equal(line.rotation,0)
scene.reducedMotion=true;scene.updateSpeedLines(1000,500,false,false,1)
assert.ok(scene.speedLineSprites.every(s=>!s.visible))
scene.reducedMotion=false
// Full render orchestration: region clocks remain continuous between neighboring stages.
scene.app={renderer:{resize(){}},canvas:{style:{}}};scene.travel.update=()=>{}
for(const method of ['updateBaseGraphics','updateNebula','updateBossTint','updateAmbientGlows','updateSurface','updateFinalBattleBackdrop','updateFinalBattleLayer','updateAmbientExplosions','updateStarfield','updateSpeedLines','updateWrecks','updateRareCometFlyby','updateWateryWorldAssetSprites','updateVolcanicWorldAssetSprites']) scene[method]=()=>{}
const renderFrame=(stage,time,runToken=1)=>scene.render({width:1000,height:500,dpr:1,palette:background.DEFAULT_RAID_PALETTE,quality:'high',stageTheme:stage,time,runToken,stageRush:0,bossIntensity:0,devilCorruption:0})
assert.equal(renderFrame(1,1000),true)
assert.equal(scene.cosmosEntered,1)
assert.equal(renderFrame(2,2000),true)
assert.equal(scene.cosmosEntered,1,'same-region stage transition teleported the orbital reveal')
assert.equal(renderFrame(2,3000,2),true)
assert.equal(scene.cosmosEntered,3,'new run failed to reset the orbital reveal')
assert.equal(renderFrame(9101,4000,2),true)
assert.equal(renderFrame(6,5000,2),true)
assert.equal(scene.cosmosEntered,5,'leaving a surface arena failed to reveal its region')
// Real render orchestration for a linked campaign journey; one world plane, no new per-frame sprites.
const travelFrame=(stage,theme,age,clear=0,entry=0)=>scene.render({width:1000,height:500,dpr:1,palette:background.DEFAULT_RAID_PALETTE,quality:'high',stageTheme:theme,time:age*1000+10000,runToken:10,stageNumber:stage,raidMode:'campaign',stageAge:age,clearRemaining:clear,entryRemaining:entry,stageRush:clear>0?1:0,bossIntensity:0,devilCorruption:0})
assert.equal(travelFrame(2,2,0),true);const distant=scene.planetSprites[0].width
assert.equal(travelFrame(4,4,30),true);assert.ok(scene.planetSprites[0].width>distant)
assert.equal(travelFrame(4,4,33,1e-8),true)
assert.ok(scene.worldScene.visible && scene.worldScene.alpha>0 && scene.worldScene.alpha<1)
const approachWidth=scene.planetSprites[0].width
assert.equal(travelFrame(5,9101,0,0,2.4),true)
assert.ok(Math.abs(scene.planetSprites[0].width-approachWidth)<.001,'orbital/surface handoff jumped in render dimensions')
assert.equal(travelFrame(5,9101,3),true)
assert.equal(scene.skyScene.visible,false);assert.equal(scene.solidScenery.visible,false);assert.equal(scene.worldScene.alpha,1)
assert.equal(travelFrame(5,9101,40,1e-8),true)
const departureX=scene.planetSprites[1].x,departureSize=scene.planetSprites[1].width
assert.equal(travelFrame(6,6,0,0,1.18),true)
assert.ok(Math.abs(scene.planetSprites[1].x-departureX)<.001 && Math.abs(scene.planetSprites[1].width-departureSize)<.001)
const frozen=JSON.stringify(scene.journey)
assert.equal(travelFrame(6,6,0,0,1.18),true);assert.equal(JSON.stringify(scene.journey),frozen,'frozen game time advanced the journey')
assert.equal(background.sprites,count,'journey render allocated additional sprites')
scene.fillRadial=()=>{};scene.drawFinalBattleWeaponProfile=()=>{};scene.drawFinalBattleCruiserTrail=()=>{}
scene.finalBattleTextures.get=()=>({width:128,height:128})
scene.updateFinalBattleLayer(1000,500,10,9103,'high',.68)
for(const sprite of [...scene.finalBattleSprites,...scene.finalBattleCruiserSprites].filter(s=>s.visible))assert.equal(sprite.alpha,1,'background battle hull became transparent')
// Exercise the actual ground render methods and UV assignments in both orientations.
const ground=new background.PixiRaidBackground()
globalThis.__surfaceTestTexture=new RealTexture({source:new TextureSource({width:512,height:512})})
ground.journeySurfaceSprite=new RealTilingSprite({texture:globalThis.__surfaceTestTexture,width:1,height:1})
const uvAtLandmark=(plane,landmark)=>{
 const uv=new Float32Array(8);realTilingUvs(plane,uv)
 const x=(landmark.x-plane.x)/plane.width,y=(landmark.y-plane.y)/plane.height
 return [uv[0]+x*(uv[2]-uv[0]),uv[1]+y*(uv[7]-uv[1])]
}
const assertSameUv=(a,b)=>{for(let i=0;i<2;i++){const d=surface.positiveSurfaceModulo(a[i]-b[i],1);assert.ok(Math.min(d,1-d)<2e-6,'real Pixi texture slid under its island')}}
for(const key of ['octiIsland','island','island2','island3','snakeVolcano','volcano','volcano2','volcano3','clouds','clouds2','volcanicClouds','volcanicClouds2'])ground.assetTextures.set(key,{width:256,height:256})
const groundCount=background.sprites
for(const [w,h] of [[390,844],[1280,720]])for(const watery of [true,false]) {
 const step=(t,x=0,y=0)=>{
  surface.sampleSurfaceCamera(t,w,h,1.5,x,y,512,ground.surfaceCamera)
  if(watery)ground.updateWateryWorldAssetSprites(w,h,t,'high')
  else ground.updateVolcanicWorldAssetSprites(w,h,t,'high')
  ground.updateJourneyWorld(w,h,watery?9101:9102)
 }
 step(10)
 const islands=watery?ground.wateryIslandSprites:ground.volcanicIslandSprites
 const landmark=islands[1],beforeY=landmark.y,beforeX=landmark.x
 const plane=ground.journeySurfaceSprite,uv0=plane.tilePosition.y,period=ground.surfaceCamera.tileSize
 const anchoredUv=uvAtLandmark(plane,landmark)
 step(11)
 assertSameUv(anchoredUv,uvAtLandmark(plane,landmark))
 const delta=landmark.y-beforeY
 const uvDelta=surface.positiveSurfaceModulo(plane.tilePosition.y-uv0,period)
 assert.ok(Math.abs(uvDelta-surface.positiveSurfaceModulo(delta,period))<1e-8,'production terrain/island scroll diverged')
 assert.equal(plane.tileScale.x,plane.tileScale.y,'portrait texture was stretched anisotropically')
 assert.ok(plane.tileScale.x*1.5*1.45<=1+1e-9,'production portrait terrain was upscaled')
 assert.equal(landmark.alpha,1,'water/rock showed through a ground landmark')
 const oldX=plane.tilePosition.x,oldY=plane.tilePosition.y,islandY=landmark.y
 step(11,.6,-.4)
 assertSameUv(anchoredUv,uvAtLandmark(plane,landmark))
 assert.ok(Math.abs(surface.positiveSurfaceModulo(plane.tilePosition.x-oldX,period)-surface.positiveSurfaceModulo(landmark.x-beforeX,period))<1e-8,'ground horizontal steering slipped')
 assert.ok(Math.abs(surface.positiveSurfaceModulo(plane.tilePosition.y-oldY,period)-surface.positiveSurfaceModulo(landmark.y-islandY,period))<1e-8,'ground vertical steering slipped')
}
assert.equal(background.sprites,groundCount,'surface rendering grew the sprite pool')
ground.journeySurfaceSprite.destroy();globalThis.__surfaceTestTexture.destroy(true);delete globalThis.__surfaceTestTexture
console.log('Cosmos: all regions and special arenas, three pooled atlas sources, transition bounds, rare passes and fixed sprite counts passed')
// Hook harness checks actual component lifecycle without a browser/audio device.
const hooks=[],effects=[];let cursor=0,changed=false,tick,hidden=false,enabled=true,disposed=0,plays=0;
const audioObjects=[]
globalThis.__cosmosHarness={
 useRef(value){const i=cursor++;return hooks[i]??(hooks[i]={current:value})},
 useState(value){const i=cursor++;if(!(i in hooks)) hooks[i]=value;return [hooks[i],v=>{hooks[i]=typeof v==='function'?v(hooks[i]):v;changed=true}]},
 useEffect(fn,deps){const i=cursor++,old=hooks[i];if(!old||deps.some((v,j)=>v!==old[j])){hooks[i]=deps;effects.push(fn)}},
 createElement(type,props,...children){return {type,props,children}},
 getMix:()=>({master:1,bgm:.8}),getEnabled:()=>enabled,
}
const documentBefore=globalThis.document,windowBefore=globalThis.window,audioBefore=globalThis.Audio
const listeners=new Map()
globalThis.document={get hidden(){return hidden},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)}
globalThis.window={setInterval:fn=>{tick=fn;return 1},clearInterval:()=>{tick=undefined}}
globalThis.Audio=class {
 paused=true;volume=0;
 constructor(){audioObjects.push(this)}
 play(){this.paused=false;plays++;return Promise.resolve()}
 pause(){this.paused=true}
 removeAttribute(){disposed++}
 load(){}
}
let component=read('src/components/games/raid/CosmosPresentation.tsx').replace(/^import .*\n/gm,'')
component=`const {useEffect,useRef,useState,createElement,getMix:getGameAudioMixSettings,getEnabled:getGameSoundEnabled}=globalThis.__cosmosHarness;
const React={createElement},getPublicAssetUrl=p=>p;
const COSMIC_REGIONS=${JSON.stringify(regions.COSMIC_REGIONS)};
const cosmicRegionIndex=${cosmicRegionIndex.toString()},cosmicArrival=${cosmicArrival.toString()};
`+component
const {CosmosPresentation}=await load(component,true)
const cleanups=[]
function render(stage,phase='playing') {
 let node
 do {
  cursor=0;changed=false
  node=CosmosPresentation({stage,phase,surfaceArenas:true,bossActive:false})
  for(const fn of effects.splice(0)){const cleanup=fn();if(cleanup)cleanups.push(cleanup)}
 }while(changed)
 return node
}
try {
 const initial=render(1,'select').props.key
 const start=render(1).props.key
 assert.notEqual(initial,start,'arrival must play when starting stage 1 after sitting in menus')
 tick();await Promise.resolve();await Promise.resolve()
 assert.equal(audioObjects.length,1)
 assert.equal(audioObjects[0].paused,false)
 assert.ok(audioObjects[0].volume>0&&audioObjects[0].volume<.1)
 render(1,'paused');tick();assert.equal(audioObjects[0].paused,true)
 assert.equal(render(1).props.key,start,'arrival restarted after pause')
 assert.notEqual(render(6).props.key,start)
 hidden=true;listeners.get('visibilitychange')();assert.equal(audioObjects[0].volume,0)
 hidden=false;enabled=false;tick();assert.equal(audioObjects[0].paused,true)
 assert.equal(audioObjects.length,1,'stage changes allocated additional audio decoders')
 cleanups.forEach(fn=>fn());assert.equal(disposed,1);assert.equal(tick,undefined);assert.equal(listeners.size,0)
 console.log('Cosmos UI/audio: first arrival, pause/resume, one decoder, mute/visibility and teardown passed')
}finally {
 globalThis.document=documentBefore;globalThis.window=windowBefore;globalThis.Audio=audioBefore;delete globalThis.__cosmosHarness
}
