import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const read = (file) => readFileSync(new URL('../'+file,import.meta.url),'utf8')
const load = (source, jsx=false) => import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:jsx?ts.JsxEmit.React:undefined}}).outputText).toString('base64'))
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
`+art
const atlas=await load(art)
await Promise.all([atlas.preloadCosmosArt(),atlas.preloadCosmosArt()])
assert.equal(atlas.loads,2);assert.equal(atlas.made,8)
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
const COSMIC_REGIONS=${JSON.stringify(regions.COSMIC_REGIONS)};
const cosmicRegionIndex=${cosmicRegionIndex.toString()},edgeFlyby=${edgeFlyby.toString()};
const frame={width:464,height:464};
const getCosmosBackdrop=i=>i>=0&&i<4?frame:undefined,getCosmosLandmark=getCosmosBackdrop;
const DEG=Math.PI/180,COMET_ASSET_HEAD_ANGLE=0;
const seededNoise=(i,s)=>((i*37+s*19)%100)/100;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export let sprites=0;
class Sprite {constructor(){sprites++;this.visible=false;this.anchor={set(){}};this.scale={set:(v)=>{this.scaleX=v}};this.position={set:(x,y)=>{this.x=x;this.y=y}}}}
class Texture {static WHITE=frame}
class Container {}
class Graphics {constructor(){this.position={set(){}}} clear(){} }
class RaidGpuForeground {}
class RaidTravelMotion {x=0;y=0;}
`+source
const background=await load(source)
const scene=new background.PixiRaidBackground()
scene.assetTextures.set('asteroid',{width:100,height:100})
const count=background.sprites
for(const [stage,region] of [[1,0],[5,1],[9,2],[13,3],[9101,1],[9102,2],[9103,3]]) for(const quality of ['low','medium','high']) {
 scene.cosmosRegion=region;scene.cosmosPrevious=(region+3)%4;scene.cosmosEntered=0
 for(const seconds of [0,.5,2,3,8,25,91,1e6]) {
  scene.updateGalaxies(1000,500,seconds,stage,quality==='low',quality==='medium')
  scene.updatePlanets(1000,500,seconds,background.DEFAULT_RAID_PALETTE,stage,quality==='low',quality==='medium')
  scene.updateScenic(1000,500,seconds,stage,quality==='low',quality==='medium')
  scene.updateBackgroundObjects(1000,500,seconds,stage,quality==='low',quality==='medium')
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
console.log('Cosmos: all regions and special arenas, two pooled atlas sources, transition bounds, rare passes and fixed sprite counts passed')
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
