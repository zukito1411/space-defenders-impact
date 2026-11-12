import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const sourceText = readFileSync(new URL('../src/components/games/raid/GradiusRaidRuntime.tsx', import.meta.url), 'utf8')
const source = ts.createSourceFile('GradiusRaidRuntime.tsx', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let raid, quick
function visit(node) {
  if (ts.isJsxOpeningElement(node)) {
    const props = node.attributes.properties
    if (props.some(p => ts.isJsxAttribute(p) && p.name.getText(source)==='ref' && p.initializer?.getText(source)==='{rootRef}')) raid=node
    if (props.some(p => ts.isJsxAttribute(p) && p.name.getText(source)==='className' && p.initializer?.getText(source)==='"raid__nuke-quick"')) quick=node
  }
  ts.forEachChild(node, visit)
}
visit(source)
assert.ok(raid && quick, 'could not find real gameplay and nuke controls')
const handler = (node, name) => {
  const prop=node.attributes.properties.find(p=>ts.isJsxAttribute(p) && p.name.getText(source)===name)
  assert.ok(prop && ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression, 'missing '+name)
  return prop.initializer.expression.getText(source)
}
const names=['onPointerDown','onPointerMove','onPointerUp','onPointerCancel','onLostPointerCapture','onPointerLeave']
const buttonNames=['onPointerDown','onPointerMove','onPointerUp','onPointerCancel','onClick']
const obj=(node, props)=>props.map(name=>name+':'+handler(node,name)).join(',')
const harness = `
export const phaseRef={current:'playing'},sameScreenCoopRef={current:false},steeringPointerIdRef={current:null},moves=[],captures=[]
export let clears=0, launches=0
const isUiPointerTarget=target=>target==='button'
const updatePointer=(x,y,type)=>moves.push([x,y,type])
const clearPointer=()=>{clears++;steeringPointerIdRef.current=null}
const activateNuke=()=>{launches++}
export const raid={${obj(raid,names)}}
export const quick={${obj(quick,buttonNames)}}
`
const js=ts.transpileModule(harness,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const h=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const event=(id,target='screen')=>({pointerId:id,pointerType:'touch',button:0,detail:1,clientX:id*10,clientY:5,target,
  currentTarget:{setPointerCapture(id){h.captures.push(id)}},stopPropagation(){this.stopped=true},preventDefault(){this.prevented=true}})
const first=event(11), second=event(12,'button')
h.raid.onPointerDown(first)
assert.equal(h.steeringPointerIdRef.current,11)
assert.deepEqual(h.captures,[11])
h.quick.onPointerDown(second)
assert.equal(second.stopped,true)
assert.equal(second.prevented,true)
assert.equal(h.launches,1,'non-primary touch must activate immediately while steering')
h.raid.onPointerDown(second)
h.raid.onPointerMove(event(12))
h.raid.onPointerUp(second)
h.raid.onPointerCancel(second)
assert.equal(h.steeringPointerIdRef.current,11,'second finger interrupted steering')
assert.equal(h.clears,0)
h.quick.onClick(second)
assert.equal(h.launches,1,'pointer click must not activate twice')
h.quick.onClick({detail:0})
assert.equal(h.launches,2,'keyboard and assistive clicks must activate')
const rightClick=event(14,'button');rightClick.button=2
h.quick.onPointerDown(rightClick)
assert.equal(h.launches,2,'secondary mouse button must not activate')
h.raid.onPointerMove(event(11))
assert.equal(h.moves.length,2,'steering did not continue')
h.raid.onPointerDown(event(13))
assert.equal(h.steeringPointerIdRef.current,11,'second playfield finger stole steering')
h.raid.onPointerUp(first)
assert.equal(h.steeringPointerIdRef.current,null)
assert.equal(h.clears,1)
h.raid.onLostPointerCapture(first)
assert.equal(h.clears,1,'capture loss cleared twice')
assert.match(sourceText,/\{nukeReady\s*&&\s*\(/,'quick control must only appear when ready')
assert.match(sourceText,/RAID_OTHER_ASSET_PATHS\.nukeMissile/,'quick control must use the nuke artwork')
const css=readFileSync(new URL('../src/landscape-ui.css',import.meta.url),'utf8')
const rule=css.match(/#root \.raid--landscape \.raid__nuke-quick\s*\{([^}]+)\}/)
assert.ok(rule,'missing landscape quick control rule')
for (const declaration of [/display:\s*inline-flex/,/right:/,/bottom:/,/opacity:\s*\.55/,/pointer-events:\s*auto/,/touch-action:\s*none/,/min-height:\s*60px/,/border-radius:\s*50%/]) assert.match(rule[1],declaration)
console.log('Landscape quick special and independent multitouch steering checks passed')

