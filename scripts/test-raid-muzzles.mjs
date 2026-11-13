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
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value))
  const activeShotOwnerRef={current:null};
  const playerRef = {}, remotePlayerRef = {}, devilAssistPlayerRef = {}, fireCaptureRef = {}, viewportMetricsRef = {}, landscapeRef = { current: false }
  const shots = [], colors = [], stageRef = { current: 1 }, progressRef = {}, enemiesRef = { current: [] }
  const PLAYER_COLOR = 'red', ALLY_PLAYER_COLOR = 'cyan'
  const WEAPON_KEYS = ['spread', 'laser', 'scatter', 'rocket', 'homing']
  const EMPTY_WEAPON_FLAGS = Object.fromEntries(WEAPON_KEYS.map(key => [key, false]))
  const WEAPON_FIRE_INTERVALS = Object.fromEntries(WEAPON_KEYS.map(key => [key, .1]))
  const MESIAH_DRONE_FIRE_INTERVAL_SECONDS = .3, MESIAH_ROCKET_FIRE_INTERVAL_SECONDS = .8, SPIEGEL_KUNAI_DAMAGE_MULTIPLIER = 2
  const getRaidShipBaseVisualKey = key => key, getRaidPlayerVisualShipKey = player => player.ship.key
  const isCoreLanderBurning = () => false, getPlayerCoreLanderCombatModel = player => player.combatModel
  const isGodGundamBarragePilot = () => false, getCoreLanderFireInterval = () => .2
  const getPlayerBaseAttack = () => 8, getOptionSupportStacks = () => 0, normalizeMesiahDrones = () => []
  const raidStereoPan=()=>0,playRaidCue=()=>{}, playGameSound = () => {}, getRaidFighter = variant => variant >= 8
  const getRaidPlayerFlightBank = color => { colors.push(color); return bank }
  let shotId = 3, bank = 0
  const pushShot = shot => shots.push(shot)
  `,
  read('mechFlight.ts').replace(/^import .*\n/gm, ''),
  read('playerMuzzle.ts').replace(/^import .*\n/gm, ''),
  section(read('assets.ts'), 'export function getEnemyCanvasSize'),
  section(runtime, '  const firePlayer = useCallback', '  // Keep the stable ref'),
  `
  export function fire(key, viewport, tilt, { guest, ally, combatModel, armed, landscape } = {}) {
    bank = tilt
    landscapeRef.current = Boolean(landscape)
    viewportMetricsRef.current = viewport
    shots.length = 0
    colors.length = 0
    const player = {
      ship: { key, fireRate: 1 }, x: 50, y: 80, hp: 5, fireCooldown: 0,
      mesiahDroneFireCooldown: 1, mesiahRocketCooldown: armed ? 0 : 1, combatModel,
      weapons: Object.fromEntries(WEAPON_KEYS.map(weapon => [weapon, armed ? 2 : 0])),
      weaponCooldowns: Object.fromEntries(WEAPON_KEYS.map(weapon => [weapon, 0])),
    }
    playerRef.current = guest || ally ? undefined : player
    remotePlayerRef.current = guest || ally ? player : undefined
    fireCaptureRef.current = guest ? [] : null
    firePlayer(player)
    return { shots: [...shots], colors: [...colors] }
  }
  `,
].join('\n'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText

const { fire, getRaidPlayerHullSize, getEnemyCanvasSize } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)
for (const [cssWidth, cssHeight] of [[360, 800], [720, 390], [1440, 900]]) {
  const viewport = { cssWidth, cssHeight }
  for (const key of ['rocket', 'spaceEt', 'fast', 'gatling', 'laser', 'dreadnought', 'xwing', 'mesiah', 'coreLander']) {
    const { shots } = fire(key, viewport, 0)
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
