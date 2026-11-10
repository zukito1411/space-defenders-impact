import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createHash } from 'node:crypto'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const load=source=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'))
const varietySource=read('src/components/games/raid/wreckVariety.ts')
const v=await load(varietySource)
assert.equal(new Set(v.WRECK_DESIGNS).size,9)
const manifest=JSON.parse(read('docs/wreck-art-manifest.json'))
for(const asset of manifest.assets) {
 const bytes=readFileSync(new URL('../'+asset.path,import.meta.url))
 assert.equal(bytes.length,asset.bytes)
 assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256)
 assert.equal(bytes.toString('ascii',12,16),'VP8X')
 assert.equal(bytes.readUIntLE(24,3)+1,1024)
 assert.equal(bytes.readUIntLE(27,3)+1,1024)
 for(const [x,y,w,h] of asset.content_rects) {
  assert.ok(w<=456&&h<=456)
  assert.ok(x%512>=28&&y%512>=28)
  assert.ok(x%512+w<=484&&y%512+h<=484)
 }
}
for(let seed=0;seed<100;seed++) for(const [family,count,min] of [['all',9,0],['ship',4,0],['station',5,4]]) {
 const ids=Array.from({length:count},(_,pass)=>v.sceneryWreckDesign(seed,2,pass,family))
 assert.equal(new Set(ids).size,count,'pass selection repeats before cycling every design')
 assert.ok(ids.every(id=>id>=min&&id<min+count))
}
for(let previous=-1;previous<9;previous++) {
 const seen=new Set()
 for(let n=0;n<=10000;n++) {
  const id=v.pickGameplayWreckVariant(n/10000,previous)
  assert.ok(id>=0&&id<9);assert.notEqual(id,previous)
  seen.add(id)
 }
 assert.equal(seen.size,previous===-1?9:8)
}
// Exercise production image/Canvas/Pixi loader; fake devices only, no GPU/FPS claims.
const loader=varietySource+`
export let imagesMade=0,roots=0,crops=0;
class Image {
 constructor(){imagesMade++;this.naturalWidth=this.naturalHeight=1024}
 set src(url){this.url=url;queueMicrotask(()=>url.includes(globalThis.__failedWreck??'__none__')?this.onerror():this.onload())}
}
const document={createElement:()=>({getContext:()=>({drawImage(){crops++}})})};
class Rectangle {constructor(x,y,width,height){Object.assign(this,{x,y,width,height})}}
class Texture {constructor(options){Object.assign(this,options)}static from(image){roots++;return {source:{image}}}}
const getPublicAssetUrl=p=>'/'+p;
`+read('src/components/games/raid/wreckArt.ts').replace(/^import .*\n/gm,'')
const art=await load(loader)
const entries=Array.from({length:8},(_,i)=>art.getWreckCanvasSprite(i))
await Promise.all([art.preloadWreckArt(),art.preloadWreckArt(),...entries.map(e=>e.ready)])
assert.equal(art.imagesMade,2);assert.equal(art.roots,2);assert.equal(art.crops,8)
for(let i=0;i<8;i++) {
 assert.equal(entries[i],art.getWreckCanvasSprite(i))
 assert.equal(entries[i].loaded,true)
 assert.equal(entries[i].processedImage.width,464)
 const t=art.getWreckTexture(i)
 assert.deepEqual([t.frame.x,t.frame.y,t.frame.width,t.frame.height],[(i%2)*512+24,Math.floor((i%4)/2)*512+24,464,464])
 assert.equal(t.source,art.getWreckTexture(Math.floor(i/4)*4).source)
 assert.equal(t.source.autoGenerateMipmaps,false)
}
assert.notEqual(art.getWreckTexture(0).source,art.getWreckTexture(4).source)
assert.equal(art.getWreckCanvasSprite(8),undefined)
assert.equal(art.getWreckTexture(8),undefined)
// A failed source leaves only its own four designs unavailable, no uncropped atlas draw.
globalThis.__failedWreck='wreck-ships'
const failed=await load(loader+'\n// failed-source scenario')
await failed.preloadWreckArt()
const missing=failed.getWreckCanvasSprite(0),available=failed.getWreckCanvasSprite(4)
await Promise.all([missing.ready,available.ready])
assert.equal(missing.loaded,false);assert.equal(missing.processedImage,undefined)
assert.equal(available.loaded,true);assert.equal(failed.getWreckTexture(0),undefined)
delete globalThis.__failedWreck
console.log('Wreck variety: 9 designs, family permutations, no consecutive gameplay repeats, 2 shared sources, bounded Canvas crops and missing-art fallback passed')
// Run the actual gameplay draw function against Canvas and sprite stand-ins.
let effects=read('src/components/games/raid/effectsRender.tsx')
effects=effects.slice(effects.indexOf('export function drawDerelictWreck('),effects.indexOf('export function drawRandomEventOverlay('))
const draw=await load(`
export const calls=[];
const WIDTH=100,RAID_DERELICT_WRECK_FILTER='prewarmed';
const sprites=Array.from({length:9},(_,id)=>({id,loaded:true}));
const getDerelictWreckVariantIndex=i=>i%9;
const getDerelictWreckCanvasSprite=i=>{if(globalThis.__missingWreck&&i<8)sprites[i].loaded=false;return sprites[i]};
const drawCanvasImageContain=(ctx,sprite,x,y,w,h,filter,alpha)=>{calls.push({id:sprite.id,w,h,filter,alpha});return true};
`+effects)
const context={save(){},restore(){},translate(){},rotate(){},set shadowBlur(v){assert.fail('wreck reintroduced a live blur')}}
for(let i=0;i<9;i++) for(const width of [390,1280])draw.drawDerelictWreck(context,{x:50,y:50,width:18,height:21,variant:i,phase:0},v=>v,v=>v,width,0)
assert.equal(draw.calls.length,18)
assert.deepEqual([...new Set(draw.calls.map(c=>c.id))],[0,1,2,3,4,5,6,7,8])
assert.ok(draw.calls.every(c=>c.alpha===1&&c.w>0&&c.h>0))
globalThis.__missingWreck=true
draw.drawDerelictWreck(context,{x:50,y:50,width:18,height:21,variant:0,phase:0},v=>v,v=>v,390,0)
assert.equal(draw.calls.at(-1).id,8,'unavailable atlas failed to use legacy gameplay wreck')
delete globalThis.__missingWreck
console.log('Gameplay wreck render: every design, both orientations, opaque single bitmap, no live shadow blur and legacy fallback passed')
