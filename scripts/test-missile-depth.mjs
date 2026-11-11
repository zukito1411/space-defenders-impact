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
const steeredFar=output(),steeredNear=output()
projectDepthStar(0.55,0.55,0.2,0,1000,500,1,0,steeredFar)
projectDepthStar(0.55,0.55,0.8,0,1000,500,1,0,steeredNear)
assert.ok(Math.abs(steeredNear.x-near.x)>Math.abs(steeredFar.x-far.x),'near stars need stronger steering parallax')
for(const x of [0.2,0.8]) {
 const a=output(),b=output(),c=output(),d=output()
 projectDepthStar(x,0.2,0.2,0,1000,500,0,0,a)
 projectDepthStar(x,0.2,0.2,100,1000,500,0,0,b)
 projectDepthStar(x,0.2,0.8,0,1000,500,0,0,c)
 projectDepthStar(x,0.2,0.8,100,1000,500,0,0,d)
 assert.equal(a.x,b.x,'forward travel must not fan out sideways')
 assert.equal(c.x,d.x,'near stars must not fan out sideways')
 assert.ok(b.y>a.y && d.y>c.y,'all depths should follow forward traversal')
 assert.ok(d.y-c.y>b.y-a.y,'near objects must pass faster')
 assert.equal(a.rotation,Math.PI/2)
}
for(const z of [0,0.1,0.5,0.9,0.999999]) for(const travel of [0,200,900,900000]) {
 const star=output()
 projectDepthStar(0.3,0.7,z,travel,1000,500,1,-1,star)
 assert.ok(Object.values(star).every(Number.isFinite))
 assert.ok(star.alpha>=0 && star.alpha<=1)
 assert.ok(star.size>=0.6 && star.size<=3)
}
for(const y of [0,0.999999]) {
 const star=output();projectDepthStar(0.5,y,0.5,0,1000,500,0,0,star)
 assert.ok(star.alpha<0.001,'depth wrap must fade rather than flash')
}
assert.ok(72*missileLaunchScale('rocket')>=58 && 72*missileLaunchScale('rocket')<72)
assert.equal(missileLaunchScale('laser'),1,'fast weapons should retain their velocity')
assert.equal(homingCruiseSpeed(0,0),52)
assert.equal(homingCruiseSpeed(100,100),66)
console.log('Missile/depth: distinct speed policy, bounded homing, perspective scale/brightness, finite projection and wrap fading passed')

const readRaid = name => readFileSync(new URL('../src/components/games/raid/' + name,import.meta.url),'utf8')
const targetingSource = 'const HEIGHT=100,WIDTH=100,HOMING_RETARGET_SECONDS=.18,HOMING_RETARGET_STAGGER_SECONDS=.012;\n' +
 readRaid('missilePresentation.ts') + readRaid('targeting.ts').replace(/^import .*\n/gm,'')
const targetCode = ts.transpileModule(targetingSource,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const targeting = await import('data:text/javascript;base64,'+Buffer.from(targetCode).toString('base64'))
const shielded = {id:1,x:50,y:26,hp:500,isBoss:true,shieldTime:1}
const target = {id:2,x:40,y:47,hp:50}
const alternative = {id:3,x:90,y:28,hp:50}
const shot = {id:5,x:50,y:78,vx:0,vy:-60,kind:'homing',turn:5}
const targets = new Map()
targeting.steerRaidHoming(shot,.02,[shielded,target,alternative],targeting.fillRaidHomingTargets(targets,[shielded,target,alternative]))
assert.equal(shot.homingTargetId,2,'missile should bypass protected boss')
shielded.shieldTime=0
targeting.steerRaidHoming(shot,.3,[shielded,target,alternative],targeting.fillRaidHomingTargets(targets,[shielded,target,alternative]))
assert.equal(shot.homingTargetId,2,'existing valid lock should survive a more attractive target')
target.hp=0
targeting.steerRaidHoming(shot,.02,[shielded,target],targeting.fillRaidHomingTargets(targets,[shielded,target]))
assert.equal(shot.homingTargetId,1,'destroyed target should trigger immediate retarget')
const waiting = {...shot,homingTargetId:undefined,retargetTime:.15}
targeting.steerRaidHoming(waiting,.02,[shielded],targeting.fillRaidHomingTargets(targets,[shielded]))
assert.equal(waiting.homingTargetId,undefined,'a failed lock should wait for its staggered retry')
targeting.steerRaidHoming(waiting,.16,[shielded],targeting.fillRaidHomingTargets(targets,[shielded]))
assert.equal(waiting.homingTargetId,1)
assert.equal(targeting.hasRaidSpecialTarget([],[],[]),false)
assert.equal(targeting.hasRaidSpecialTarget([{...shielded,y:-18}],[],[]),false)
assert.equal(targeting.hasRaidSpecialTarget([],[{hp:1,y:30}],[]),true)
assert.equal(targeting.hasRaidSpecialTarget([],[],[{kind:'squidBubble',hp:1,y:30}]),true)
assert.equal(targeting.hasRaidSpecialTarget([],[],[{kind:'squidBubble',hp:0,y:30}]),false)
console.log('Raid targeting: damageable targets, held locks, immediate invalidation, staggered retries and special target availability passed')
