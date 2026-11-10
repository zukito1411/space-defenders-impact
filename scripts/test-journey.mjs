import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source=readFileSync(new URL('../src/components/games/raid/journey.ts',import.meta.url),'utf8')
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {createRaidJourneyView,sampleRaidJourney,getRaidStageEntrySeconds,JOURNEY_CLEAR_SECONDS}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
const timingSource=readFileSync(new URL('../src/components/games/raid/constants.ts',import.meta.url),'utf8')
assert.equal(JOURNEY_CLEAR_SECONDS,Number(timingSource.match(/STAGE_CLEAR_SECONDS = ([\d.]+)/)[1]),'journey clear timing diverged from game timing')
assert.equal(getRaidStageEntrySeconds(1,'campaign'),Number(timingSource.match(/STAGE_ENTRY_SECONDS = ([\d.]+)/)[1]),'ordinary entry timing diverged')
const sample=(input,previous=0)=>sampleRaidJourney(input,createRaidJourneyView(),previous)
const base=(stage,age=0)=>({stageTheme:stage,stageNumber:stage,stageAge:age,raidMode:'campaign'})
for(const start of [1,6]) {
 let last=0
 for(let stage=start;stage<start+4;stage++) for(const age of [0,10,25,50]) {
  const view=sample(base(stage,age));assert.ok(view.size>=last,'destination got farther away across its approach arc');last=view.size
  assert.equal(view.planet,start===1?0:1);assert.equal(view.worldAlpha,0)
 }
}
for(const stage of [1,2,3,6,7,8,11,12,13]) {
 const end=sample({...base(stage,36),clearRemaining:1e-8})
 const next=sample({...base(stage+1),entryRemaining:1.18},stage)
 for(const key of stage<10?['size','x','y']:['fleetSize','approach'])assert.ok(Math.abs(end[key]-next[key])<1e-6,'ordinary route handoff jumped '+stage+' '+key)
}
for(const target of [5,10]) {
 const theme=target===5?9101:9102
 const before=sample(base(target-1,40))
 const clearStart=sample({...base(target-1,40),clearRemaining:3.15})
 for(const k of ['size','x','y'])assert.ok(Math.abs(before[k]-clearStart[k])<1e-10,'clear start jumped '+k)
 const clearEnd=sample({...base(target-1,43),clearRemaining:1e-8})
 const enterStart=sample({...base(target),stageTheme:theme,entryRemaining:2.4},target-1)
 for(const k of ['size','x','y','worldAlpha','worldZoom'])assert.ok(Math.abs(clearEnd[k]-enterStart[k])<1e-6,'stage boundary jumped '+k)
 assert.equal(enterStart.phase,'descent')
 const land=sample({...base(target,2.4),stageTheme:theme})
 assert.equal(land.worldAlpha,1);assert.equal(land.worldZoom,1);assert.equal(land.phase,'surface')
 const exitStart=sample({...base(target,50),stageTheme:theme,clearRemaining:3.15})
 assert.equal(exitStart.worldAlpha,1);assert.equal(exitStart.worldZoom,1)
 const exitEnd=sample({...base(target,53),stageTheme:theme,clearRemaining:1e-8})
 const orbit=sample(base(target+1))
 for(const k of ['departing','departureSize','departureX','departureY'])assert.ok(Math.abs(exitEnd[k]-orbit[k])<1e-6,'ascent boundary jumped '+k)
 assert.equal(exitEnd.worldAlpha,0)
 const direct=sample({...base(target),stageTheme:theme,entryRemaining:2.4,raidMode:'bossRush'})
 assert.equal(direct.phase,'descent');assert.equal(direct.worldAlpha,0);assert.equal(direct.size,1.05)
 assert.equal(sample(base(target+1,14)).departing,-1,'departure planet remained forever')
}
const a=sample({...base(14,45),clearRemaining:1e-8}),b=sample({...base(15),stageTheme:9103,entryRemaining:1.18},14)
assert.ok(Math.abs(a.fleetSize-b.fleetSize)<1e-6,'final sector arrival jumped in scale')
assert.ok(Math.abs(a.approach-b.approach)<1e-6)
const rushOceanExit=sample({...base(5,40),stageTheme:9101,raidMode:'bossRush',clearRemaining:1e-8})
const rushLavaEntry=sample({...base(10),stageTheme:9102,raidMode:'bossRush',entryRemaining:2.4},5)
for(const key of ['planet','size','x','y','departing','departureSize','departureX','departureY'])assert.ok(Math.abs(rushOceanExit[key]-rushLavaEntry[key])<1e-6,'Boss Rush planet transfer jumped '+key)
const rushLavaExit=sample({...base(10,40),stageTheme:9102,raidMode:'bossRush',clearRemaining:1e-8})
const rushFleetEntry=sample({...base(15),stageTheme:9103,raidMode:'bossRush',entryRemaining:1.18},10)
for(const key of ['fleetSize','departing','departureSize','departureX','departureY'])assert.ok(Math.abs(rushLavaExit[key]-rushFleetEntry[key])<1e-6,'Boss Rush fleet transfer jumped '+key)
const unknown=sample({...base(3,30),raidMode:'endless'})
assert.equal(unknown.planet,-1,'endless mode invented an unknown future destination')
const endlessExit=sample({...base(3,30),raidMode:'endless',stageTheme:3,departureArena:9101,clearRemaining:1})
assert.equal(endlessExit.planet,-1);assert.equal(endlessExit.fleetSize,0)
assert.equal(endlessExit.skyTheme,4)
for(const age of [0,1,2.4,10]) {
 const view=sample({...base(3,30),stageTheme:9101,raidMode:'endless',arenaAge:age})
 assert.equal(view.worldTheme,9101);assert.ok(view.worldAlpha>=0&&view.worldAlpha<=1)
}
for(const stage of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]) for(const mode of ['campaign','bossRush','endless']) for(const age of [0,1,40,5000]) {
 const view=sample({...base(stage,age),raidMode:mode})
 for(const v of Object.values(view))if(typeof v==='number')assert.ok(Number.isFinite(v))
 assert.ok(view.worldAlpha>=0&&view.worldAlpha<=1)
}
assert.equal(getRaidStageEntrySeconds(5,'campaign'),2.4)
assert.equal(getRaidStageEntrySeconds(10,'bossRush'),2.4)
assert.equal(getRaidStageEntrySeconds(4,'campaign'),1.18)
assert.equal(getRaidStageEntrySeconds(5,'endless'),1.18)
console.log('Journey: staged destination growth, continuous clear/entry/ascent boundaries, direct Boss Rush descent, final fleet approach and endless unknown-destination handling passed')
