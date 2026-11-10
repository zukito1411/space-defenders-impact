import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
async function load(path) {
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
 return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
}
const {projectDepthStar}=await load('../src/components/games/raid/depthProjection.ts')
const {missileLaunchScale,homingCruiseSpeed}=await load('../src/components/games/raid/missilePresentation.ts')
const output=()=>({x:0,y:0,size:0,alpha:0,rotation:0})
const far=output(),near=output()
projectDepthStar(0.55,0.55,0.2,0,1000,500,0,0,far)
projectDepthStar(0.55,0.55,0.8,0,1000,500,0,0,near)
assert.ok(near.size>far.size && near.alpha>far.alpha,'near stars must read larger and brighter')
assert.ok(Math.abs(near.x-500)>Math.abs(far.x-500),'projection should separate by depth')
for(const z of [0,0.1,0.5,0.9,0.999999]) for(const travel of [0,200,900,900000]) {
 const star=output()
 projectDepthStar(0.3,0.7,z,travel,1000,500,1,-1,star)
 assert.ok(Object.values(star).every(Number.isFinite))
 assert.ok(star.alpha>=0 && star.alpha<=1)
 assert.ok(star.size>=0.6 && star.size<=3)
}
for(const z of [0,0.999999]) {
 const star=output();projectDepthStar(0.5,0.5,z,0,1000,500,0,0,star)
 assert.ok(star.alpha<0.001,'depth wrap must fade rather than flash')
}
assert.ok(72*missileLaunchScale('rocket')>=58 && 72*missileLaunchScale('rocket')<72)
assert.equal(missileLaunchScale('laser'),1,'fast weapons should retain their velocity')
assert.equal(homingCruiseSpeed(0,0),52)
assert.equal(homingCruiseSpeed(100,100),66)
console.log('Missile/depth: distinct speed policy, bounded homing, perspective scale/brightness, finite projection and wrap fading passed')
