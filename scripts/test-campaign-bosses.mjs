import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import ts from 'typescript'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const load=(source,jsx=false)=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:jsx?ts.JsxEmit.React:undefined}}).outputText).toString('base64'))
const catalogSource=read('src/components/games/raid/bossCatalog.ts').replace(/^import .*\n/gm,'')
const catalog=await load(catalogSource)
const {CAMPAIGN_BOSS_ART,GENERIC_BOSS_KINDS,getGenericBossArt,getCampaignBossKind}=catalog
const stages=[1,2,3,4,6,7,8,9,11,12,13,14]
const kinds=['carrier','orb','mantis','serpent','squid','gate','carrier','orb','mantis','snake','hydra','gate','carrier','orb','final']
assert.deepEqual(CAMPAIGN_BOSS_ART.map(a=>a.stage),stages)
assert.equal(new Set(CAMPAIGN_BOSS_ART.map(a=>a.assetPath)).size,12)
for(let stage=1;stage<=15;stage++)assert.equal(getCampaignBossKind(stage),kinds[stage-1])
for(const a of CAMPAIGN_BOSS_ART)assert.equal(getGenericBossArt(a.kind,a.stage),a)
for(const kind of GENERIC_BOSS_KINDS)for(const stage of [undefined,1,3,8,15,400])assert.ok(getGenericBossArt(kind,stage),'Endless attack class lacks a dedicated hull')
for(const kind of ['squid','snake','final','devil',null])assert.equal(getGenericBossArt(kind,15),undefined,'special boss was replaced')
// Execute the real spawn callback, preserving original campaign and Boss Rush combat kind selection.
const runtime=read('src/components/games/raid/GradiusRaidRuntime.tsx')
const spawn=runtime.slice(runtime.indexOf('  const spawnBoss = useCallback('),runtime.indexOf('  const spawnPowerUp = useCallback('))
const spawning=await load(catalogSource+`
const useCallback=f=>f;
const waveRef={current:1},stageRef={current:1},playerRef={current:{rank:1,forceField:0}},raidModeRef={current:'campaign'},enemiesRef={current:[]};
const devilBossNextEligibleStageRef={current:99},remotePlayerRef={current:null},devilPreBuffRankRef={current:0},devilBossEncounteredRef={current:false},devilAssistPlayerRef={current:true};
const bossAlertRef={current:0},bossMessageRef={current:''},bossEntranceSlamRef={current:0},enemyHpMultRef={current:1};
const playerName='pilot',shouldForceLocalDevilBossTest=()=>false,getPowerScore=()=>0,isCoOpActive=()=>false,isCreatorPlayerName=()=>false;
const NORMAL_RAID_DEVIL_BONUS_STAGE=16,MAX_RAID_STAGE=15,PLAYER_MAX_RANK=9,FORCE_FIELD_ARMOR=5;
const BOSS_RUSH_ENTRY_SPEED_SCALE=1.2,BOSS_RUSH_ATTACK_COOLDOWN_SCALE=.72,BOSS_RUSH_MOTION_SCALE=1.18,MULTIPLAYER_BOSS_HP_MULTIPLIER=2;
const DEVIL_BOSS_MIN_STAGE_GAP=5,DEVIL_BOSS_MAX_STAGE_GAP=10,BOSS_ENTRANCE_SLAM_SECONDS=.8;
const BOSS_COLORS=Object.fromEntries(['carrier','orb','mantis','serpent','hydra','gate','super','squid','snake','final','devil'].map(k=>[k,'#123456']));
let enemyId=1,endlessKind='carrier';
const fullyBuffRaidPlayer=()=>{},spawnDevilEncounterAssist=()=>{},triggerScreenShake=()=>{},startRaidBgm=()=>{},playGameSound=()=>{};
const pickEndlessBossKind=()=>endlessKind;
`+spawn+`
export function spawnAt(stage,mode='campaign',kind='carrier'){stageRef.current=stage;raidModeRef.current=mode;endlessKind=kind;spawnBoss();return enemiesRef.current.pop()}
`)
for(let stage=1;stage<=16;stage++) {
 const enemy=spawning.spawnAt(stage)
 assert.equal(enemy.bossKind,stage===16?'devil':kinds[stage-1])
 const art=getGenericBossArt(enemy.bossKind,enemy.bossArtStage)
 assert.equal(enemy.bossArtStage,stages.includes(stage)?stage:undefined)
 if(art)assert.equal(art.stage,stage)
}
for(const stage of [5,10,15]) {
 const enemy=spawning.spawnAt(stage,'bossRush')
 assert.equal(enemy.bossKind,kinds[stage-1]);assert.equal(enemy.bossArtStage,undefined)
}
for(const kind of GENERIC_BOSS_KINDS) {
 const enemy=spawning.spawnAt(25,'endless',kind)
 assert.ok(getGenericBossArt(kind,enemy.bossArtStage))
 const serialized=JSON.parse(JSON.stringify(enemy))
 assert.equal(serialized.bossArtStage,enemy.bossArtStage,'co-op packet lost art identity')
}
// Exercise actual Canvas sprite creation/cache with a fake Image decoder; no image or raster per frame.
const assets=read('src/components/games/raid/assets.ts')
const makeImage=assets.slice(assets.indexOf('export function makeImageCanvasSprite('),assets.indexOf('export function getCanvasSpriteSource('))
const bossSprite=assets.slice(assets.indexOf('export function getGenericBossCanvasSprite('),assets.indexOf('export function getDerelictWreckCanvasSprite('))
const images=await load(catalogSource+`
export let made=0;
const canvasSpriteCache=new Map(),getPublicAssetUrl=p=>p;
class Image {complete=true;constructor(){made++}set src(path){this.path=path;queueMicrotask(()=>globalThis.__bossSourceFail?this.onerror():this.onload())}}
`+makeImage+bossSprite)
const entries=CAMPAIGN_BOSS_ART.map(a=>images.getGenericBossCanvasSprite(a.kind,a.stage))
await Promise.all(entries.map(e=>e.ready))
for(let t=0;t<100;t++)for(const a of CAMPAIGN_BOSS_ART)assert.equal(images.getGenericBossCanvasSprite(a.kind,a.stage),entries[stages.indexOf(a.stage)])
assert.equal(images.made,12);assert.ok(entries.every(e=>e.loaded&&!e.processedImage))
assert.equal(new Set(entries.map(e=>e.cacheKey)).size,12)
// Production boss draw: stable one-image body, no runtime recoloring/filter or old swarm model.
const renderer=await load(`
export const calls=[];
const getGenericBossCanvasSprite=(kind,stage)=>({loaded:!globalThis.__bossMissing,image:{complete:true},kind,stage});
const drawCanvasSpriteContain=(...args)=>calls.push(args.slice(1));
`+read('src/components/games/raid/genericBossRender.ts').replace(/^import .*\n/gm,''))
const ctx={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},arc(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},fillRect(){},set filter(v){assert.fail('live boss filter')},set shadowBlur(v){assert.fail('live boss blur')}}
for(const a of CAMPAIGN_BOSS_ART)renderer.drawGenericBossShip(ctx,{bossKind:a.kind,bossArtStage:a.stage,color:'#123456'},0,0,250,.01,1,1)
assert.equal(renderer.calls.length,12)
assert.ok(renderer.calls.every(args=>args[4]==='none'&&args[5]===1))
globalThis.__bossMissing=true
for(const kind of GENERIC_BOSS_KINDS)renderer.drawGenericBossShip(ctx,{bossKind:kind},0,0,250,0,1,1)
assert.equal(renderer.calls.length,12,'missing source tried to draw an undecoded image')
delete globalThis.__bossMissing
console.log('Campaign bosses: 12 stable stage identities, original attack cycle, Boss Rush specials, Endless mapping, cached decodes, opaque single-image draw and missing-art fallback passed')
// Verify drawRaidEnemy routes all ordinary bosses to the new body and preserves special render paths.
const enemyRender=await load(`
export const paths=[];
const DEG=Math.PI/180,STAGE_CLEAR_SECONDS=3.15,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const getEnemyCanvasSize=()=>250,getStageBossIntroProgress=()=>1;
const drawGenericBossShip=(ctx,enemy)=>paths.push(['generic',enemy.bossKind,enemy.bossArtStage]);
const drawCachedStageBossBody=(ctx,kind)=>paths.push([kind]);
const drawFinalBossSpriteBody=()=>paths.push(['final']),drawDevilGundamBoss=()=>paths.push(['devil']);
const drawEnemyHitFlash=()=>{},drawBossShield=()=>{},drawCachedBossBar=()=>{};
const drawSquidWhipStrike=()=>{},drawSnakeVenomTelegraph=()=>{};
const getNormalAlienCanvasSprite=()=>{throw Error('boss borrowed a normal model')};
const getEliteAlienCanvasSprite=()=>{throw Error('boss borrowed an elite model')};
`+read('src/components/games/raid/enemyRender.ts').replace(/^import .*\n/gm,''))
const frameCtx={...ctx,globalAlpha:1}
for(const art of CAMPAIGN_BOSS_ART)for(const id of [0,1,1001])enemyRender.drawRaidEnemy(frameCtx,{id,bossKind:art.kind,bossArtStage:art.stage,isBoss:true,hp:100,maxHp:100,x:50,y:18,shieldTime:0,chargeTimer:0},v=>v,v=>v,390,100,'none')
assert.equal(enemyRender.paths.length,36)
assert.ok(enemyRender.paths.every(p=>p[0]==='generic'&&stages.includes(p[2])))
for(const kind of ['squid','snake','final','devil'])enemyRender.drawRaidEnemy(frameCtx,{bossKind:kind,isBoss:true,hp:100,maxHp:100,x:50,y:18,shieldTime:0,chargeTimer:0},v=>v,v=>v,1280,100,'none')
assert.deepEqual(enemyRender.paths.slice(-4).map(p=>p[0]),['squid','snake','final','devil'])
// Execute real almanac entry construction and JSX, with simple React nodes (no browser).
const localization=await load(read('src/i18n.ts'))
const progression=read('src/components/ProgressionScreen.tsx')
const part=(start,end)=>progression.slice(progression.indexOf(start),progression.indexOf(end))
const almanac=await load(catalogSource+`
const React={createElement:(type,props,...children)=>({type,props:props??{},children})};
const RAID_ALIEN_SPRITE_COUNT=8,RAID_ELITE_SPRITE_COUNT=5;
const hasProgressionUnlockOverride=()=>false;
const getRaidAlienSpriteUrl=i=>'normal:'+i,getRaidEliteSpriteUrl=i=>'elite:'+i,getPublicAssetUrl=p=>p;
function BossBriefingCanvas(){}
`+part('const NORMAL_ALIEN_VARIANTS','type ShipPreviewVisualStyle')+
part('const RAID_BOSS_STAGES:','const DEFENSE_ACHIEVEMENT_IDS:')+
part('function getRaidBestStage(','function getViewTitle(')+
part('function getStageBossEntries(','function maskRecoveryCode(')+
part('function EnemyAlmanac(','function CodexCutsceneLauncher(')+
'\nexport {getStageBossEntries,EnemyAlmanac};',true)
const walk=(node,predicate)=>{
 if(!node)return []
 if(Array.isArray(node))return node.flatMap(n=>walk(n,predicate))
 if(typeof node!=='object')return []
 return [...(predicate(node)?[node]:[]),...(node.children??[]).flatMap(c=>walk(c,predicate))]
}
for(const language of ['en','zh','ja','ko']) {
 const text=localization.getReleaseText(language)
 const list=almanac.getStageBossEntries(localization.getRaidText(language).briefingPanels,text.enemyAlmanac.devilBoss,text.enemyAlmanac.bossBehaviors,text.stage)
 assert.equal(list.length,16)
 assert.deepEqual(list.filter(b=>b.kind!=='devil').map(b=>b.stageNumber??({squid:5,snake:10,final:15}[b.kind])),Array.from({length:15},(_,i)=>i+1))
 for(const a of CAMPAIGN_BOSS_ART) {
  const card=list.find(b=>b.stageNumber===a.stage)
  assert.equal(card.kind,a.kind);assert.equal(card.name,a.name);assert.equal(card.behavior.length,2)
 }
 for(const best of [0,4,9,15]) {
  const node=almanac.EnemyAlmanac({text,progress:{bestStageByMode:{gradius_solo:best,gradius_multiplayer:0},codex:{}},stageBossEntries:list})
  const cards=walk(node,n=>n.type==='article'&&n.props.className.startsWith('enemy-almanac__boss-card'))
  assert.equal(cards.length,16)
  assert.equal(new Set(cards.map(n=>n.props.key)).size,16,'repeated attack kinds share React keys')
  assert.equal(cards.filter(n=>!n.props.className.includes('--locked')).length,best)
  const previews=walk(node,n=>n.type?.name==='BossBriefingCanvas'&&n.props.stage!==undefined)
  assert.deepEqual(previews.map(n=>n.props.stage),stages.filter(s=>s<=best))
  const pool=walk(node,n=>n.props.className==='enemy-almanac__sprite-strip')[0]
  const imgs=walk(pool,n=>n.type==='img')
  assert.equal(imgs.length,7)
  assert.ok(imgs.every(n=>n.props.src.startsWith('assets/bosses/')&&n.props.loading==='lazy'),'old swarm sprites remain in boss pool')
 }
}
// New portraits must return the same art URL as battle and must allocate zero animation loops/prewarms.
const preview=await load(catalogSource+`
export let rafs=0,warms=0;
const React={createElement:(type,props)=>({type,props})};
const useRef=()=>({current:null}),useEffect=fn=>fn();
const getPublicAssetUrl=p=>p,preloadRaidCanvasAssets=()=>{warms++};
const requestAnimationFrame=()=>++rafs,cancelAnimationFrame=()=>{};
`+read('src/components/games/raid/briefing.tsx').replace(/^import .*\n/gm,''),true)
for(const a of CAMPAIGN_BOSS_ART) {
 const node=preview.BossBriefingCanvas({kind:a.kind,stage:a.stage})
 assert.equal(node.type,'img');assert.equal(node.props.src,a.assetPath);assert.equal(node.props.loading,'lazy')
}
assert.equal(preview.rafs,0);assert.equal(preview.warms,0)
assert.equal(preview.BossBriefingCanvas({kind:'squid'}).type,'canvas')
assert.equal(preview.rafs,1);assert.equal(preview.warms,1)
console.log('Boss integration/almanac: real enemy routing, 15 ordered campaign cards plus anomaly, stable keys, unlock gates, all 4 locales, matching static portraits and zero added portrait loops passed')
// Production asset integrity, genuine alpha WebP and bounded native dimensions.
const manifest=JSON.parse(read('docs/campaign-boss-art-manifest.json'))
assert.equal(manifest.assets.length,12)
for(const asset of manifest.assets) {
 const bytes=readFileSync(new URL('../'+asset.path,import.meta.url))
 assert.equal(bytes.length,asset.bytes)
 assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256)
 assert.equal(bytes.toString('ascii',12,16),'VP8X')
 assert.ok(bytes[20]&16,'boss file has no alpha channel')
 assert.equal(bytes.readUIntLE(24,3)+1,512);assert.equal(bytes.readUIntLE(27,3)+1,512)
 const art=CAMPAIGN_BOSS_ART.find(a=>a.stage===asset.stage)
 assert.equal(asset.path,'public/'+art.assetPath)
 const [x,y,w,h]=asset.content_rect
 assert.ok(x>=12&&y>=12&&x+w<=500&&y+h<=500,'boss silhouette has no safety gutter')
}
assert.equal(new Set(manifest.assets.map(a=>a.sha256)).size,12,'stages share an identical sprite file')
console.log('Boss assets: all 12 production files match catalog, hashes, alpha channel, 512px bounds and transparent safety gutters')
