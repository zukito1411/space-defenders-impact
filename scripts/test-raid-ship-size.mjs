import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const strip=s=>s.replace(/^import .*\n/gm,'')
const source=`
const PLAYER_RADIUS=3.2,WIDTH=100,HEIGHT=100
const useSyncExternalStore=()=>{}
` + strip(read('src/components/games/raid/shipSize.ts')) + '\n' + strip(read('src/components/games/raid/playerMuzzle.ts'))
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`)
assert.equal(m.getRaidShipSize(),1.2)
for (const [value,expected] of [[undefined,1],[NaN,1],[0,1],[1,1],[1.2,1.2],[1.5,1.5],[8,1.5]]) {
  close(m.clampRaidShipSize(value),expected)
  close(m.getRaidPlayerHitRadius({sizeScale:value}),3.2*expected)
  for (const landscape of [false,true]) {
    close(m.getRaidPlayerHullSize('rocket',390,landscape,expected),m.getRaidPlayerHullSize('rocket',390,landscape,1)*expected)
  }
}
for(const scale of [1,1.2,1.5]) for(const landscape of [false,true]) {
  const shots=[]
  const fire=m.createRaidMainShotEmitter(s=>shots.push(s),{x:50,y:80},'rocket',false,390,844,0,landscape,scale)
  fire({x:50,y:80,kind:'laser'})
  const size=m.getRaidPlayerHullSize('rocket',390,landscape,scale)
  close((80-shots[0].y)*844/100,size*.448)
}
// Combat-model shots originate at the head at every size and orientation,
// including homing and rocket projectiles that otherwise use hull hardpoints.
for(const scale of [1,1.2,1.5]) for(const landscape of [false,true]) for(const kind of ['coreBlast','spiegelKunai','rocket','homing']) {
  const shots=[]
  const fire=m.createRaidMainShotEmitter(s=>shots.push(s),{x:50,y:80},'coreLander',true,390,844,0,landscape,scale)
  fire({x:55,y:80,kind})
  const size=m.getRaidPlayerHullSize('coreLander',390,landscape,scale)*1.08
  close((80-shots[0].y)*844/100,size*.34)
}
const runtime=read('src/components/games/raid/GradiusRaidRuntime.tsx')
for (const text of [
  'enemyShot.radius + getRaidPlayerHitRadius(targetPlayer)',
  'enemyShot.radius * 0.82 + getRaidPlayerHitRadius(targetPlayer) * 0.72',
  'enemy.radius + getRaidPlayerHitRadius(targetPlayer)',
  'asteroid.radius + getRaidPlayerHitRadius(targetPlayer)',
  'meteor.radius + getRaidPlayerHitRadius(targetPlayer)',
  'strike.width * 0.62 + getRaidPlayerHitRadius(targetPlayer)',
  'wreck.width * 0.5 + getRaidPlayerHitRadius(targetPlayer)',
  'wreck.height * 0.58 + getRaidPlayerHitRadius(targetPlayer)',
  'shipSizeScale: shipSizeRef.current',
  'remotePlayer.sizeScale = clampRaidShipSize(input.shipSizeScale)',
]) assert.ok(runtime.includes(text), 'missing size-aware gameplay path: '+text)
console.log('Ship size: defaults, bounded hitboxes, per-pilot collision paths and muzzle alignment passed')

// Profile previews contain non-square art without stretching the sprite or its aura.
const profile=read('src/components/ProgressionScreen.tsx')
const containSource=profile.match(/function drawPreviewImageContained\([\s\S]*?\n\}/)?.[0]
assert.ok(containSource, 'missing aspect-preserving profile image renderer')
const containJs=ts.transpileModule(containSource+'\nexport { drawPreviewImageContained }',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {drawPreviewImageContained}=await import('data:text/javascript;base64,'+Buffer.from(containJs).toString('base64'))
for (const [naturalWidth,naturalHeight] of [[200,100],[100,200],[100,100]]) {
  let drawn
  drawPreviewImageContained({drawImage:(...args)=>{drawn=args}}, {naturalWidth,naturalHeight}, 50,60,80)
  close(drawn[3]/drawn[4],naturalWidth/naturalHeight)
  close(drawn[1]+drawn[3]/2,50)
  close(drawn[2]+drawn[4]/2,60)
}
assert.match(read('src/components/ProgressionScreen.css'),/\.progress-ship-preview__canvas\s*\{\s*width:\s*92px;\s*height:\s*auto;/)
