import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = file => readFileSync(new URL('../src/components/games/raid/' + file, import.meta.url), 'utf8')
const section = (source, start, end) => source.slice(source.indexOf(start), end ? source.indexOf(end) : undefined)
const runtime = read('GradiusRaidRuntime.tsx')
const code = ts.transpileModule([
  `
  const WIDTH = 100, HEIGHT = 100
  const useCallback = callback => callback
  const window = { matchMedia: () => ({ matches: false }) };
  const getRaidBankingFrame = () => null;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value))
  const activeShotOwnerRef={current:null};
  const playerRef = {}, remotePlayerRef = {}, devilAssistPlayerRef = {}, fireCaptureRef = {}, viewportMetricsRef = {}, landscapeRef = { current: false }
  const shots = [], colors = [], sounds = [], stageRef = { current: 1 }, progressRef = {}, enemiesRef = { current: [] }
  const PLAYER_COLOR = 'red', ALLY_PLAYER_COLOR = 'cyan'
  const WEAPON_KEYS = ['spread', 'laser', 'scatter', 'rocket', 'homing']
  const EMPTY_WEAPON_FLAGS = Object.fromEntries(WEAPON_KEYS.map(key => [key, false]))
  const WEAPON_FIRE_INTERVALS = Object.fromEntries(WEAPON_KEYS.map(key => [key, .1]))
  const MESIAH_DRONE_FIRE_INTERVAL_SECONDS = .3, MESIAH_ROCKET_FIRE_INTERVAL_SECONDS = .8, SPIEGEL_KUNAI_DAMAGE_MULTIPLIER = 2
  const getRaidShipBaseVisualKey = key => key, getRaidPlayerVisualShipKey = player => player.ship.key
  const getPlayerCoreLanderCombatModel = player => player.combatModel
  const isGodGundamBarragePilot = () => false, getCoreLanderFireInterval = () => .2
  const getPlayerBaseAttack = () => 8, normalizeMesiahDrones = () => []
  const normalizeMesiahScoutDrones = player => player.mesiahScoutDrones ?? []
  const updateMesiahDrones = () => {}, updateMesiahScoutDrones = () => {}
  const isCoreLanderBurning = () => false, FORCE_FIELD_ARMOR = 6, SPACE_ET_PASSIVE_FORCE_FIELD_CHARGES = 1
  const WEAPON_STACK_CAPS = Object.fromEntries(WEAPON_KEYS.map(key => [key, 1]))
  const raidStereoPan=()=>0,playRaidCue=()=>{}, playGameSound = kind => sounds.push(kind), getRaidFighter = variant => variant >= 8
  const getRaidPlayerFlightBank = color => { colors.push(color); return bank }
  let shotId = 3, bank = 0
  const pushShot = shot => shots.push(shot)
  `,
  section(read('constants.ts'), 'export const SCOUT_SUPPORT_PICKUP_SECONDS', 'export const HOMING_RETARGET_SECONDS'),
  section(read('state.ts'), 'export function getOptionSupportStacks', 'export function getRaidPlayerVisualShipKey'),
  section(read('mechanics.ts'), 'export function fullyBuffRaidPlayer', 'export function isCoreLanderBurning'),
  section(read('mechanics.ts'), 'export function updatePlayerTimers', 'export function restorePassiveForceField'),
  read('mechFlight.ts').replace(/^import .*\n/gm, ''),
  read('playerMuzzle.ts').replace(/^import .*\n/gm, ''),
  section(read('assets.ts'), 'export function getEnemyCanvasSize'),
  section(runtime, '  const firePlayer = useCallback', '  // Keep the stable ref'),
  `
  export function fire(key, viewport, tilt, { guest, ally, combatModel, armed, landscape, support = 0 } = {}) {
    bank = tilt
    landscapeRef.current = Boolean(landscape)
    viewportMetricsRef.current = viewport
    shots.length = 0
    colors.length = 0
    sounds.length = 0
    const player = {
      ship: { key, fireRate: 1 }, x: 50, y: 80, hp: 5, fireCooldown: 0,
      mesiahDroneFireCooldown: 1, mesiahRocketCooldown: armed ? 0 : 1, combatModel, optionStacks: support,
      mesiahScoutDrones: Array.from({ length: support * 2 }, (_, index) => ({
        stack: Math.floor(index / 2), x: 40 + index * 5, y: 85, active: true, canFire: true, targetId: null,
      })),
      weapons: Object.fromEntries(WEAPON_KEYS.map(weapon => [weapon, armed ? 2 : 0])),
      weaponCooldowns: Object.fromEntries(WEAPON_KEYS.map(weapon => [weapon, 0])),
    }
    playerRef.current = guest || ally ? undefined : player
    remotePlayerRef.current = guest || ally ? player : undefined
    fireCaptureRef.current = guest ? [] : null
    firePlayer(player)
    return { shots: [...shots], colors: [...colors], sounds: [...sounds] }
  }
  `,
].join('\n'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText

const { fire, getRaidPlayerHullSize, getEnemyCanvasSize, activateScoutSupportPickup, fullyBuffRaidPlayer, getOptionSupportStacks, updatePlayerTimers } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)
for (const [cssWidth, cssHeight] of [[360, 800], [720, 390], [1440, 900]]) {
  const viewport = { cssWidth, cssHeight }
  for (const key of ['rocket', 'spaceEt', 'fast', 'gatling', 'laser', 'dreadnought', 'xwing', 'mesiah', 'coreLander']) {
    const { shots, sounds } = fire(key, viewport, 0)
    assert.ok(sounds.includes('laser'), 'basic beams must use the existing laser sound')
    assert.ok(!sounds.includes('shoot'), 'basic beams replayed the old chirp')
    const { shots: baseline } = fire(key, null, 0)
    assert.ok(shots.length)
    assert.deepEqual(shots.map(({ x, y, ...shot }) => shot), baseline.map(({ x, y, ...shot }) => shot))
    if (key === 'dreadnought') {
      const supportOffset = cssWidth < 640 ? 14 : 7.4
      assert.deepEqual(shots.slice(1).map(shot => shot.x), [50 - supportOffset, 50 + supportOffset])
    }
    const primary = key === 'dreadnought' ? shots.slice(0, 1) : shots.filter(shot => shot.kind !== 'homing')
    const size = getRaidPlayerHullSize(key, cssWidth)
    close(primary.reduce((sum, shot) => sum + shot.x, 0) / primary.length, 50)
    for (const shot of primary) {
      if (key === 'xwing' && shot.kind === 'laser') {
        close(Math.abs(shot.x - 50) * cssWidth / 100, size * .28)
        close((80 - shot.y) * cssHeight / 100, size * .335)
      } else {
        assert.ok(Math.abs(shot.x - 50) * cssWidth / 100 <= size * .056)
        close((80 - shot.y) * cssHeight / 100, size * (key === 'coreLander' ? .40 : .448))
      }
    }
  }
  for (const bank of [-.14, .14]) {
    const { shots, colors } = fire('rocket', viewport, bank, { guest: true })
    assert.deepEqual(colors, ['red'])
    const size = getRaidPlayerHullSize('rocket', cssWidth)
    close((shots[0].x - 50) * cssWidth / 100, Math.sin(bank) * size * .448)
    close((80 - shots[0].y) * cssHeight / 100, Math.cos(bank) * size * .448)
  }
  assert.deepEqual(fire('rocket', viewport, .1, { ally: true }).colors, ['cyan'])
  const { shots: armed } = fire('rocket', viewport, 0, { armed: true })
  const missiles = armed.filter(shot => shot.kind === 'rocket' || shot.kind === 'homing')
  assert.ok(missiles.length > 2)
  for (const shot of missiles) assert.ok(Math.abs(shot.x - 50) * cssWidth / 100 <= getRaidPlayerHullSize('rocket', cssWidth) * .181)
}

for (const key of ['rocket', 'spaceEt', 'fast', 'gatling', 'laser', 'dreadnought', 'xwing', 'mesiah', 'coreLander']) {
  const support = key === 'mesiah' ? 2 : 1
  const { shots } = fire(key, null, 0, { armed: true, support })
  const { shots: noPickup } = fire(key, null, 0, { support })
  assert.equal(shots.filter(shot => shot.kind === 'homing').length, 2, `${key} must fire exactly two homing missiles with Scouts active`)
  assert.equal(noPickup.filter(shot => shot.kind === 'homing').length, key === 'laser' ? 2 : 0)
  assert.ok(shots.length > fire(key, null, 0, { armed: true }).shots.length, `${key}'s Scouts must still fire`)
}

for (const key of ['rocket', 'mesiah']) {
  const player = {
    ship: { key }, hp: 5, maxHp: 5, optionTimer: 0, optionStacks: 0,
    fireCooldown: 0, mesiahDroneTimer: 0, mesiahDroneFireCooldown: 0, mesiahRocketCooldown: 0,
    invuln: 0, shield: 0, weapons: {}, weaponCooldowns: {},
  }
  const advance = dt => updatePlayerTimers(player, dt, [], false)
  const maxStacks = key === 'mesiah' ? 2 : 1

  activateScoutSupportPickup(player)
  assert.equal(getOptionSupportStacks(player), 1)
  advance(19.5)
  assert.equal(player.optionTimer, 0.5)
  assert.equal(getOptionSupportStacks(player), 1)
  activateScoutSupportPickup(player)
  assert.equal(getOptionSupportStacks(player), maxStacks)
  assert.equal(player.optionTimer, 20)
  advance(0)
  assert.equal(player.optionTimer, 20, 'pause must preserve the countdown')
  for (let frame = 0; frame < 1199; frame++) advance(1 / 60)
  assert.equal(getOptionSupportStacks(player), maxStacks)
  advance(1 / 60)
  assert.equal(getOptionSupportStacks(player), 0, 'the Scout wing must expire after 20 gameplay seconds')
  assert.equal(player.optionStacks, 0, 'expired Scout stacks must free the pickup slot')

  fullyBuffRaidPlayer(player)
  activateScoutSupportPickup(player)
  advance(25)
  assert.equal(getOptionSupportStacks(player), maxStacks, 'preset full loadouts must retain their Scouts')
}

// Landscape enlarges visual hull and muzzle anchors without affecting combat values.
const landscapeViewport = { cssWidth: 390, cssHeight: 844 }
const portraitFire = fire('rocket', landscapeViewport, 0)
const landscapeFire = fire('rocket', landscapeViewport, 0, { landscape: true })
assert.deepEqual(landscapeFire.shots.map(({ x, y, ...shot }) => shot), portraitFire.shots.map(({ x, y, ...shot }) => shot))
close((80 - landscapeFire.shots[0].y) / (80 - portraitFire.shots[0].y), 1.15)
for (const [isBoss, isMiniBoss, bossKind] of [[false, false, null], [false, true, null], [true, false, 'squid'], [true, false, 'snake'], [true, false, 'devil']]) {
  const enemy = { isBoss, isMiniBoss, variant: 0, bossKind }
  close(getEnemyCanvasSize(enemy, 390, true), getEnemyCanvasSize(enemy, 390, false) * 1.15)
}

const sizes = (isBoss, isMiniBoss, variant, width, bossKind) => getEnemyCanvasSize({ isBoss, isMiniBoss, variant, bossKind }, width)
for (const width of [320, 360, 640, 641, 860, 1024, 1440, 2560]) {
  const mobile = width <= 640
  const oldNormal = mobile ? Math.min(width * .125, 92) : Math.min(width * .105, 82)
  const oldMini = mobile ? Math.min(width * .18, 150) : Math.min(width * .15, 132)
  close(sizes(false, false, 0, width), oldNormal * 1.15)
  close(sizes(false, false, 8, width), oldNormal * 1.18 * 1.10)
  close(sizes(false, true, 0, width), oldMini * 1.12)
  const smallest = Math.min(width * (mobile ? .34 : .3), 260)
  close(sizes(true, false, 0, width, 'carrier'), smallest)
  close(sizes(true, false, 0, width, 'final'), Math.min(width * .64, 620))
  assert.ok(sizes(false, false, 8, width) < sizes(false, true, 0, width))
  assert.ok(sizes(false, true, 0, width) < smallest)
}
console.log('Air Raid muzzle anchors, wing and missile launch patterns, co-op pilot selection, and enemy render tiers passed')
