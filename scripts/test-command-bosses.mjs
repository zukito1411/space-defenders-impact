import assert from 'node:assert/strict'
import { readFileSync,writeFileSync } from 'node:fs'
import ts from 'typescript'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const strip=s=>s.replace(/^import .*\n/gm,'')
const load=source=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'))
const source='const PLAYER_MAX_RANK=20;\n'+strip(read('src/components/games/raid/bossCatalog.ts'))+strip(read('src/components/games/raid/commandBoss.ts'))
const m=await load(source)
const boss=(stage,hp=1)=>({isBoss:true,bossKind:m.getCampaignBossKind(stage),bossArtStage:stage,id:1,x:50,y:20,hp:10000*hp,maxHp:10000,shieldTime:0,phase:0,radius:12,chargeLane:50,chargeTimer:0,chargeCooldown:0,fireCooldown:0})
assert.equal(m.COMMAND_BOSS_PROFILES.length,12)
assert.equal(new Set(m.COMMAND_BOSS_PROFILES.map(p=>JSON.stringify([p.sequence,p.movement,p.speed,p.warning]))).size,12)
for(const profile of m.COMMAND_BOSS_PROFILES) {
 const kind = m.getCampaignBossKind(profile.stage)
 for (const difficulty of ['easy', 'normal', 'hard', 'expert']) {
  const hp = rank => m.getCommandBossHpScale(kind, profile.stage, rank, undefined, difficulty)
  assert.equal(hp(1), profile.hp)
  assert.ok(hp(10) > hp(1) * 1.35)
  assert.ok(hp(20) - hp(10) > hp(10) - hp(1), 'higher ranks should add more HP')
  assert.equal(hp(21), hp(20))
  assert.equal(hp(NaN), hp(1))
 }
 const maxRank = m.getCommandBossHpScale(kind, profile.stage, 20)
 assert.ok(maxRank >= profile.hp * 2.86 && maxRank <= profile.hp * 2.863)
 assert.equal(m.getCommandBossHpScale(m.getCampaignBossKind(profile.stage),profile.stage,10,20),m.getCommandBossHpScale(m.getCampaignBossKind(profile.stage),profile.stage,15))
}
for(const kind of ['squid','snake','final','devil'])assert.equal(m.getCommandBossHpScale(kind,15,20),1)
// Warnings latch target, origin, phase, speed and duration. HP loss cannot shorten a committed warning.
for(const p of m.COMMAND_BOSS_PROFILES) {
 const e=boss(p.stage),emit=()=>assert.fail('unexpected early volley')
 const targets=[{x:22,y:80},{x:78,y:75}]
 assert.ok(m.advanceCommandBoss(e,1/60,targets,'expert',120,emit)&m.COMMAND_WARNING)
 const frozen=[e.bossAimX,e.bossAimY,e.bossAttackX,e.bossAttackY,e.bossWarningSeconds,e.bossShotSpeed,e.bossCombatPhase]
 e.hp=1000;targets[0].x=90
 for(let i=0;i<3;i++)m.advanceCommandBoss(e,.1,targets,'expert',120,emit)
 assert.deepEqual([e.bossAimX,e.bossAimY,e.bossAttackX,e.bossAttackY,e.bossWarningSeconds,e.bossShotSpeed,e.bossCombatPhase],frozen)
 const snapshot=JSON.stringify(e)
 m.advanceCommandBoss(e,0,targets,'expert',120,emit);assert.equal(JSON.stringify(e),snapshot,'pause advanced a boss')
 m.interruptCommandBoss(e);assert.equal(e.bossAttackState,'recovery');assert.equal(e.bossAttackTimer,.9)
}
// Entry shields, dead bosses and special models never emit through this scheduler.
for(const props of [{shieldTime:1},{y:5},{y:15.5},{hp:0},{bossKind:'squid',bossArtStage:undefined}]) {
 let fired=0;const e={...boss(1),...props}
 for(let i=0;i<120;i++)m.advanceCommandBoss(e,1/60,[{x:50,y:80}],'normal',120,()=>fired++)
 assert.equal(fired,0);assert.equal(e.bossEncounterAge,undefined)
}
let observedPeak=0
function run(stage,ratio,fps,difficulty='normal',duration=60,targetMode='static') {
 const e=boss(stage,ratio),shots=[],history=[],patterns=new Set(),targets=[{x:50,y:82}]
 let fired=0,peak=0,minWarning=99,lastWarning=0,warning=false,maxVolley=0,hits=0,invuln=0
 const times=[]
 for(let frame=0;frame<Math.round(duration*fps);frame++) {
  const t=frame/fps,dt=1/fps
  if(targetMode==='strafe')targets[0].x=50+Math.sin(t*.75)*30
  invuln=Math.max(0,invuln-dt)
  for(let i=shots.length-1;i>=0;i--) {
   const s=shots[i];s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt
   if(s.life<=0||s.x< -12||s.x>112||s.y< -12||s.y>112){shots.splice(i,1);continue}
   const hit=s.kind==='beam'?Math.abs(s.x-targets[0].x)<=s.radius*.82+3.2*.72:Math.hypot(s.x-targets[0].x,s.y-82)<=s.radius+3.2
   if(hit&&invuln<=0){hits++;invuln=1.05}
  }
  const oldX=e.x,oldY=e.y,state=e.bossAttackState
  let volley=0
  const event=m.advanceCommandBoss(e,dt,targets,difficulty,Math.max(0,120-shots.length),shot=>{shots.push({...shot});volley++})
  if(event&m.COMMAND_WARNING) {
   warning=true;lastWarning=t;patterns.add(e.bossAttackPattern)
   history.push({serial:e.bossAttackSerial,x:e.bossAimX,phase:e.bossCombatPhase,pattern:e.bossAttackPattern})
   minWarning=Math.min(minWarning,e.bossWarningSeconds)
   assert.ok(e.bossWarningSeconds>=(m.isCommandBeam(e.bossAttackPattern)?1.05:.78)-1e-9)
  }
  if(event&m.COMMAND_FIRED) {
   if(warning)assert.ok(t-lastWarning>=e.bossWarningSeconds-1/fps-1e-8,'danger before warning completed')
   warning=false;fired++;times.push(t)
  }
  assert.ok(Math.abs(e.x-oldX)<=31*dt+1e-9&&Math.abs(e.y-oldY)<=8*dt+1e-9,'boss teleported')
  if(state==='warning'||state==='burst')assert.equal(e.x,oldX,'boss moved its locked muzzle during a warning/burst')
  assert.ok(e.x>=18&&e.x<=82&&e.y>=16&&e.y<=28)
  maxVolley=Math.max(maxVolley,volley);peak=Math.max(peak,shots.length)
  assert.ok(volley<=12&&shots.length<=120)
  for(const s of shots) {
   assert.ok([s.x,s.y,s.vx,s.vy,s.radius,s.life].every(Number.isFinite))
   assert.ok(Math.hypot(s.vx,s.vy)<=48+1e-8,'projectile exceeded tuned speed cap')
  }
 }
 observedPeak=Math.max(observedPeak,peak)
 return {stage,ratio,fps,difficulty,fired,peak,minWarning,maxVolley,hits,patterns:[...patterns],history,times}
}
const report=[]
for(const p of m.COMMAND_BOSS_PROFILES) {
 for(const ratio of [1,.55,.2]) {
  const samples=[30,60,144].map(fps=>run(p.stage,ratio,fps))
  const counts=samples.map(s=>s.fired)
  assert.ok(Math.max(...counts)-Math.min(...counts)<=2,'attack cadence depends on refresh rate')
  assert.ok(samples.every(s=>s.patterns.length>=new Set(p.sequence).size),'boss never executes its whole pattern sequence')
  report.push(samples[1])
 }
 for(const difficulty of ['easy','hard','expert'])run(p.stage,.2,60,difficulty,45)
}
// Clamp dangerous attacks atomically under load; require a new warning after deferred shots or a nuke.
const capped=boss(13);let emitted=0
m.advanceCommandBoss(capped,.01,[{x:50,y:80}],'expert',0,()=>emitted++)
for(let i=0;i<20;i++)m.advanceCommandBoss(capped,.1,[{x:50,y:80}],'expert',0,()=>emitted++)
assert.equal(emitted,0)
assert.equal(capped.bossLastVolleyAge, undefined)
m.interruptCommandBoss(capped)
for(let i=0;i<8;i++)m.advanceCommandBoss(capped,.1,[{x:50,y:80}],'expert',120,()=>emitted++)
assert.equal(emitted,0,'nuke caused an immediate retaliation')
// Paired pilots alternate bait targets; existing flat snapshot clone/compact paths preserve every field.
const coop=boss(11),bait=[]
for(let i=0;i<1200;i++) {
 const event=m.advanceCommandBoss(coop,1/60,[{x:18,y:80},{x:82,y:80}],'normal',120,()=>{})
 if(event&m.COMMAND_WARNING)bait.push(coop.bossAimX)
}
assert.ok(bait.length>4);assert.ok(bait.every((x,i)=>x===(i%2?82:18)))
const draft=m.createCommandVolley()
for(const p of m.COMMAND_BOSS_PROFILES)for(const pattern of p.sequence)for(const aimX of [8,50,92]) {
 const e={...boss(p.stage),bossAttackPattern:pattern,bossAimX:aimX,bossAimY:82,bossGapX:Math.max(22,Math.min(78,aimX)),bossCombatPhase:2,bossShotSpeed:40,bossBurstCount:3}
 const count=m.writeCommandVolley(e,draft)
 assert.ok(count>0&&count<=12)
 if(pattern==='curtain')for(let i=0;i<count;i++)assert.ok(Math.abs(draft[i].x-e.bossGapX)>=13,'curtain fills its advertised corridor')
 if(pattern==='twinBeam')assert.ok(draft[1].x-draft[0].x>=28-1e-9,'paired beams close the safe center')
}
const longRun=run(14,.2,60,'expert',600)
assert.ok(longRun.peak<120,'ordinary fight constantly exhausts its shot budget')

