import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const input=readFileSync(new URL('../src/components/games/raid/effectsRender.tsx',import.meta.url),'utf8')
const ast=ts.createSourceFile('effects.ts',input,ts.ScriptTarget.Latest,true)
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['getNukePathPoint','getNukePathDerivative','drawNukeMissile','drawNukeBlast'].includes(n.name?.text)).map(n=>n.getText(ast)).join('\n')
const stubs=`
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const NUKE_FLASH_SECONDS=1.15;
const COMBAT_TILE={missile:8};
const RAID_VFX_TILE={ionWake:0,shockwave:2,lock:12};
const drawRaidVfx=(ctx,...args)=>{ctx.vfx.push(args);return true};
const getRaidOtherCanvasSprite=()=>({loaded:true,image:{complete:true}});
const getCanvasSpriteDimensions=()=>({source:{}});
const getRaidCombatFrame=()=>({});
const getRaidExplosionFrame=()=>({});
const impactFrameProgress=p=>p;
const impactAlpha=p=>1-p;
const drawRaidCombatTexture=(ctx,...args)=>{ctx.textures.push(args);return true};
`
const code=ts.transpileModule(stubs+functions,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const art=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const ctx={images:[],textures:[],vfx:[],strokes:0,depth:0,
 save(){this.depth++},restore(){this.depth--},beginPath(){},moveTo(){},lineTo(){},arc(){},setLineDash(){},translate(){},rotate(){},fillRect(){},
 stroke(){this.strokes++},drawImage(...args){this.images.push(args)}}
art.drawNukeMissile(ctx,{startX:50,startY:90,targetX:40,targetY:30,age:0.4,duration:0.82},v=>v*10,v=>v*5,1000,400)
assert.equal(ctx.images.length,1,'nuke missile should use one bitmap')
assert.equal(ctx.strokes,0,'wake and target marker should be textured')
assert.deepEqual(ctx.vfx.map(([tile])=>tile),[0,12])
assert.deepEqual(ctx.vfx[1].slice(1,3),[400,150],'target marker must stay on the impact point')
assert.ok(ctx.images[0][3]>=64,'nuke sprite must be readable')
assert.equal(ctx.depth,0)
ctx.vfx.length=0
art.drawNukeBlast(ctx,1000,500,0.8,400,400,200)
assert.equal(ctx.textures.length,1,'nuke blast should use one textured fireball')
assert.equal(ctx.strokes,0,'nuke blast should have a textured shockwave')
assert.deepEqual(ctx.vfx.map(([tile])=>tile),[2])
assert.equal(ctx.depth,0)
console.log('Nuke: one missile bitmap, two guidance textures, one fireball, one textured shockwave, no live gradients passed')
