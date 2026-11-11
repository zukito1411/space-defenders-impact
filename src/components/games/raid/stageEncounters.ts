import type { Enemy, Shot, Vec } from './types'

export const LEGACY_FIGHTER_COUNT = 8
export const RAID_STAGE_ENEMY_LIMIT = 32
export const RAID_FIGHTER_ASSETS = [
  'assets/aliens/fighter-needle-scout-v1.webp',
  'assets/aliens/fighter-cinder-interceptor-v1.webp',
  'assets/aliens/fighter-violet-gunship-v1.webp',
  'assets/aliens/fighter-crimson-ram-v1.webp',
  'assets/aliens/fighter-jade-sensor-v1.webp',
  'assets/aliens/fighter-auric-artillery-v1.webp',
] as const

export const RAID_FIGHTERS = [
  { color: '#7ce4eb', hull: .77, radius: 2.65, speed: 25, cooldown: 2.25, shots: 1, boltSpeed: 38, spread: 0, aim: .82, kind: 'needle' },
  { color: '#f9a15d', hull: .94, radius: 3.4, speed: 23, cooldown: 2.65, shots: 2, boltSpeed: 34, spread: .20, aim: .73, kind: 'blade' },
  { color: '#c4a4fe', hull: 1.40, radius: 3.9, speed: 15, cooldown: 2.9, shots: 2, boltSpeed: 30, spread: .08, aim: .24, kind: 'plasma' },
  { color: '#f8777f', hull: 1.65, radius: 4.15, speed: 24, cooldown: 4.0, shots: 0, boltSpeed: 0, spread: 0, aim: 0, kind: 'enemy' },
  { color: '#85eac5', hull: .91, radius: 3.45, speed: 19, cooldown: 3.2, shots: 2, boltSpeed: 29, spread: .29, aim: .68, kind: 'orbShot' },
  { color: '#f9d486', hull: 1.23, radius: 3.8, speed: 16, cooldown: 3.5, shots: 3, boltSpeed: 27, spread: .27, aim: .58, kind: 'scatterBoss' },
] as const

type Layout = 'chevron' | 'line' | 'echelon' | 'split' | 'escort' | 'weave'
const SCOUT = 0, INTERCEPTOR = 1, GUNSHIP = 2, RAM = 3, SENSOR = 4, ARTILLERY = 5
type FighterId = typeof SCOUT | typeof INTERCEPTOR | typeof GUNSHIP | typeof RAM | typeof SENSOR | typeof ARTILLERY
type Formation = readonly [Layout, FighterId, FighterId, ...FighterId[]]
type StageEncounter = {
  wings: readonly [Formation, Formation, Formation]
  interval: number
  legacy: number
}