// A simple stationary/continuous-strafe comparison is diagnostic, not a human playtest.
const diagnostics=m.COMMAND_BOSS_PROFILES.map(p=>({stage:p.stage,stationary:run(p.stage,.55,60,'normal',60).hits,strafe:run(p.stage,.55,60,'normal',60,'strafe').hits}))
const output=process.argv.indexOf('--report')
function legacyVolleys(stage) {
 let timer=Math.max(.75,1-(stage-1)*.025),count=0
 const interval=Math.max(.85,1.82-stage*.028-stage*.035)
 for(let i=0;i<3600;i++) {
  const next=timer-1/60
  if(next<=0&&(i/60)%6<=3)count++
  timer=next<=0?interval:next
 }
 return count
}
if(output>=0)writeFileSync(process.argv[output+1],JSON.stringify({scenario:'60s fixed-HP scripted encounters at 100%, 55%, 20% HP; no player DPS, browser or GPU. Bot hits are diagnostic, not a human fairness proof.',
 phases:[1,.55,.2],profiles:m.COMMAND_BOSS_PROFILES.map(p=>{
  const rows=report.filter(r=>r.stage===p.stage),bots=diagnostics.find(r=>r.stage===p.stage)
  return {stage:p.stage,legacyVolleys:legacyVolleys(p.stage),newVolleys:rows.map(r=>r.fired),peakShots:rows.map(r=>r.peak),minimumWarnings:rows.map(r=>Number(r.minWarning.toFixed(4))),hpScaleRank1:m.getCommandBossHpScale(m.getCampaignBossKind(p.stage),p.stage,1),hpScaleRank20:Number(m.getCommandBossHpScale(m.getCampaignBossKind(p.stage),p.stage,20).toFixed(4)),stationaryHits:bots.stationary,strafeHits:bots.strafe}
 }),observedPeakShots:observedPeak,tenMinutePeak:longRun.peak},null,2)+'\n')
