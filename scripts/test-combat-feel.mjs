import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('../src/components/games/raid/combatFeel.ts', import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const {impactFrameProgress,impactScale,impactAlpha,updateFlightPose,explosionDiameter,rippleLifetime,rippleReplacement}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
let previousFrame=0, previousSize=0, previousAlpha=1
for(let i=0;i<=100;i++) {
  const p=i/100, frame=impactFrameProgress(p), size=impactScale(p), alpha=impactAlpha(p)
  assert.ok(frame>=previousFrame && frame<=1)
  assert.ok(size>=previousSize && size<=1.22+1e-12)
  assert.ok(alpha<=previousAlpha && alpha>=0)
  previousFrame=frame;previousSize=size;previousAlpha=alpha
}
assert.equal(impactFrameProgress(0.38),0.5,'ignition should bloom before mid-lifetime')
assert.equal(impactAlpha(1),0,'last frame should fade without popping')
assert.equal(impactFrameProgress(-10),0)
assert.equal(impactFrameProgress(10),1)
function bank(hz) {
  const pose={time:0,x:30,bank:0}
  for(let i=1;i<=hz;i++) updateFlightPose(pose,i/hz*1000,30+24*i/hz)
  return pose
}
const baseline=bank(60)
for(const hz of [30,120,144]) assert.ok(Math.abs(bank(hz).bank-baseline.bank)<1e-10,'bank differs by display rate')
assert.ok(baseline.bank>0 && baseline.bank<=0.14)
for(let i=1;i<=60;i++) updateFlightPose(baseline,1000+i/60*1000,54)
assert.ok(Math.abs(baseline.bank)<0.00001,'bank should settle after releasing movement')
updateFlightPose(baseline,2016,90)
assert.equal(baseline.bank,0,'teleport should reset visual bank')
updateFlightPose(baseline,5000,91)
assert.equal(baseline.bank,0,'resume should reset visual bank')
console.log('Combat feel: impact envelopes, smooth fade, rate-independent bank, settle and teleport/resume reset passed')

assert.equal(rippleLifetime(10,true),0.9)
assert.equal(rippleLifetime(20,true),1.25)
assert.equal(rippleLifetime(20,false),0.38)
assert.ok(explosionDiameter(8,1,0.5)>60,'explosion should be large enough to read')
assert.ok(explosionDiameter(1000,1,1)<=220,'explosion must stay bounded')
assert.equal(rippleReplacement([{size:15},{size:12}],2),-1,'tiny hits must not evict major blasts')
assert.equal(rippleReplacement([{size:15},{size:3}],12),1,'replace the weakest effect first')
