import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const source=readFileSync(new URL('../src/components/games/raid/surfaceMotion.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {createSurfaceCameraFrame,sampleSurfaceCamera,getSurfaceIslandY,positiveSurfaceModulo}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const sample=(t,w,h,dpr=1.5,x=0,y=0)=>sampleSurfaceCamera(t,w,h,dpr,x,y,512,createSurfaceCameraFrame())
for(const [w,h] of [[390,844],[844,390],[360,800],[1080,1920],[1920,1080]])for(const dpr of [1,1.25,1.5,2]) {
 const before=sample(10,w,h,dpr),after=sample(11,w,h,dpr)
 const delta=after.scroll-before.scroll
 assert.ok(delta>0,'terrain must keep moving')
 assert.ok(Math.abs(getSurfaceIslandY(after,.08)-getSurfaceIslandY(before,.08)-delta)<1e-8,'island slipped against ground UVs')
 assert.ok(before.tileSize*dpr*1.45<=512+1e-9,'portrait/altitude mapping magnified source texels')
 const steering=sample(11,w,h,dpr,.6,-.4)
 const yDelta=getSurfaceIslandY(steering,.08)-getSurfaceIslandY(after,.08)
 assert.ok(Math.abs(yDelta-(steering.y-after.y))<1e-8)
 const late=sample(300,w,h,dpr),later=sample(301,w,h,dpr)
 assert.ok(Math.abs(later.scroll-late.scroll-delta)<1e-8,'surface stopped moving after the old 80s cap')
 for(const field of [before,after,steering,later])assert.ok(Object.values(field).every(Number.isFinite))
 for(const hz of [30,60,120,144]) {
  const frame=createSurfaceCameraFrame()
  for(let i=0;i<=hz;i++)sampleSurfaceCamera(10+i/hz,w,h,dpr,0,0,512,frame)
  assert.equal(frame.scroll,after.scroll,'ground scroll depends on refresh rate')
 }
 // Landmark loop boundaries are outside the viewport, not visible teleports.
 const wrap=(1-.08)/.024
 const a=sample(wrap-1e-5,w,h,dpr),b=sample(wrap+1e-5,w,h,dpr)
 assert.ok(getSurfaceIslandY(a,.08)>h+w*.01)
 assert.ok(getSurfaceIslandY(b,.08)<-Math.min(w,h)*.25)
 assert.ok(positiveSurfaceModulo(later.scroll,later.tileSize)>=0)
}
const portrait=sample(10,390,844),landscape=sample(10,844,390)
assert.equal(portrait.tileSize,landscape.tileSize,'orientation elongated terrain instead of revealing more tiles')
console.log('Surface motion: shared terrain/landmark displacement, steering, portrait texel density, long runs, 30–144Hz agreement and offscreen wraps passed')