console.log(`Command bosses: 12 profiles, 3 HP phases, 4 difficulties, 30/60/144Hz cadence, locked warnings, nuke recovery, co-op targets and 10-minute bounds passed (observed peak ${observedPeak} shots)`)
console.log('Scripted hit diagnostics:',JSON.stringify(diagnostics))
// Exercise real Canvas warnings in portrait/landscape; every beam covers the actual collision lane.
const warnings=await load(source+'\nconst PLAYER_RADIUS=3.2;\n'+strip(read('src/components/games/raid/commandBossRender.ts')))
for(const [w,h] of [[390,844],[1280,720]])for(const p of m.COMMAND_BOSS_PROFILES)for(const pattern of p.sequence) {
 const e={...boss(p.stage),bossAttackState:'warning',bossAttackPattern:pattern,bossAttackTimer:.5,bossWarningSeconds:1,bossAimX:50,bossAimY:82,bossGapX:36,bossCombatPhase:1,bossShotSpeed:36}
 const fills=[],moves=[],lines=[];let strokes=0
 const ctx={save(){},restore(){},setLineDash(){},beginPath(){},moveTo(...args){moves.push(args)},lineTo(...args){lines.push(args)},fillRect(...args){fills.push(args)},stroke(){strokes++},set filter(v){assert.fail('telegraph live filter')},set shadowBlur(v){assert.fail('telegraph live blur')}}
 warnings.drawCommandBossTelegraph(ctx,e,v=>v*w/100,v=>v*h/100,w)
 assert.equal(strokes,1);assert.ok(moves.length<=12&&lines.length<=12)
 assert.ok([...moves,...lines,...fills].flat().every(Number.isFinite))
 if(m.isCommandBeam(pattern)) {
  const n=m.writeCommandVolley(e,draft)
  assert.equal(fills.length,n)
  for(let i=0;i<n;i++) {
   const half=draft[i].radius*.82+3.2*.72
   assert.ok(Math.abs(fills[i][0]-(draft[i].x-half)*w/100)<1e-8)
   assert.ok(Math.abs(fills[i][2]-half*2*w/100)<1e-8)
   assert.equal(fills[i][1],0);assert.equal(fills[i][3],h)
  }
 }
 if(pattern==='hydra')assert.equal(moves.length,3,'Hydra warning failed to preview every staggered head')
}
// Use the production renderer to check that phase and muzzle effects follow simulation events.
const effectBoss = boss(11, .5)
m.advanceCommandBoss(effectBoss, .01, [{x:50,y:80}], 'normal', 120, () => {})
assert.equal(effectBoss.bossPhaseStartedAge, effectBoss.bossEncounterAge)
const arcs = [], ellipses = [], fills = [], labels = []
const effectsContext = {
 save(){}, restore(){}, beginPath(){}, moveTo(){}, stroke(){}, fill(){},
 arc(...args){ arcs.push(args) },
 ellipse(...args){ ellipses.push(args) },
 fillRect(...args){ fills.push(args) },
 fillText(...args){ labels.push(args) },
}
warnings.drawCommandBossEnergy(effectsContext, effectBoss, x=>x*3.9, y=>y*8.44, 130)
assert.equal(ellipses.length,1,'phase change should trigger a pulse')
assert.equal(arcs.length,2,'charge ring should show the outline and progress')
assert.equal(arcs[1][3],arcs[1][4],'the charge arc starts empty')
warnings.drawCommandBossHealthBar(effectsContext, effectBoss, 195, 168.8, 130)
assert.deepEqual(fills.slice(-2).map(([left])=>left),[136.5+117*.3-1,136.5+117*.65-1])
assert.equal(labels[0][0],m.getGenericBossArt(effectBoss.bossKind,11).name)

