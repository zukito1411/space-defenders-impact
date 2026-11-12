import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const raid = 'src/components/games/raid/'
const profileSource = read(raid + 'stageEncounters.ts').replace(/^import .*\n/gm, '')
const runtime = read(raid + 'GradiusRaidRuntime.tsx')
const section = (start, end) => {
  const first = runtime.indexOf(start)
  const last = runtime.indexOf(end, first)
  assert.ok(first >= 0 && last > first, start)
  return runtime.slice(first, last)
}
const spawnSource = section('  const spawnEnemyAt = useCallback', '  const spawnBoss = useCallback')
const fireSource = section('  const fireEnemy = useCallback', '  const updateGame = useCallback')
const harness = `
const useCallback = fn => fn
let enemyId = 0, shotId = 0
const stageRef = { current: 1 }, waveRef = { current: 1 }, wingSerialRef = { current: 0 }
const playerRef = { current: { x: 50, y: 83 } }, enemyHpMultRef = { current: 1 }
const enemiesRef = { current: [] }, enemyShotsRef = { current: [] }
const getPowerScore = () => 4, isCoOpActive = () => false
const getMaxActiveEliteEnemies = () => 2, getEliteEnemyChance = () => 1
const pickEliteEnemyKind = () => 'lancer', RAID_ELITE_SPRITE_COUNT = 5
const DARK_ENEMY_COLORS = ['#a05'], MINI_BOSS_COLORS = { lancer: '#f80' }
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const MULTIPLAYER_MAX_ENEMY_SHOTS = 140
const emitCommandBossShot = shot => enemyShotsRef.current.push({ ...shot, id: ++shotId })
`
const wrapper = `
export function formation(stage, serial, liveEnemies = 0) {
  stageRef.current = waveRef.current = stage
  wingSerialRef.current = serial
  enemiesRef.current = Array.from({ length: liveEnemies }, () => ({ hp: 1 }))
  spawnFormation()
  return { enemies: enemiesRef.current.slice(liveEnemies), next: wingSerialRef.current }
}
export function fire(enemy, target, queued = 0) {
  enemyShotsRef.current = Array.from({ length: queued }, () => ({}))
  fireEnemy(enemy, target, 0)
  return enemyShotsRef.current.slice(queued)
}
`
const code = ts.transpileModule(profileSource + harness + spawnSource + fireSource + wrapper, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const api = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const layouts = new Set()
const signatures = new Set()
const foundDebut = new Map()
for (let stage = 1; stage <= 15; stage++) {
  const profile = api.getRaidStageEncounter(stage)
  assert.deepEqual(api.getRaidStageEncounter(stage + 15), profile)
  assert.ok(profile.interval >= 4 && profile.interval <= 5.2)
  signatures.add(JSON.stringify(profile.wings))
  for (let serial = 0; serial < 3; serial++) {
    const { enemies, next } = api.formation(stage, serial)
    const wing = profile.wings[serial]
    layouts.add(wing[0])
    assert.equal(next, serial + 1)
    assert.equal(enemies.length, wing.length - 1)
    assert.equal(new Set(enemies.map(enemy => enemy.vy)).size, 1, 'ships lost vertical formation spacing')
    for (const [index, enemy] of enemies.entries()) {
      const role = wing[index + 1]
      if (!foundDebut.has(role)) foundDebut.set(role, stage)
      assert.equal(enemy.variant, api.LEGACY_FIGHTER_COUNT + role)
      assert.ok(!enemy.isMiniBoss && enemy.hp > 0)
      assert.ok(enemy.x >= 8 && enemy.x <= 92 && enemy.y > -40 && enemy.y < 0)
      assert.ok(index === 0 || enemy.fireCooldown > enemies[index - 1].fireCooldown)
      for (const formationAge of [.1, 1, 2.4, 6]) {
        const x = api.getRaidFighterPathX({ ...enemy, formationAge })
        assert.ok(x >= 4 && x <= 96, 'formation drifted outside the playfield')
      }
    }
    assert.equal(api.formation(stage, serial, 31).enemies.length, 1)
    assert.deepEqual(api.formation(stage, serial, 32), { enemies: [], next: serial })
  }
}
assert.equal(signatures.size, 15)
assert.equal(layouts.size, 6)
assert.deepEqual(api.RAID_FIGHTER_DEBUT_STAGES, api.RAID_FIGHTERS.map((_, role) => foundDebut.get(role)))
for (const [role, asset] of api.RAID_FIGHTER_ASSETS.entries()) {
  const image = readFileSync(new URL('../public/' + asset, import.meta.url))
  assert.equal(image.toString('ascii', 8, 12), 'WEBP')
  assert.ok(image.length < 16_000)
  const fighter = api.RAID_FIGHTERS[role]
  const enemy = { x: 50, y: 26, fireCooldown: .1, variant: api.LEGACY_FIGHTER_COUNT + role, isBoss: false, isMiniBoss: false }
  const pilot = { x: 68, y: 80 }
  const shots = api.fire(enemy, pilot)
  assert.equal(shots.length, fighter.shots)
  assert.ok(shots.every(shot => shot.kind === fighter.kind && shot.vy > 0 && shot.damage === 1))
  assert.equal(api.fire(enemy, pilot, 133 - fighter.shots).length, 0, 'partial volley escaped the shared budget')
  assert.equal(api.fire(enemy, { x: 50, y: 32 }).length, 0, 'ship fired at point-blank range')
  assert.equal(api.getRaidFighterCharge({ ...enemy, y: -1 }), 0)
  assert.equal(api.getRaidFighterCharge(enemy) > 0, fighter.shots > 0)
}
// Pursuit is role-specific, bounded, and never starts during formation entry.
const formationEnemy = { originX: 50, x: 50, y: 50, formationAge: 2, formationMotion: 0, phase: 0, trainSlot: 0 }
for (const role of [0,1,2,3,4,5]) {
  const ship = { ...formationEnemy, variant: api.LEGACY_FIGHTER_COUNT + role }
  const left = api.getRaidFighterPathX(ship, { x: 0, y: 80 })
  const right = api.getRaidFighterPathX(ship, { x: 100, y: 80 })
  assert.ok(left >= 4 && right <= 96)
  if (role === 1 || role === 3) assert.ok(right > left, 'pursuit should follow the pilot lane')
  else assert.equal(right, left, 'non-pursuit role should retain its own path')
  assert.equal(api.getRaidFighterPathX({ ...ship, y: 0 }, { x: 0, y: 80 }), api.getRaidFighterPathX({ ...ship, y: 0 }, { x: 100, y: 80 }))
}
console.log('Raid stages: 15 unique rotations, six layouts and aircraft, formation integrity, authored shots and live caps passed')


const ram = { ...formationEnemy, y: 24, variant: api.LEGACY_FIGHTER_COUNT+3 }
api.commitRaidFighterManeuver(ram,{x:70,y:80})
assert.equal(ram.fighterAimX,70)
api.commitRaidFighterManeuver(ram,{x:10,y:80})
assert.equal(ram.fighterAimX,70,'committed ram must not retarget after warning')
assert.ok(api.getRaidFighterSpeedScale(ram)<1)
assert.ok(api.getRaidFighterCharge({...ram,y:35})>0)
assert.ok(api.getRaidFighterSpeedScale({...ram,y:41})>1)
