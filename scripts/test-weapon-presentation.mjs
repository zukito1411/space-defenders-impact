import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const js=ts.transpileModule(read('src/components/games/raid/weaponPresentation.ts').replace(/^import .*\n/gm,''),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {getWeaponIgnition}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const kinds=['pulse','laser','spread','scatter','rocket','homing','coreBlast','spiegelKunai']
assert.ok(new Set(kinds.map(k=>getWeaponIgnition(k).tile)).size>=4)
for(const kind of kinds){const f=getWeaponIgnition(kind);assert.ok(f.duration>0&&f.duration<=110);assert.ok(f.width<=30&&f.height<=30)}
const source=read('src/components/games/raid/GradiusRaidRuntime.tsx')
const push=source.slice(source.indexOf('  const pushShot = useCallback'),source.indexOf('  const emitCommandBossShot'))
const code=ts.transpileModule(`let now=100;const performance={now:()=>now},useCallback=f=>f,shotsRef={current:[]},fireCaptureRef={current:null},graphicsQualityRef={current:'high'},activeShotOwnerRef={current:{x:50,y:80,hp:3}},muzzleFlashesRef={current:[]},lastMuzzleFlashRef={current:new WeakMap()},missileLaunchScale=()=>1;let shotId=0;\n${push}\nexport {pushShot,muzzleFlashesRef,activeShotOwnerRef};`,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const m=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
m.pushShot({x:50,y:76,vx:0,vy:-90,kind:'pulse'})
assert.equal(m.muzzleFlashesRef.current.length,1)
const f=m.muzzleFlashesRef.current[0]
m.activeShotOwnerRef.current.x=60
assert.equal(f.owner.x+f.x,60,'ignition must follow the moving ship')
m.pushShot({x:60,y:76,vx:0,vy:-90,kind:'pulse'})
assert.equal(m.muzzleFlashesRef.current.length,1,'one flash per volley budget')
console.log('Weapon presentation: distinct cached materials, short lifetimes, attached origins and volley budget passed')