const released = []
for (let step = 0; step < 100 && !released.length; step++) {
 m.advanceCommandBoss(effectBoss, .02, [{x:50,y:80}], 'normal', 120, shot => released.push({...shot}))
}
assert.equal(released.length,1)
assert.equal(effectBoss.bossLastVolleyAge, effectBoss.bossEncounterAge)
arcs.length=0
warnings.drawCommandBossEnergy(effectsContext, effectBoss, x=>x*3.9, y=>y*8.44, 130)
assert.deepEqual(arcs.map(arc=>arc.slice(0,2)), released.map(shot=>[shot.x*3.9,shot.y*8.44]), 'flash must use actual staggered firing points')
arcs.length=0
ellipses.length=0
warnings.drawCommandBossEnergy(effectsContext, {...effectBoss,bossEncounterAge:effectBoss.bossEncounterAge+1}, x=>x,y=>y,130)
assert.equal(arcs.length,0,'release effect must expire')
assert.equal(ellipses.length,0,'phase pulse must expire')

// Real network interpolation preserves committed targets and never blends different attack warnings.
const net=read('src/components/games/raid/network.ts')
const interpolation=await load('const cloneEnemy=e=>({...e});\n'+net.slice(net.indexOf('export function interpolateEnemyVisual('),net.indexOf('const enemyIdMapCache')))
const prev={...boss(12),bossAttackState:'warning',bossAttackSerial:1,bossAttackTimer:1,bossAimX:20}
const next={...prev,bossAttackTimer:.5,bossAimX:20}
assert.equal(interpolation.interpolateEnemyVisual(prev,next,.5).bossAttackTimer,.75)
assert.equal(interpolation.interpolateEnemyVisual(
 {...prev,bossEncounterAge:4}, {...next,bossEncounterAge:4.1}, .5).bossEncounterAge, 4.05)

