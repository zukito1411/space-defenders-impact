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

const audioSource = readFileSync(new URL('../src/components/games/sound.ts', import.meta.url), 'utf8')
const cueStart = audioSource.indexOf('const RAID_CUES =')
const mockAudio = `
export const events = [];
export const config = { enabled: true, pan: true, master: 1 };
const MAX_SFX_OUTPUT = .5;
const getGameSoundEnabled = () => config.enabled;
const getGameAudioMixSettings = () => ({ master: config.master, beam: 1, impact: 1, ui: 1 });
const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {} });
const getAudioContext = () => ({
 currentTime: 2,
 destination: { type: 'speaker' },
 createOscillator() {
  return { frequency: param(), connect() {}, start(t) { events.push(['start', t]); }, stop() {} };
 },
 createGain() { return { gain: param(), connect(node) { events.push(['route', node.type]); } }; },
 createStereoPanner: config.pan ? () => ({ type: 'stereo', pan: {}, connect() {} }) : undefined,
});
`
const cueSource = mockAudio + audioSource.slice(cueStart, audioSource.indexOf('export function playGameSound(', cueStart))
const audioCode = ts.transpileModule(cueSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { events, config, playRaidCue } = await import('data:text/javascript;base64,' + Buffer.from(audioCode).toString('base64'))
playRaidCue('hydra', .6, .22)
assert.deepEqual(events.splice(0), [['route', 'stereo'], ['start', 2.22]])
config.pan = false
playRaidCue('beamCharge', .6)
assert.deepEqual(events.splice(0), [['route', 'speaker'], ['start', 2]])
config.enabled = false
playRaidCue('flyby')
assert.equal(events.length, 0)
config.enabled = true
config.master = 0
playRaidCue('ready')
assert.equal(events.length, 0)
console.log('Combat audio: timed stereo cues, mono fallback and mixer mute passed')
