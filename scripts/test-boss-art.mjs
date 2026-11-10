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
assert.equal(art.getRaidCombatRootTextures().length, 3)
for (const kind of ['squidBubble','squidInk','squidSpine','snakeFang','venomSpit','poisonCloud']) {
  const spec = {kind,width:30,height:60,rotation:Math.PI/2,alpha:0.7,x:120,y:80}
  const texture = art.applyRaidBossArtwork(spec)
  assert.ok(texture, `${kind} has no shared artwork`)
  if (kind === 'snakeFang' || kind === 'squidSpine') {
    assert.equal(spec.width,72)
    assert.equal(spec.height,36)
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
assert.equal(art.applyRaidBossArtwork(beam),undefined,'preserve beam telegraph and geometry')
assert.equal(beam.width,200)
const generic=art.getRaidProjectileMaterial('enemy',true)
const boss=art.getRaidProjectileMaterial('boss',true)
assert.notEqual(generic.texture,boss.texture,'carrier bolts must differ from generic enemy orbs')
assert.equal(boss.directional,true)
console.log('Boss art: six shared special textures, Canvas geometry, solid fangs, beam fallback and distinct enemy materials passed')