const changed={...next,bossAttackSerial:2,bossAttackTimer:1.1,bossAimX:80}
assert.equal(interpolation.interpolateEnemyVisual(prev,changed,.5).bossAttackTimer,1.1)
assert.equal(interpolation.interpolateEnemyVisual(prev,changed,.5).bossAimX,80)
// Execute actual nuke callback: shots clear and a command boss gets recovery, with normal nuke damage retained.
const runtime=read('src/components/games/raid/GradiusRaidRuntime.tsx')
const nuke=runtime.slice(runtime.indexOf('  const detonateNuke = useCallback('),runtime.indexOf('  const activateNuke = useCallback('))
const nukeHarness=await load(source+`
const useCallback=f=>f;
const phaseRef={current:'playing'},playerRef={current:{x:50,y:80,invuln:0,score:0}},remotePlayerRef={current:null};
const scoreMultRef={current:1},stageRef={current:12},waveRef={current:12},highScoreRef={current:0},killsSincePowerRef={current:0},enemiesDestroyedRef={current:0};
const nukeBlastOriginRef={current:null},nukeFlashRef={current:0};
const asteroidsRef={current:[]},meteorsRef={current:[]},ionStrikesRef={current:[]},wrecksRef={current:[]};
export const enemiesRef={current:[]},enemyShotsRef={current:[]};
const HEIGHT=100,NUKE_FLASH_SECONDS=1;
const addRipple=()=>{},spawnSparks=()=>{},triggerScreenShake=()=>{},playGameSound=()=>{},syncSnapshot=()=>{};
const getNukeBossDamage=()=>1000;
`+nuke+'\nexport {detonateNuke};')
const charged={...boss(12),bossEncounterAge:8,bossAttackState:'warning',bossAttackTimer:.1,bossAttackPattern:'twinBeam',bossLastVolleyAge:7.95}
nukeHarness.enemiesRef.current.push(charged);nukeHarness.enemyShotsRef.current.push({})
nukeHarness.detonateNuke()
assert.equal(nukeHarness.enemyShotsRef.current.length,0)
assert.equal(charged.bossLastVolleyAge,undefined);assert.equal(charged.hp,9000);assert.equal(charged.bossAttackState,'recovery');assert.equal(charged.bossAttackTimer,.9)
console.log('Command warnings/integration: matching beam hit lanes, bounded Canvas strokes, three-head preview, atomic co-op warnings and real nuke interruption passed')
// Execute the production host enemy loop, not only the standalone scheduler.
const updateStart=runtime.indexOf('  const updateGame = useCallback(')
const hostLoop=runtime.slice(runtime.indexOf('    const enemies = enemiesRef.current',updateStart),runtime.indexOf('    enemies.length = liveEnemyCount',updateStart)+'    enemies.length = liveEnemyCount'.length)
try {
const host=await load(source+`
const HEIGHT=100,WIDTH=100;
const player={x:50,y:82},livingPlayersThisTick=[player];
export const enemiesRef={current:[]},enemyShotsRef={current:[]};
const raidModeRef={current:'campaign'},raidDifficultyRef={current:'normal'},stageRef={current:1},waveRef={current:1};
const bossAlertRef={current:0},bossMessageRef={current:null};
const BOSS_RUSH_MOTION_SCALE=1.18,BOSS_RUSH_SPECIAL_RECHARGE_SCALE=1.32,BOSS_RUSH_ATTACK_COOLDOWN_SCALE=.72;
export let legacyFires=0,totalShots=0;
const playBossCriticalStinger=()=>{},getNearestLivingPlayerThisTick=()=>player;
const fireEnemy=()=>{legacyFires++},playGameSound=()=>{},addRipple=()=>{};
let shotId=0;
const emitCommandBossShot=s=>{enemyShotsRef.current.push({...s,id:shotId++});totalShots++};
export function tick(dt,now){const nowSeconds=now/1000;
`+hostLoop+'\n}\n')
for(const p of m.COMMAND_BOSS_PROFILES) {
 const e={...boss(p.stage),isMiniBoss:false,vx:0,vy:7,originX:50,trainSlot:0,pathSpeed:.05,pattern:0,amplitude:0,phase:0}
 host.enemiesRef.current=[e]
 const before=host.totalShots
 for(let i=0;i<900;i++){host.enemyShotsRef.current.length=0;host.tick(1/60,100000+i*1000/60)}
 assert.ok(host.totalShots>before,'production host loop never emitted the new boss attacks')
 assert.ok(e.bossAttackSerial>=3,'production loop did not progress the encounter')
 assert.ok(Math.abs(e.bossEncounterAge-15)<1e-7,'production loop used a wall clock instead of dt')
 assert.ok(e.x>=18&&e.x<=82&&e.y>=16&&e.y<=28)
 assert.equal(e.fireCooldown,0,'legacy fire cooldown is still competing with the encounter')
}
assert.equal(host.legacyFires,0,'ordinary bosses still call the legacy fire path')
console.log('Command host integration: all twelve ships emit through the real enemy loop, retain dt timing/movement, and bypass the old pause/fire callback')

} catch (error) { throw new Error(`Production host loop check: ${error.name}: ${error.message}`) }
