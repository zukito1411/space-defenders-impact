import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
const read = file => readFileSync(`src/components/games/raid/${file}`, 'utf8')
const compile = file => ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const motion = {}
const asset = JSON.parse(readFileSync('docs/celestial-art-manifest.json','utf8'))
assert.equal(createHash('sha256').update(readFileSync(asset.file)).digest('hex'),asset.sha256)
assert.equal(asset.layout.cells.length,4)
vm.runInNewContext(compile('celestialMotion.ts'), { exports: motion })
const sample = (i,t,planet=true,reduced=false) => motion.sampleCelestialStar(i,844,390,t,planet,reduced,{})
for (let i=0;i<64;i++) {
  const samples=Array.from({length:180},(_,n)=>sample(i,n/10))
  const alphas=samples.map(frame=>frame.alpha)
  assert.ok(Math.max(...alphas)-Math.min(...alphas)>.3,'sky star never visibly twinkled')
  for(let n=1;n<samples.length;n++) assert.ok(Math.abs(alphas[n]-alphas[n-1])<.13,'star blinked with an abrupt flash')
  assert.ok(samples.every(frame=>frame.y>0&&frame.y<390*.55),'planet stars spilled into terrain')
  assert.equal(sample(i,1).x,sample(i,100).x,'planet stars followed the wind instead of remaining in the sky')
  assert.deepEqual(sample(i,1,true,true),sample(i,100,true,true),'reduced motion animated stars')
}
assert.notEqual(sample(0,1).alpha,sample(1,1).alpha,'twinkles were synchronized')
const clock = new motion.CelestialClock()
const start=clock.advance(1000,false,false)
assert.equal(clock.advance(61000,true,false),start,'pause advanced the detail clock')
assert.ok(clock.advance(61016,false,false)<start+.02,'resume jumped through paused wall time')
let allocations=0
class Point {set(x,y=x){this.x=x;this.y=y}}
class Container {children=[];constructor(){allocations++} addChild(...children){this.children.push(...children)} destroy(){this.destroyed=true}}
class Sprite extends Container {anchor=new Point();position=new Point()}
const art=Array.from({length:4},(_,id)=>({id}))
const renderer={}
assert.ok(!/\bGraphics\b|\.poly\(|\.circle\(|\.ellipse\(/.test(read('celestialScenery.ts')),'new celestial detail must use raster artwork')
vm.runInNewContext(compile('celestialScenery.ts'),{exports:renderer,require:name=>name==='./celestialMotion'?motion:name==='./celestialArt'?{getCelestialArt:i=>art[i]}:{Container,Sprite,Texture:{WHITE:{}}}})
const scene=new renderer.CelestialScenery(),warmAllocations=allocations
const draw=(time,region=0,quality='high',reduced=false,planet=false)=>scene.update(844,390,time,region,quality,reduced,planet)
draw(0);draw(3)
assert.ok(scene.wisps.some(sprite=>sprite.visible&&sprite.alpha>0),'cosmos never revealed its gas detail')
assert.ok(scene.wisps.every(sprite=>scene.nebulaRoot.children.includes(sprite)),'nebula gas escaped its rear layer')
assert.ok(scene.stars.every(sprite=>scene.root.children.includes(sprite)),'twinkling stars were dimmed with nebula gas')
const first=scene.stars.map(sprite=>sprite.alpha),wisps=scene.wisps.map(sprite=>[sprite.position.x,sprite.width,sprite.alpha])
draw(4)
assert.notDeepEqual(scene.stars.map(sprite=>sprite.alpha),first)
assert.notDeepEqual(scene.wisps.map(sprite=>[sprite.position.x,sprite.width,sprite.alpha]),wisps,'cosmos wisps were static')
for(let i=0;i<300;i++)draw(5+i/60,i%4,i%2?'medium':'low')
assert.equal(allocations,warmAllocations,'animation allocated display objects')
draw(11,0,'low',false,true)
assert.equal(scene.stars.filter(sprite=>sprite.visible).length,14)
assert.ok(scene.wisps.every(sprite=>!sprite.visible),'gas ribbons appeared inside a planet atmosphere')
assert.ok(scene.dust.every(sprite=>!sprite.visible))
draw(100,0,'high',true)
const reduced=scene.stars.map(sprite=>[sprite.position.x,sprite.alpha])
draw(200,0,'high',true)
assert.deepEqual(scene.stars.map(sprite=>[sprite.position.x,sprite.alpha]),reduced)
scene.hide();assert.equal(scene.root.visible,false)
assert.equal(scene.nebulaRoot.visible,false)
scene.destroy();assert.equal(scene.root.destroyed,true)
console.log('Celestial animation: visible smooth asynchronous twinkles, sky bounds, pause/resume, animated gas, raster-only art, fixed pools, quality and reduced motion passed')
