import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const read = path => readFileSync(path,'utf8')
const manifest=JSON.parse(read('docs/scenery-remaster-manifest.json'))
assert.equal(manifest.assets.length,4)
for(const asset of manifest.assets){
 assert.equal(createHash('sha256').update(readFileSync(asset.source)).digest('hex'),asset.sourceSha256,'original artwork changed')
 const bytes=readFileSync(asset.file)
 assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256)
 assert.equal(bytes.toString('ascii',12,16),'VP8L','remaster must be lossless')
 const bits=bytes.readUInt32LE(21)
 assert.equal((bits&0x3fff)+1,2048);assert.equal(((bits>>>14)&0x3fff)+1,2048)
 assert.ok((bits>>>28)&1,'planet/wreck transparency was flattened')
}
const compile = source => ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const graphics={}
const window={devicePixelRatio:1,innerWidth:1920,innerHeight:1080}
vm.runInNewContext(compile(read('src/components/games/raid/graphics.ts')),{exports:graphics,window,
 require:name=>name==='./utils'?{clamp:(n,a,b)=>Math.min(b,Math.max(a,n))}:{MAX_SPARKS:100,MAX_RIPPLES:20,MAX_ASTEROIDS:20,MAX_ION_STRIKES:20,MAX_METEORS:20}})
const root={clientWidth:1920,clientHeight:1080}
for(const coOp of [false,true])for(const landscape of [false,true]){
 const frame=graphics.makeRaidViewportMetrics(root,'max',coOp,landscape)
 assert.equal(frame.canvasWidth*frame.canvasHeight,1920*1080,'Ultra failed native Full HD output')
 window.devicePixelRatio=2
 const retina=graphics.makeRaidViewportMetrics(root,'max',coOp,landscape)
 assert.equal(retina.canvasWidth*retina.canvasHeight,3840*2160,'Ultra reduced retina/co-op clarity')
 window.devicePixelRatio=1
}
const source=read('src/components/games/raid/assets.ts')
const tree=ts.createSourceFile('assets.ts',source,ts.ScriptTarget.Latest,true)
const names=['makeSpriteProcessingCanvas','processPlanetAsset','processPlanet3Asset','processPlanetNebulaAsset','processRingedPlanetAsset','processSpaceStationAsset']
const functions=tree.statements.filter(node=>ts.isFunctionDeclaration(node)&&names.includes(node.name?.text)).map(node=>node.getText(tree)).join('\n')
const assets={}
vm.runInNewContext(compile(functions+'\nfunction trimTransparentCanvas(canvas){return canvas}'),{exports:assets,
 document:{createElement:()=>({getContext:()=>({drawImage(){}})})}})
for(const key of names.slice(1)){
 const canvas=assets[key]({naturalWidth:1400,naturalHeight:1400})
 assert.equal(canvas.width,1400,`${key} discarded native source detail`)
 const small=assets[key]({naturalWidth:400,naturalHeight:400})
 assert.equal(small.width,400,'source retention invented a larger original')
}
// Exercise the real lighting pass with a lightweight raster context. Verify
// bloom uses the same normalized crop at 1x and 2x, rather than shifting halos.
const lighting={};let dimension=1024;const crops=[]
const document={createElement:()=>{const canvas={width:0,height:0};canvas.getContext=()=>({
 drawImage(...args){if(args.length===9)crops.push(args.slice(1))},getImageData(){return{data:new Uint8ClampedArray(4)}},putImageData(){}});return canvas}}
class Texture {constructor(options){Object.assign(this,options)}static from(canvas){return{source:{},width:canvas.width,height:canvas.height}}}
class Rectangle {constructor(x,y,width,height){Object.assign(this,{x,y,width,height})}}
vm.runInNewContext(compile(read('src/components/games/raid/sceneryLighting.ts')),{exports:lighting,document,
 require:name=>name==='pixi.js'?{Texture,Rectangle}:{shadeSceneryAtlas(){},extractSceneryBloom(){}}})
for(dimension of [1024,2048]){
 crops.length=0
 const result=lighting.bakeSceneryLighting({width:dimension,height:dimension,source:{resource:{}}})
 assert.equal(result.surface.width,dimension)
 const normalized=crops.map(crop=>crop.slice(0,4).map(value=>value/(dimension/1024)))
 assert.deepEqual(JSON.parse(JSON.stringify(normalized[0])),[24,24,464,464])
}
console.log('Ultra scenery: four lossless 2K RGBA atlases, unchanged originals, native planet retention, proportional bloom and native FHD/retina output in solo/co-op passed')