/** Ship IDs index RAID_FIGHTERS. Each stage has its own three-wave rotation and reserve. */
const STAGE_ENCOUNTERS: readonly StageEncounter[] = [
  { wings: [['chevron', SCOUT, SCOUT, SCOUT, SCOUT, SCOUT], ['echelon', SCOUT, SCOUT, SCOUT, SCOUT], ['line', SCOUT, SCOUT, SCOUT, SCOUT, SCOUT]], interval: 5.1, legacy: 0 },
  { wings: [['split', SCOUT, INTERCEPTOR, INTERCEPTOR, SCOUT], ['chevron', SCOUT, INTERCEPTOR, INTERCEPTOR, INTERCEPTOR, SCOUT], ['echelon', INTERCEPTOR, SCOUT, INTERCEPTOR, SCOUT, INTERCEPTOR]], interval: 4.7, legacy: 2 },
  { wings: [['echelon', INTERCEPTOR, GUNSHIP, SCOUT, GUNSHIP, INTERCEPTOR], ['escort', SCOUT, GUNSHIP, SCOUT, SCOUT, GUNSHIP, SCOUT], ['line', GUNSHIP, SCOUT, INTERCEPTOR, SCOUT, GUNSHIP]], interval: 4.8, legacy: 3 },
  { wings: [['line', SCOUT, RAM, INTERCEPTOR, RAM, SCOUT], ['chevron', INTERCEPTOR, INTERCEPTOR, RAM, INTERCEPTOR, INTERCEPTOR], ['weave', RAM, SCOUT, INTERCEPTOR, INTERCEPTOR, SCOUT, RAM]], interval: 4.6, legacy: 4 },
  { wings: [['escort', SCOUT, SENSOR, SCOUT, INTERCEPTOR, SENSOR, INTERCEPTOR], ['split', SENSOR, GUNSHIP, GUNSHIP, SENSOR], ['weave', SENSOR, SCOUT, GUNSHIP, GUNSHIP, SCOUT, SENSOR]], interval: 4.8, legacy: 2 },
  { wings: [['line', INTERCEPTOR, ARTILLERY, GUNSHIP, ARTILLERY, INTERCEPTOR], ['echelon', GUNSHIP, ARTILLERY, SCOUT, GUNSHIP, ARTILLERY], ['split', INTERCEPTOR, ARTILLERY, RAM, RAM, ARTILLERY, INTERCEPTOR]], interval: 4.7, legacy: 5 },
  { wings: [['chevron', GUNSHIP, INTERCEPTOR, RAM, INTERCEPTOR, GUNSHIP], ['weave', SCOUT, INTERCEPTOR, SENSOR, SENSOR, INTERCEPTOR, SCOUT], ['escort', RAM, ARTILLERY, RAM, SCOUT, GUNSHIP, SCOUT]], interval: 4.4, legacy: 1 },
  { wings: [['weave', SENSOR, SENSOR, SCOUT, SCOUT, SENSOR, SENSOR], ['split', INTERCEPTOR, SENSOR, ARTILLERY, ARTILLERY, SENSOR, INTERCEPTOR], ['line', SENSOR, SCOUT, GUNSHIP, SCOUT, SENSOR]], interval: 4.2, legacy: 6 },
  { wings: [['echelon', INTERCEPTOR, RAM, GUNSHIP, RAM, INTERCEPTOR, SCOUT], ['line', RAM, RAM, INTERCEPTOR, INTERCEPTOR, RAM, RAM], ['chevron', SENSOR, RAM, ARTILLERY, RAM, SENSOR]], interval: 4.5, legacy: 5 },
  { wings: [['split', RAM, ARTILLERY, GUNSHIP, GUNSHIP, ARTILLERY, RAM], ['escort', INTERCEPTOR, ARTILLERY, INTERCEPTOR, RAM, GUNSHIP, RAM], ['echelon', ARTILLERY, GUNSHIP, INTERCEPTOR, SENSOR, RAM, ARTILLERY]], interval: 4.8, legacy: 3 },
  { wings: [['escort', INTERCEPTOR, GUNSHIP, INTERCEPTOR, SENSOR, ARTILLERY, SENSOR], ['weave', GUNSHIP, SCOUT, RAM, RAM, SCOUT, GUNSHIP], ['chevron', ARTILLERY, GUNSHIP, SENSOR, GUNSHIP, ARTILLERY]], interval: 4.5, legacy: 7 },
  { wings: [['line', GUNSHIP, ARTILLERY, ARTILLERY, GUNSHIP, ARTILLERY, ARTILLERY, GUNSHIP], ['split', GUNSHIP, ARTILLERY, SENSOR, SENSOR, ARTILLERY, GUNSHIP], ['echelon', SENSOR, GUNSHIP, SCOUT, ARTILLERY, GUNSHIP, SENSOR]], interval: 4.6, legacy: 7 },
  { wings: [['chevron', INTERCEPTOR, GUNSHIP, ARTILLERY, RAM, ARTILLERY, GUNSHIP, INTERCEPTOR], ['escort', RAM, GUNSHIP, RAM, INTERCEPTOR, ARTILLERY, INTERCEPTOR], ['split', SENSOR, RAM, INTERCEPTOR, INTERCEPTOR, RAM, SENSOR]], interval: 4.3, legacy: 6 },
  { wings: [['weave', SENSOR, ARTILLERY, INTERCEPTOR, RAM, RAM, INTERCEPTOR, ARTILLERY, SENSOR], ['echelon', ARTILLERY, SENSOR, RAM, GUNSHIP, INTERCEPTOR, SCOUT], ['line', INTERCEPTOR, SENSOR, ARTILLERY, GUNSHIP, ARTILLERY, SENSOR, INTERCEPTOR]], interval: 4.25, legacy: 7 },
  { wings: [['chevron', GUNSHIP, SENSOR, ARTILLERY, RAM, ARTILLERY, SENSOR, GUNSHIP], ['split', RAM, GUNSHIP, ARTILLERY, INTERCEPTOR, INTERCEPTOR, ARTILLERY, GUNSHIP, RAM], ['escort', SENSOR, ARTILLERY, SENSOR, RAM, GUNSHIP, RAM, INTERCEPTOR, INTERCEPTOR]], interval: 4.1, legacy: 7 },
]

export function getRaidStageEncounter(stage: number) {
  return STAGE_ENCOUNTERS[Math.max(0, Math.floor(stage) - 1) % STAGE_ENCOUNTERS.length] ?? STAGE_ENCOUNTERS[0]
}

export function getRaidFighter(variant: number): (typeof RAID_FIGHTERS)[number] | undefined {
  return RAID_FIGHTERS[variant - LEGACY_FIGHTER_COUNT]
}

