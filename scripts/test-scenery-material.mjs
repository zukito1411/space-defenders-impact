import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const source=readFileSync(new URL('../src/components/games/raid/sceneryMaterial.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {sceneryTint,shadeSceneryAtlas,extractSceneryBloom,PLANET_DEPTH,PLANET_PARALLAX}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const pixels=new Uint8ClampedArray(1024*1024*4)
const at=(x,y)=>(y*1024+x)*4
for(const [x,y] of [[180,180],[330,330]])pixels.set([230,235,240,253],at(x,y))
pixels.set([255,255,255,4],at(2,2)) // near-zero alpha noise must not become a solid rectangle
shadeSceneryAtlas(pixels,1024,1024)
const lit=Array.from(pixels.slice(at(180,180),at(180,180)+4))
const night=Array.from(pixels.slice(at(330,330),at(330,330)+4))
assert.equal(lit[3],255);assert.equal(night[3],255)
assert.ok(night[0]<lit[0]*.8,'night side should read darker than the sunlit side')
assert.equal(pixels[at(256,256)+3],0,'transparent holes must remain transparent')
assert.equal(pixels[at(2,2)+3],0,'alpha noise was promoted to solid coverage')
// Coverage regression: switching the farther planet color must not change the near body.
const over=(front,back)=>front.slice(0,3).map((c,i)=>Math.round(c*front[3]/255+back[i]*(1-front[3]/255)))
for(const front of [lit,night])assert.deepEqual(over(front,[255,0,0]),over(front,[0,0,255]),'far object bled through a solid surface')
assert.notDeepEqual(over([100,100,100,82],[255,0,0]),over([100,100,100,82],[0,0,255]),'control did not reproduce the original 32% opacity defect')
extractSceneryBloom(pixels)
assert.ok(pixels[at(180,180)+3]>0,'sunlit highlight lost its bloom')
assert.equal(pixels[at(330,330)+3],0,'night side should not emit bloom')
assert.ok(PLANET_DEPTH[0]>PLANET_DEPTH[1]&&PLANET_DEPTH[1]>PLANET_DEPTH[2])
assert.ok(PLANET_PARALLAX[0]>PLANET_PARALLAX[1]&&PLANET_PARALLAX[1]>PLANET_PARALLAX[2])
assert.equal(sceneryTint(0xffffff,.5),0x808080)
assert.equal(sceneryTint(0xffffff,2),0xffffff)
console.log('Scenery material: opaque day/night coverage, far-color independence, preserved holes, highlight-only bloom and consistent depth/parallax passed')
