import { getGenericBossArt } from './bossCatalog'
import { PLAYER_MAX_RANK } from './constants'
import type { Enemy, RaidDifficulty, Shot, Vec } from './types'

export type CommandPattern = 'fan' | 'snipe' | 'iris' | 'reverseIris' | 'pincer' | 'sweep' | 'curtain' | 'hydra' | 'beam' | 'twinBeam' | 'fork'
export type CommandBossProfile = {
  stage: number; sequence: readonly CommandPattern[]; warning: number; recovery: number
  speed: number; hp: number; movement: 'broadside' | 'orbit' | 'flank' | 'sweep' | 'fortress' | 'hunt'
  amplitude: number; bursts: number
}
/** Attack identities follow the art catalog; later hulls introduce combinations, not just faster copies. */
export const COMMAND_BOSS_PROFILES: readonly CommandBossProfile[] = [
  { stage: 1, sequence: ['fan','snipe'], warning: 1.02, recovery: 1.05, speed: 30, hp: 1.08, movement: 'broadside', amplitude: 22, bursts: 1 },
  { stage: 2, sequence: ['iris','snipe','iris'], warning: 1.04, recovery: 1.02, speed: 29, hp: 1.08, movement: 'orbit', amplitude: 22, bursts: 1 },
  { stage: 3, sequence: ['pincer','snipe','pincer'], warning: 1, recovery: 1.02, speed: 33, hp: 1.1, movement: 'flank', amplitude: 29, bursts: 1 },
  { stage: 4, sequence: ['sweep','snipe','fan'], warning: 1, recovery: 1.0, speed: 33, hp: 1.1, movement: 'sweep', amplitude: 29, bursts: 1 },
  { stage: 6, sequence: ['curtain','beam','curtain'], warning: 1.1, recovery: 1.08, speed: 32, hp: 1.12, movement: 'fortress', amplitude: 17, bursts: 1 },
  { stage: 7, sequence: ['fan','curtain','snipe','fan'], warning: .98, recovery: .94, speed: 34, hp: 1.12, movement: 'broadside', amplitude: 27, bursts: 1 },
  { stage: 8, sequence: ['reverseIris','curtain','iris'], warning: 1.02, recovery: .96, speed: 32, hp: 1.14, movement: 'orbit', amplitude: 24, bursts: 2 },
  { stage: 9, sequence: ['pincer','sweep','snipe','pincer'], warning: .98, recovery: .92, speed: 36, hp: 1.14, movement: 'flank', amplitude: 30, bursts: 2 },
  { stage: 11, sequence: ['hydra','pincer','hydra','snipe'], warning: 1.02, recovery: .94, speed: 35, hp: 1.16, movement: 'hunt', amplitude: 25, bursts: 2 },
  { stage: 12, sequence: ['twinBeam','curtain','beam','curtain'], warning: 1.12, recovery: 1.02, speed: 34, hp: 1.16, movement: 'fortress', amplitude: 20, bursts: 2 },
  { stage: 13, sequence: ['fork','curtain','fan','snipe'], warning: 1.02, recovery: .94, speed: 37, hp: 1.18, movement: 'broadside', amplitude: 27, bursts: 2 },
  { stage: 14, sequence: ['iris','reverseIris','curtain','fork'], warning: 1.04, recovery: .98, speed: 35, hp: 1.18, movement: 'orbit', amplitude: 26, bursts: 2 },
]
const PROFILES_BY_STAGE = new Map(COMMAND_BOSS_PROFILES.map(profile => [profile.stage, profile]))
const TACTICS: Record<RaidDifficulty, { warning: number; speed: number; recovery: number }> = {
  easy: { warning: 1.2, speed: .88, recovery: 1.14 },
  normal: { warning: 1, speed: 1, recovery: 1 },
  hard: { warning: .94, speed: 1.06, recovery: .93 },
  expert: { warning: .9, speed: 1.1, recovery: .88 },
}
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
export const COMMAND_SHOT_LIMIT = 120 // below the co-op packet's 140-shot limit; same on every graphics quality.
export const COMMAND_VOLLEY_LIMIT = 12
export const COMMAND_WARNING = 1, COMMAND_FIRED = 2, COMMAND_PHASE = 4
export const COMMAND_PHASE_HP = { pressure: .65, critical: .30 } as const
export const isCommandBeam = (pattern?: CommandPattern) => pattern === 'beam' || pattern === 'twinBeam'
export function getCommandBossProfile(enemy: Pick<Enemy, 'isBoss' | 'bossKind' | 'bossArtStage'>) {
  if (!enemy.isBoss) return undefined
  const art = getGenericBossArt(enemy.bossKind ?? 'carrier', enemy.bossArtStage)
  return art ? PROFILES_BY_STAGE.get(art.stage) : undefined
}
/** Freeze at spawn: account for rank without scaling HP with damage dealt mid-fight. Existing difficulty/co-op multipliers remain. */
export function getCommandBossHpScale(kind: Enemy['bossKind'], stage: number, rank = 1, partnerRank?: number, difficulty: RaidDifficulty = 'normal') {
  const art = getGenericBossArt(kind, stage)
  const profile = art && PROFILES_BY_STAGE.get(art.stage)
  if (!profile) return 1
  const pilotRank = clamp(Number.isFinite(rank) ? rank : 1, 1, PLAYER_MAX_RANK)
  const meanRank = partnerRank !== undefined && Number.isFinite(partnerRank)
    ? (pilotRank + clamp(partnerRank, 1, PLAYER_MAX_RANK)) / 2
    : pilotRank
  const levels = meanRank - 1
  const rankPressure = .06 * levels + .002 * levels * levels
  return profile.hp * (1 + rankPressure * (difficulty === 'easy' ? .5 : 1))
}

