import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const code=fs.readFileSync('src/components/games/raid/carrierClamps.ts','utf8').replace(/^import .*\n/gm,'')
const {sampleDockClamps}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'))
for(const mech of [false,true])for(const hull of [120,250,410,620]){
 const dock={x:840,y:470,hull,floor:608,ceiling:270,mech},initial=sampleDockClamps(dock,0)
 for(let i=0;i<=100;i++){
  const a=sampleDockClamps(dock,i/100)
  for(let j=0;j<4;j++){
   assert.ok(Object.values(a[j]).every(Number.isFinite))
   assert.equal(a[j].bx,initial[j].bx);assert.equal(a[j].by,initial[j].by)
   for(const length of [Math.hypot(a[j].ex-a[j].bx,a[j].ey-a[j].by),Math.hypot(a[j].tx-a[j].ex,a[j].ty-a[j].ey)])assert.ok(Math.abs(length-initial[j].length)<1e-6,'link stretches')
   if(i===100)assert.ok(Math.hypot(a[j].tx-a[j].bx,a[j].ty-a[j].by)<hull*.12,'jaw not stowed at mount')
  }
 }
}
console.log('Clamp rig: fixed mounts, rigid links, finite motion and fully stowed jaws across hull sizes passed')
