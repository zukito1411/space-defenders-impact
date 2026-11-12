import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = file => readFileSync(new URL('../src/components/games/raid/' + file, import.meta.url), 'utf8')
const load = source => import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64'))
const stripImports = text => text.replace(/^import .*\n/gm, '')
const enemyModule = await load(`
export const calls = []
const DEG=Math.PI/180, STAGE_CLEAR_SECONDS=3.15
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), getEnemyCanvasSize=()=>100
const drawDevilGundamBoss=(ctx,...args)=>calls.push(['body',ctx.angle,args.at(-1)])
const drawBossShield=(ctx,x,y)=>calls.push(['shield',x,y])
const drawCachedBossBar=(ctx,enemy,x,y)=>calls.push(['bar',ctx.angle,x,y])
const drawCommandBossHealthBar=()=>{},drawBossFx=()=>{}
` + stripImports(read('enemyRender.ts')))

const enemy = {id:1,isBoss:true,bossKind:'devil',hp:100,maxHp:100,x:50,y:50,radius:10,phase:0,shieldTime:1,chargeTimer:0,color:'#fff'}
for (const landscape of [false,true]) for (const gpuReady of [false,true]) {
  const stack=[]
  const ctx={angle:0,save(){stack.push(this.angle)},restore(){this.angle=stack.pop()},rotate(a){this.angle+=a},translate(){},scale(){}}
  enemyModule.calls.length=0
  enemyModule.drawRaidEnemy(ctx,enemy,v=>v,v=>v,390,1000,'none',1,gpuReady,landscape)
  const body=enemyModule.calls.find(x=>x[0]==='body')
  assert.equal(body[1],landscape ? -Math.PI/2 : 0)
  assert.equal(body[2],gpuReady)
  const shield=enemyModule.calls.find(x=>x[0]==='shield')
  assert.deepEqual(shield.slice(1),landscape ? [78,50] : [50,68])
  assert.ok(enemyModule.calls.some(x=>x[0]==='bar'),'health bar was lost')
  assert.equal(ctx.angle,0,'Canvas transform leaked')
}

const gpu = await load(`
class Container { addChild(child){child.parent=this} }
class Sprite { constructor(texture){this.texture=texture;this.anchor={set(){}};this.position={set(x,y){this.x=x;this.y=y}}} destroy(){} }
class Texture { static WHITE={} }
const getEnemyCanvasSize=()=>100,getDevilBossPose=()=> 'idle',raidObjectInView=()=>true
const STAGE_CLEAR_SECONDS=3.15,clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
` + stripImports(read('gpuBossBodies.ts')))
const renderer=new gpu.RaidGpuBossBodies()
renderer.prepareDevil=()=>({texture:{},canvas:{width:184},renderSize:100})
for (const landscape of [false,true]) {
  const frame={width:390,height:844,time:1000,landscape,enemies:[enemy],bounds:{}}
  renderer.update(frame)
  const pair=renderer.nodes.get(enemy.id)
  assert.ok(pair && renderer.isRendered(enemy.id),'GPU body not rendered')
  const tilt=Math.sin(frame.time/1080+enemy.phase)*0.012
  assert.ok(Math.abs(pair.base.rotation-(tilt-(landscape?Math.PI/2:0)))<1e-9)
  assert.equal(pair.blend.rotation,pair.base.rotation)
}
console.log('Devil Gundam Canvas and GPU orientations, shield positions, and Canvas state passed')