export type CommandShot = Omit<Shot, 'id'>
/** Fixed reusable recipe storage, shared by warning rendering and authoritative release. */
export function createCommandVolley(): CommandShot[] {
  return Array.from({ length: COMMAND_VOLLEY_LIMIT }, () => ({ x: 0, y: 0, vx: 0, vy: 0, radius: 1.5, damage: 1, kind: 'boss', life: 4.8, maxLife: 4.8 }))
}
export function writeCommandVolley(enemy: Enemy, out: CommandShot[], burstIndex = enemy.bossBurstIndex ?? 0) {
  const pattern = enemy.bossAttackPattern
  if (!pattern) return 0
  const x = enemy.bossAttackX ?? enemy.x, y = enemy.bossAttackY ?? enemy.y
  const aimX = enemy.bossAimX ?? 50, aimY = enemy.bossAimY ?? 80
  const speed = enemy.bossShotSpeed ?? 32, phase = enemy.bossCombatPhase ?? 0
  const serial = enemy.bossAttackSerial ?? 0, side = serial % 2 ? 1 : -1
  const heading = Math.atan2(Math.max(24, aimY - y), aimX - x)
  let count = 0
  const add = (sx: number, sy: number, vx: number, vy: number, kind: Shot['kind'], radius = 1.5, life = 4.8) => {
    if (count >= out.length) return
    const shot = out[count++]
    shot.x = clamp(sx, 5, 95); shot.y = sy; shot.vx = vx; shot.vy = vy
    shot.kind = kind; shot.radius = radius; shot.damage = 1; shot.life = shot.maxLife = life
    shot.angle = undefined; shot.spin = undefined
  }
  const aimed = (sx: number, sy: number, angle: number, kind: Shot['kind'], rate = speed, radius = 1.5) =>
    add(sx, sy, Math.cos(angle) * Math.min(48, rate), Math.sin(angle) * Math.min(48, rate), kind, radius)
  const fan = (kind: Shot['kind']) => {
    for (let i = -2; i <= 2; i++) aimed(x, y + 6, heading + i * .24 + side * burstIndex * .055, kind, speed, 1.65)
  }
  if (pattern === 'fan' || pattern === 'fork') {
    fan(pattern === 'fork' ? 'superShot' : 'boss')
    if (pattern === 'fork') for (const sign of [-1, 1]) for (let i = 0; i < 2; i++) {
      aimed(x + sign * 11, y + 4, Math.PI / 2 + sign * (.42 + i * .28), 'orbShot', speed * .85)
    }
  } else if (pattern === 'snipe') {
    for (let i = -1; i <= 1; i++) aimed(x, y + 6, heading + i * .12 + side * burstIndex * .06, 'needle', speed + 3, 1.35)
  } else if (pattern === 'iris' || pattern === 'reverseIris') {
    const total = phase >= 1 ? 12 : 10
    const direction = pattern === 'reverseIris' ? -1 : 1
    const rotation = serial * .37 + direction * burstIndex * .14
    // A missing sector preserves a broad dodge route; this is never a solid bullet wall.
    const gapHeading = heading + side * .22
    for (let i = 0; i < total; i++) {
      const angle = i / total * Math.PI * 2 + rotation
      const diff = Math.atan2(Math.sin(angle - gapHeading), Math.cos(angle - gapHeading))
      if (Math.abs(diff) < .43) continue
      aimed(x, y + 3, angle, 'orbShot', speed * .88, 1.4)
    }
  } else if (pattern === 'pincer') {
    for (const sign of [-1, 1]) {
      const sx = x + sign * 12
      const angle = Math.atan2(Math.max(24, aimY - y), aimX - sx)
      aimed(sx, y + 5, angle + sign * (.2 - burstIndex * .045), 'needle', speed + 1, 1.4)
      aimed(x + sign * 6, y + 7, heading - sign * .22, 'blade', speed * .94, 1.7)
    }
  } else if (pattern === 'sweep') {
    const sweep = side * (burstIndex - ((enemy.bossBurstCount ?? 1) - 1) / 2) * .22
    for (let i = -1; i <= 1; i++) aimed(x + i * 9, y + 6, heading + i * .2 + sweep, 'blade', speed, 1.65)
  } else if (pattern === 'curtain') {
    const gap = enemy.bossGapX ?? 50, gapRadius = 15 - phase
    for (let i = 0; i < 9; i++) {
      const lane = 8 + i * 10.5
      if (Math.abs(lane - gap) < gapRadius) continue
      add(lane, y + 7, 0, speed * .9, 'scatterBoss', 1.45)
    }
  } else if (pattern === 'hydra') {
    // Left, right, then the void head. A negative index previews all three committed lanes.
    const head = burstIndex % 3 === 0 ? -1 : burstIndex % 3 === 1 ? 1 : 0
    for (let i = -1; i <= 1; i++) {
      if (burstIndex >= 0 && i !== head) continue
      const headStep = i < 0 ? 0 : i > 0 ? 1 : 2
      const sx = x + i * 14, target = aimX + i * (6 + headStep * 2)
      aimed(sx, y + 7, Math.atan2(Math.max(24, aimY - y), target - sx), i === 0 ? 'voidShot' : 'orbShot', speed + (i === 0 ? 2 : -1), i === 0 ? 1.9 : 1.5)
    }
  } else if (isCommandBeam(pattern)) {
    const center = clamp(aimX, 26, 74)
    if (pattern === 'twinBeam') for (const sign of [-1, 1]) add(center + sign * 14, y + 6, 0, 0, 'beam', 2.05, .68)
    else add(clamp(aimX, 12, 88), y + 6, 0, 0, 'beam', 2.15, .68)
  }
  return count
}
const releaseScratch = createCommandVolley()
function beginAttack(enemy: Enemy, profile: CommandBossProfile, targets: readonly Vec[], difficulty: RaidDifficulty) {
  const serial = (enemy.bossAttackSerial ?? -1) + 1
  const target = targets[serial % targets.length]
  const hpRatio = enemy.hp / Math.max(1, enemy.maxHp)
  const phase = hpRatio <= COMMAND_PHASE_HP.critical ? 2 : hpRatio <= COMMAND_PHASE_HP.pressure ? 1 : 0
  const changed = phase > (enemy.bossCombatPhase ?? 0)
  const pattern = profile.sequence[serial % profile.sequence.length]
  const tune = TACTICS[difficulty]
  if (changed) enemy.bossPhaseStartedAge = enemy.bossEncounterAge
  enemy.bossLastVolleyAge = undefined
  enemy.bossCombatPhase = phase
  enemy.bossAttackSerial = serial
  enemy.bossAttackPattern = pattern
  enemy.bossAttackState = 'warning'
  enemy.bossAimX = clamp(target.x, 8, 92); enemy.bossAimY = clamp(target.y, 48, 94)
  enemy.bossAttackX = enemy.x; enemy.bossAttackY = enemy.y
  enemy.bossGapX = clamp(target.x + (serial % 2 ? 14 : -14), 22, 78)
  enemy.bossWarningSeconds = Math.max(isCommandBeam(pattern) ? 1.05 : .78, profile.warning * tune.warning * (1 - phase * .04))
  enemy.bossAttackTimer = enemy.bossWarningSeconds
  enemy.bossShotSpeed = Math.min(48, (profile.speed + phase * 2) * tune.speed)
  enemy.bossBurstIndex = 0
  enemy.bossBurstCount = isCommandBeam(pattern) ? 1 : pattern === 'hydra' ? 3 : Math.min(3, profile.bursts + (phase > 0 ? 1 : 0))
  enemy.bossRecoverySeconds = Math.max(.65, profile.recovery * tune.recovery * (1 - phase * .12))
  return COMMAND_WARNING | (changed ? COMMAND_PHASE : 0)
}
function moveDuringRecovery(enemy: Enemy, profile: CommandBossProfile, dt: number) {
  const age = enemy.bossEncounterAge ?? 0, serial = enemy.bossAttackSerial ?? 0
  const side = serial % 2 ? 1 : -1
  let targetX = 50 + Math.sin(age * .65) * profile.amplitude
  let targetY = 20 + Math.sin(age * .8) * 2
  if (profile.movement === 'flank') { targetX = 50 + side * profile.amplitude; targetY = 26 }
  else if (profile.movement === 'sweep') { targetX = 50 - side * profile.amplitude; targetY = 23 }
  else if (profile.movement === 'orbit') { targetX = 50 + Math.sin(age * 1.15) * profile.amplitude; targetY = 20 + Math.cos(age * 1.15) * 4 }
  else if (profile.movement === 'fortress') { targetX = 50 + side * profile.amplitude; targetY = 19 }
  else if (profile.movement === 'hunt') { targetX = clamp((enemy.bossAimX ?? 50) + side * 12, 22, 78); targetY = 24 }
  const speed = profile.movement === 'flank' || profile.movement === 'sweep' ? 31 : 23
  enemy.x = clamp(enemy.x + clamp(targetX - enemy.x, -speed * dt, speed * dt), 18, 82)
  enemy.y = clamp(enemy.y + clamp(targetY - enemy.y, -8 * dt, 8 * dt), 16, 28)
}
/** Host-only, simulation-dt clock. Attack parameters and aims latch before the warning, including phase changes. */
export function advanceCommandBoss(enemy: Enemy, dt: number, targets: readonly Vec[], difficulty: RaidDifficulty,
  availableShots: number, emit: (shot: CommandShot) => void) {
  const profile = getCommandBossProfile(enemy)
  if (!profile || enemy.hp <= 0 || targets.length === 0 || !Number.isFinite(dt) || dt <= 0) return 0
  // Entry protection is not a free opening shot. Pauses never advance this clock.
  if (enemy.y < 16 || enemy.shieldTime > 0) return 0
  const delta = Math.min(dt, .1)
  enemy.bossEncounterAge = (enemy.bossEncounterAge ?? 0) + delta
  if (!enemy.bossAttackState) return beginAttack(enemy, profile, targets, difficulty)
  const state = enemy.bossAttackState
  if (state === 'recovery') moveDuringRecovery(enemy, profile, delta)
  enemy.bossAttackTimer = (enemy.bossAttackTimer ?? 0) - delta
  if (enemy.bossAttackTimer > 1e-8) return 0
  const overshoot = Math.min(delta, Math.max(0, -enemy.bossAttackTimer))
  if (state === 'recovery') return beginAttack(enemy, profile, targets, difficulty)
  const count = writeCommandVolley(enemy, releaseScratch)
  if (count > availableShots) {
    // Skip the entire volley instead of dropping an arbitrary safe gap or retrying without warning.
    enemy.bossAttackState = 'recovery'; enemy.bossAttackTimer = .8
    return 0
  }
  for (let i = 0; i < count; i++) emit(releaseScratch[i])
  if (count > 0) enemy.bossLastVolleyAge = enemy.bossEncounterAge
  enemy.bossBurstIndex = (enemy.bossBurstIndex ?? 0) + 1
  if (enemy.bossBurstIndex < (enemy.bossBurstCount ?? 1)) {
    enemy.bossAttackState = 'burst'; enemy.bossAttackTimer = .32 - overshoot
  } else {
    enemy.bossAttackState = 'recovery'; enemy.bossAttackTimer = (enemy.bossRecoverySeconds ?? 1) - overshoot
  }
  return count ? COMMAND_FIRED : 0
}
export function interruptCommandBoss(enemy: Enemy) {
  if (!getCommandBossProfile(enemy) || enemy.bossEncounterAge === undefined) return
  enemy.bossLastVolleyAge = undefined
  enemy.bossAttackState = 'recovery'; enemy.bossAttackTimer = .9; enemy.bossBurstIndex = 0
}
