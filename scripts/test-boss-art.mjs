import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Supply decoded texture stand-ins; exercise the production atlas loader,
// material selection, shared special-shot geometry and Canvas draw arguments.
let source = readFileSync(new URL('../src/components/games/raid/combatArt.ts', import.meta.url), 'utf8')
source = source.replace("import { Assets, Color, Rectangle, Texture } from 'pixi.js'", `
class Rectangle { constructor(x,y,width,height) { Object.assign(this,{x,y,width,height}) } }
class Texture { constructor(o) { Object.assign(this,o) } }
class Color { toNumber() { return 0xffffff } }
const Assets = { load: async () => ({width:1024,height:1024,source:{pixelWidth:1024,pixelHeight:1024,resolution:1,resource:{}}}) }
`)
source = source.replace("import { getPublicAssetUrl } from '../sound'", 'const getPublicAssetUrl = (path) => path')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const art = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
await art.preloadRaidCombatArt()
assert.equal(art.getRaidCombatRootTextures().length, 5)
for (const kind of ['squidBubble','squidInk','squidSpine','snakeFang','venomSpit','poisonCloud']) {
  const spec = {kind,width:30,height:60,rotation:Math.PI/2,alpha:0.7,x:120,y:80}
  const texture = art.applyRaidBossArtwork(spec)
  assert.ok(texture, `${kind} has no shared artwork`)
  if (kind === 'poisonCloud') {
    assert.equal(texture.frame.width,252,'cloud footprint must retain its original frame')
    assert.equal(spec.width,36,'cloud rendering size must retain its original scale')
  } else {
    assert.equal(texture.frame.width,208,'empty padding still shrinks the projectile art')
  }
  if (kind === 'snakeFang' || kind === 'squidSpine') {
    assert.equal(spec.width,102)
    assert.equal(spec.height,51)
    assert.equal(spec.rotation,0, 'right-facing sprite orientation incorrect')
    assert.equal(art.isRaidBossArtSolid(kind),true)
  }
  const calls=[]
  const ctx={save(){},restore(){},translate(){},rotate(){},drawImage(...args){calls.push(args)}}
  assert.equal(art.drawRaidCombatTexture(ctx,texture,spec.x,spec.y,spec.width,spec.height,spec.rotation,false),true)
  assert.equal(calls.length,1,'Canvas effect should require one draw')
  assert.equal(calls[0][7],spec.width)
  assert.equal(calls[0][8],spec.height)
}
const beam={kind:'beam',width:200,height:20,rotation:0}
assert.ok(art.applyRaidBossArtwork(beam),'live beams should use one shared texture')
assert.equal(beam.width,20,'beam artwork should preserve the lane width')
assert.ok(beam.height>=200,'beam artwork must cover its length')
assert.equal(beam.rotation,-Math.PI/2)
const generic=art.getRaidProjectileMaterial('enemy',true)
const boss=art.getRaidProjectileMaterial('boss',true)
assert.notEqual(generic.texture,boss.texture,'carrier bolts must differ from generic enemy orbs')
assert.equal(boss.directional,true)
console.log('Boss art: six shared special textures, Canvas geometry, solid fangs, beam fallback and distinct enemy materials passed')

const rocket=art.getRaidProjectileMaterial('rocket')
const homing=art.getRaidProjectileMaterial('homing')
assert.notEqual(rocket.texture.frame.y,homing.texture.frame.y,'rocket and homing must use distinct artwork')
assert.ok(rocket.width>=74 && homing.width>=66,'missile silhouettes must be readable')
assert.ok(rocket.solid && homing.solid,'missiles should preserve their mechanical detail with normal blending')

const bossFxDraws=[]
const fxContext={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},drawImage(...args){bossFxDraws.push(args)}}
for (const tile of Object.values(art.BOSS_FX)) assert.equal(art.drawBossFx(fxContext,tile,40,60,30,38,.8),true)
assert.equal(bossFxDraws.length,9)
assert.equal(new Set(bossFxDraws.map(draw=>draw[0])).size,1,'boss effects must share one decoded atlas')
assert.equal(new Set(bossFxDraws.map(draw=>draw[1]+4096*draw[2])).size,9,'each boss effect must use a distinct frame')
