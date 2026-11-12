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
