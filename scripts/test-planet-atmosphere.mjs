import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
const compile = file => ts.transpileModule(readFileSync(`src/components/games/raid/${file}`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const art = {}
vm.runInNewContext(compile('planetAtmosphereArt.ts'), { exports: art })
const particles = {}
const weather = JSON.parse(readFileSync('docs/planet-weather-art-manifest.json','utf8'))
const image = readFileSync(weather.file)
assert.equal(image.length,weather.bytes)
assert.equal(createHash('sha256').update(image).digest('hex'),weather.sha256)
assert.equal(image.subarray(0,4).toString(),'RIFF')
assert.deepEqual(weather.dimensions,[1536,1024])
assert.equal(weather.layout.cells.length,4)
vm.runInNewContext(compile('planetFlightParticles.ts'), { exports: particles })
for (const wet of [true,false]) for (const streak of [true,false]) {
  for (let index=0;index<72;index++) {
    const sample = (seconds,speed=0) => particles.samplePlanetFlightParticle(index,seconds,844,390,wet,speed,streak,{})
    const before=sample(10),after=sample(10.016),boost=sample(10,1)
    assert.ok(Object.values(before).filter(value=>typeof value==='number').every(Number.isFinite))
    assert.ok(before.alpha>=0&&before.alpha<=1)
    if (streak) { assert.ok(boost.width>before.width); assert.ok(before.width>before.height*10,'speed streak became a soft dot') }
    assert.equal(boost.x,before.x,'throttle teleported a scene particle')
    assert.notEqual(after.x,before.x,'time did not move scene particle')
    for (const hz of [30,60,144]) {
      let frame
      for (let n=0;n<=hz;n++) frame=sample(10+n/hz)
      assert.deepEqual(frame,sample(11),'particle transport depends on display rate')
    }
  }
}
for (const kind of ['pelagic', 'cinder']) for (let layer = 0; layer < 3; layer++) {
  for (const u of [0, .13, .61, .99]) assert.ok(Math.abs(art.planetTerrainHeight(u, layer, kind) - art.planetTerrainHeight(u + 1, layer, kind)) < 1e-10,
    'terrain profile must join continuously when a panoramic tile wraps')
  const material = art.bakePlanetTerrain(kind, layer, 256, 64)
  assert.deepEqual(material, art.bakePlanetTerrain(kind, layer, 256, 64), 'terrain changed between identical bakes')
  assert.ok(material.some((value, i) => i % 4 === 3 && value === 0), 'terrain lost transparent sky coverage')
  assert.ok(material.some((value, i) => i % 4 === 3 && value > 200), 'terrain lost solid surface coverage')
  assert.ok(Array.from({ length: 256 }, (_, x) => material[x * 4 + 3]).every(alpha => alpha === 0), 'terrain top edge can bleed a horizontal line into the sky')
}
assert.notDeepEqual(art.bakePlanetTerrain('pelagic', 1, 256, 64), art.bakePlanetTerrain('cinder', 1, 256, 64))
const cloud = art.bakeAtmosphereCloud(128, 48)
assert.ok(cloud.some((value, i) => i % 4 === 3 && value > 20))
assert.ok(cloud.some((value, i) => i % 4 === 3 && value === 0))
for (const [width, height] of [[390,844],[850,1600],[320,640],[1080,1920]]) {
  const frame = art.sampleLandscapeAtmosphere(width, height, 35000, false, 'high', {})
  assert.equal(frame.width, height); assert.equal(frame.height, width)
  assert.ok(frame.horizon > width * .65 && frame.horizon < width * .72)
  assert.equal(art.sampleLandscapeAtmosphere(width,height,100000,true,'low',{}).seconds,0)
}
let allocations = 0
class Point { x = 0; y = 0; set(x, y = x) { this.x = x; this.y = y } }
class Container {
  children = []; position = new Point(); rotation = 0; visible = true
  constructor() { allocations++ }
  addChild(...children) { this.children.push(...children) }
  destroy() { this.destroyed = true }
}
class Sprite extends Container { anchor = new Point(); tileScale = new Point(); tilePosition = new Point(); constructor(texture) { super(); this.texture = texture } }
class Graphics extends Container { clear() { return this } moveTo() { return this } lineTo() { return this } stroke() { return this } }
const renderer = {}
vm.runInNewContext(compile('landscapeAtmosphere.ts'), { exports: renderer, Math, Set,
  document: { createElement() { throw new Error('rendering allocated a new canvas') } },
  require: name => name === './planetAtmosphereArt' ? art : name === './planetFlightParticles' ? particles : name === './celestialScenery' ? { CelestialScenery: class {root=new Container();update(){}destroy(){}} } : name === './surfaceArt' ? { getSurfaceTerrain: () => null, getPlanetWeatherArt: () => null }
    : { Container, Sprite, Graphics, TilingSprite: Sprite, Texture: { WHITE: {} } },
})
const scene = new renderer.LandscapePlanetAtmosphere()
const owned = []
const makeTexture = () => { const texture = { destroy() { this.destroyed = true } }; owned.push(texture); return texture }
const water = makeTexture()
for (const kind of ['pelagic', 'cinder']) scene.art.set(kind, { sky: makeTexture(), terrain: [makeTexture(),makeTexture(),makeTexture()], water })
scene.cloud = makeTexture(); scene.glow = makeTexture()
scene.streakTexture = makeTexture(); scene.flakeTexture = makeTexture()
const initialAllocations = allocations
scene.update(850,1600,35000,'cinder','high',false)
assert.equal(scene.root.rotation, -Math.PI/2)
assert.equal(scene.root.position.y,1600)
const positions = () => scene.clouds.map(sprite => [sprite.position.x,sprite.position.y])
const beforePause = positions()
scene.update(850,1600,45000,'cinder','high',false,true)
assert.deepEqual(positions(),beforePause,'pause advanced the atmospheric layers')
scene.update(850,1600,45016,'cinder','high',false)
assert.notDeepEqual(positions(),beforePause,'resuming did not advance the atmospheric layers')
for (let i=0;i<240;i++) scene.update(390,844,45032+i*16,i%2?'pelagic':'cinder','low',false)
assert.equal(allocations,initialAllocations,'flight allocated more display objects')
assert.equal(scene.clouds.filter(sprite=>sprite.visible).length,4)
assert.equal(scene.motes.filter(sprite=>sprite.visible).length,18)
assert.equal(scene.speedLines.filter(sprite=>sprite.visible).length,5)
scene.update(390,844,50000,'pelagic','high',true)
const reduced=positions()
scene.update(390,844,60000,'pelagic','high',true)
assert.deepEqual(positions(),reduced,'reduced motion animated cloud travel')
assert.equal(scene.motes.filter(sprite=>sprite.visible).length,0)
assert.equal(scene.speedLines.filter(sprite=>sprite.visible).length,0)
assert.ok(scene.vents.every(sprite=>!sprite.visible),'Pelagic retained Cinder eruption glows')
scene.hide();assert.equal(scene.root.visible,false)
scene.destroy();assert.ok(owned.every(texture=>texture.destroyed),'planet material teardown leaked textures')
console.log('Planet atmosphere: periodic terrain, distinct materials, upright horizon, pooled sprites, pause/resume, low quality, reduced motion, planet switching and texture teardown passed')
