import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const code = ts.transpileModule(read('src/components/games/raid/raidLaunch.ts').replace(/^import .*\n/gm, ''), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { shouldPlayRaidLaunch } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
for (const before of ['select','briefing','gameover','victory']) assert.equal(shouldPlayRaidLaunch(before,'playing',false),true)
for (const before of ['paused','playing']) assert.equal(shouldPlayRaidLaunch(before,'playing',false),false)
assert.equal(shouldPlayRaidLaunch('select','playing',true),false)
assert.equal(shouldPlayRaidLaunch('select','briefing',false),false)
const component=read('src/components/games/raid/RaidLaunchSequence.tsx')
assert.match(component,/pointer|Cosmetic launch/)
assert.match(component,/sideView=\{landscape\}/)
const css=read('src/landscape-ui.css')
assert.match(css,/\.raid__launch-sequence\s*\{[^}]*pointer-events:\s*none/s)
console.log('Launch: new run only, reduced motion, orientation and nonblocking controls passed')
