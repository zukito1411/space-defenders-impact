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

const readRaid = name => readFileSync(new URL('../src/components/games/raid/' + name, import.meta.url),'utf8')
const pickupRules = readRaid('raidPickups.ts').replace(/^import .*\n/gm,'')
const pickupRuntime = readRaid('GradiusRaidRuntime.tsx')
const pickupLoopStart = pickupRuntime.indexOf('    const activePowerUps =')
const pickupLoop = pickupRuntime.slice(pickupLoopStart, pickupRuntime.indexOf('    if (player.score >', pickupLoopStart))
const pickupTestSource = pickupRules + `
const FORCE_FIELD_ARMOR=5, SPACE_ET_PASSIVE_FORCE_FIELD_CHARGES=3, WEAPON_STACK_CAPS={laser:3};
const HEIGHT=100,PLAYER_RADIUS=3.2;
export const player={x:50,y:65,hp:4,maxHp:4,shield:0,forceField:0,ship:{key:'fast'},weapons:{laser:3},score:0};
export const remotePlayer={...player,x:53,hp:2,weapons:{laser:0}};
export const pickupsCollectedRef={current:0}, powerUpsRef={current:[]}, pilotContactRef={current:[null,null]}, effects=[];
const meleeOnly=false,allyMeleeOnly=false,scoreMult=1;
const levelUpPlayer=()=>{},powerColor=()=>'',playPickupVoiceLine=()=>{},playGameSound=()=>{};
const makePilotContact=(kind,pilot)=>({kind,pilot});
const spawnSparks=(x,y)=>effects.push([x,y]),addRipple=(x,y)=>effects.push([x,y]);
export function collect() {` + pickupLoop + '\n}'
const pickupCode = ts.transpileModule(pickupTestSource,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const pickup = await import('data:text/javascript;base64,'+Buffer.from(pickupCode).toString('base64'))
const repair = {x:50,y:65,radius:3,type:'repair'}
assert.equal(pickup.pickRaidPickupPilot(repair,pickup.player,pickup.remotePlayer,18,false,false),pickup.remotePlayer)
assert.equal(pickup.pickRaidPickupPilot(repair,pickup.player,pickup.remotePlayer,2,false,false),null,'full-hull pilot cannot take repair')
assert.equal(pickup.pickRaidPickupPilot({...repair,type:'laser'},pickup.player,pickup.remotePlayer,18,false,false),pickup.remotePlayer)
assert.equal(pickup.pickRaidPickupPilot({...repair,type:'laser'},pickup.player,pickup.remotePlayer,18,false,true),null)
pickup.powerUpsRef.current.push(repair,{...repair,x:80})
pickup.collect()
assert.equal(pickup.remotePlayer.hp,3)
assert.equal(pickup.player.hp,4)
assert.equal(pickup.pickupsCollectedRef.current,1)
assert.equal(pickup.powerUpsRef.current.length,1)
assert.deepEqual(pickup.effects,[[50,65],[50,65]],'both pickup effects must use the real pickup coordinates')
assert.equal(pickup.pilotContactRef.current[1].pilot,pickup.remotePlayer)
console.log('Raid loot: eligible co-op receiver, range/cap gating, and on-screen collection effects passed')

const contactStubs = `
const RAID_CONTACT_TILE={salvage:'salvage',deflect:'deflect',hull:'hull'};
const drawRaidContactArt=(ctx,...args)=>ctx.push(args);
`
const contactCode = ts.transpileModule(contactStubs + readRaid('pilotContactFx.ts').replace(/^import .*\n/gm,''),
  {compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const contactFx = await import('data:text/javascript;base64,'+Buffer.from(contactCode).toString('base64'))
const contacts = []
const shieldHit = {kind:'shield',at:100,angle:0}
assert.equal(contactFx.drawPilotContact(contacts,shieldHit,60,80,64,125,false),true)
assert.equal(contacts[0][0],'deflect')
assert.ok(contacts[0][1]>60)
assert.equal(contactFx.drawPilotContact(contacts,shieldHit,60,80,64,380,false),false)
const salvage = {kind:'salvage',at:100,angle:0}
contactFx.drawPilotContact(contacts,salvage,60,80,64,240,true)
assert.equal(contacts[1][0],'salvage')
assert.equal(contacts[1][6],0,'reduced motion disables salvage rotation')