export const RAID_FIGHTER_DEBUT_STAGES = RAID_FIGHTERS.map((_, id) =>
  STAGE_ENCOUNTERS.findIndex(stage => stage.wings.some(wing => wing.includes(id as FighterId))) + 1)

export function getRaidWingSlot(stage: number, serial: number, slot: number) {
  const wing = getRaidStageEncounter(stage).wings[serial % 3]
  const layout = wing[0]
  const count = wing.length - 1
  const mirror = (serial + stage) % 2 === 0 ? 1 : -1
  const rank = slot - (count - 1) / 2
  const half = Math.ceil(count / 2)
  const flank = slot < half ? -1 : 1
  const flankRank = slot % half
  let x = 50 + rank * (layout === 'line' ? 13 : 11.4)
  let y = -6
  if (layout === 'chevron') y -= Math.abs(rank) * 4.2
  else if (layout === 'echelon') y -= slot * 3.8
  else if (layout === 'split') { x = 50 + flank * (19 + flankRank * 7); y -= flankRank * 3.4 }
  else if (layout === 'escort') { x = 50 + (slot % 3 - 1) * 14; y -= Math.floor(slot / 3) * 12 + (slot % 3 === 1 ? 3 : 0) }
  else if (layout === 'weave') { x = 50 + flank * (17 + flankRank * 7.5); y -= (flankRank + (flank === 1 ? .5 : 0)) * 4.5 }
  return {
    variant: LEGACY_FIGHTER_COUNT + (wing[slot + 1] as number),
    x: 50 + (x - 50) * mirror,
    y,
    motion: layout === 'weave' ? 2 : layout === 'split' ? 1 : 0,
    speed: 16 + Math.min(stage, 15) * .27,
    phase: serial * .88 + stage * .42,
  }
}

export function getRaidWingSize(stage: number, serial: number, liveEnemies: number) {
  return Math.min(getRaidStageEncounter(stage).wings[serial % 3].length - 1, Math.max(0, RAID_STAGE_ENEMY_LIMIT - liveEnemies))
}

export function getRaidReserveVariant(stage: number, serial: number) {
  const profile = getRaidStageEncounter(stage)
  const wing = profile.wings[serial % 3]
  return serial % 4 === 3 ? profile.legacy : LEGACY_FIGHTER_COUNT + (wing[1 + serial % (wing.length - 1)] as number)
}

export function getRaidFighterPathX(enemy: Enemy) {
  const motion = enemy.formationMotion
  const age = enemy.formationAge ?? 0
  const role = enemy.variant - LEGACY_FIGHTER_COUNT
  const side = enemy.originX < 50 ? -1 : 1
  const isAgile = role === INTERCEPTOR || role === SENSOR
  const roleWeave = isAgile ? Math.sin(age * 2.1 + enemy.phase + enemy.trainSlot * .55) : 0
  // Hold the silhouette during approach, then let the agile ships break formation.
  const release = Math.min(1, Math.max(0, (enemy.y - 16) / 22))
  const offset = roleWeave * release * 6
  if (motion === 0) return enemy.originX + Math.sin(age * 1.25 + enemy.phase) * 5 + offset
  if (motion === 1) return enemy.originX - side * (1 - Math.cos(age * .92)) * 4 + offset
  if (motion === 2) return enemy.originX - side * Math.sin(age * 1.18) * 9 + offset
  if (isAgile) return enemy.originX + roleWeave * 13
  const amplitude = role === RAM ? 3 : 6
  return enemy.originX + Math.sin(age * 1.1 + enemy.phase) * amplitude
}

export function fireRaidFighter(enemy: Enemy, target: Vec, available: number, emit: (shot: Omit<Shot, 'id'>) => void) {
  const fighter = getRaidFighter(enemy.variant)
  if (!fighter || !fighter.shots || available < fighter.shots || target.y < enemy.y + 13) return false
  const aim = Math.atan2((target.x - enemy.x) * fighter.aim, Math.max(19, target.y - enemy.y))
  for (let i = 0; i < fighter.shots; i++) {
    const side = i - (fighter.shots - 1) / 2
    const angle = aim + side * fighter.spread
    emit({ x: enemy.x + side * 5, y: enemy.y + 2.5, vx: Math.sin(angle) * fighter.boltSpeed,
      vy: Math.cos(angle) * fighter.boltSpeed, radius: 1.22, damage: 1, kind: fighter.kind })
  }
  return true
}

/** These frames are shared by the Pixi foreground and Canvas fallback. */
export function getRaidFighterCharge(enemy: Enemy) {
  if (enemy.y < 0 || enemy.fireCooldown <= 0 || enemy.fireCooldown >= .34 || !getRaidFighter(enemy.variant)?.shots) return 0
  return 1 - enemy.fireCooldown / .34
}
