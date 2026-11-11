import { drawRaidContactArt, drawRaidVfx, RAID_CONTACT_TILE, RAID_VFX_TILE } from './combatArt'
import { COMMAND_PHASE_HP } from './commandBoss'
import type { BossImpactKind, Enemy, Shot } from './types'

type HullPoint = readonly [x: number, y: number]
type HullDamage = readonly [HullPoint, HullPoint, HullPoint]

// Coordinates are normalized against the full square hull sprite.
const HULL_DAMAGE: Readonly<Partial<Record<number, HullDamage>>> = {
  1: [[-.23, .08], [.22, -.06], [.12, .33]],
  2: [[-.25, -.15], [.24, .15], [0, .33]],
  3: [[-.24, -.12], [.23, .08], [.13, .21]],
  4: [[-.22, -.12], [.21, -.08], [.18, .25]],
  6: [[-.29, -.09], [.28, .08], [.16, .33]],
  7: [[-.20, -.22], [.18, -.13], [.08, .34]],
  8: [[-.22, -.10], [.19, .13], [0, .32]],
  9: [[-.25, -.08], [.23, .02], [.13, .27]],
  11: [[-.25, .27], [0, .29], [.25, .27]],
  12: [[-.24, -.19], [.23, -.03], [.10, .32]],
  13: [[-.22, -.19], [.23, -.07], [.10, .32]],
  14: [[-.24, -.10], [.18, -.13], [0, .31]],
}

const defaultHull: HullDamage = [[-.22, .03], [.22, -.06], [0, .26]]
const hullDamage = (enemy: Enemy) => HULL_DAMAGE[enemy.bossArtStage ?? 0] ?? defaultHull
const IMPACT_SECONDS = .22
export const BOSS_BREAKUP_DELAYS = [.20, .53, .85, 1.26, 1.81] as const

export function isCommandCoreExposed(enemy: Enemy) {
  return enemy.bossArtStage !== undefined && enemy.hp > 0 && enemy.shieldTime <= 0 && enemy.y >= 15
    && enemy.bossAttackState === 'recovery' && enemy.hp <= enemy.maxHp * COMMAND_PHASE_HP.critical
}

export function getBossImpactKind(enemy: Enemy, shot: Shot, shielded: boolean): BossImpactKind | undefined {
  if (!enemy.isBoss && !enemy.isMiniBoss) return
  if (shielded) return 'shield'
  if (shot.kind === 'rocket' || shot.kind === 'homing' || shot.kind === 'coreBlast' || shot.kind === 'spiegelKunai') return 'heavy'
  if (isCommandCoreExposed(enemy) && shot.vy < 0 && shot.y >= enemy.y
    && Math.abs(shot.x - enemy.x) <= enemy.radius * .24) return 'core'
  return 'armor'
}

export function getRaidDirectHitDamage(shot: Shot, kind?: BossImpactKind) {
  if (kind === 'shield') return 0
  return kind === 'core' ? Math.round(shot.damage * 1.25) : shot.damage
}

export function recordBossImpact(enemy: Enemy, shot: Shot, kind: BossImpactKind) {
  const recent = enemy.bossImpactTime ?? 0
  if (recent > .10 && (enemy.bossImpact?.kind !== 'armor' || kind === 'armor')) return false
  enemy.bossImpact = { kind, shotId: shot.id, x: shot.x - enemy.x, y: shot.y - enemy.y }
  enemy.bossImpactTime = IMPACT_SECONDS
  return true
}

export function drawBossImpact(ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number,
  pixelsPerX: number, pixelsPerY: number, size: number, reducedMotion: boolean) {
  const impact = enemy.bossImpact
  const time = enemy.bossImpactTime ?? 0
  if (!impact || time <= 0) return
  const progress = 1 - Math.min(1, time / IMPACT_SECONDS)
  const heavy = impact.kind === 'heavy'
  const shield = impact.kind === 'shield'
  const core = impact.kind === 'core'
  const dx = impact.x * pixelsPerX
  const dy = impact.y * pixelsPerY
  // Keep contact on the drawn silhouette at every aspect ratio.
  const projection = Math.min(1, size * (shield ? .52 : .39) / Math.max(1, Math.hypot(dx, dy)))
  const atX = x + dx * projection
  const atY = y + dy * projection
  const diameter = Math.max(14, size * (shield ? .35 : heavy || core ? .30 : .19))
    * (reducedMotion ? 1 : 1 + progress * .55)
  const tile = shield ? RAID_VFX_TILE.shield : core ? RAID_VFX_TILE.precision : RAID_VFX_TILE.debris
  drawRaidVfx(ctx, tile, atX, atY, diameter, diameter * (shield ? .83 : .95),
    .92 * (1 - progress), impact.shotId * .37, !heavy && !shield)
}

export function drawHullDamage(ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number,
  size: number, rotation: number, scale: number, reducedMotion: boolean, opacity = 1) {
  if (enemy.bossArtStage === undefined) return
  const defeated = enemy.hp <= 0
  const ratio = enemy.hp / Math.max(1, enemy.maxHp)
  if (!defeated && ratio > COMMAND_PHASE_HP.pressure) return
  const critical = ratio <= COMMAND_PHASE_HP.critical
  const clock = enemy.bossEncounterAge ?? 0
  const hydra = enemy.bossArtStage === 11
  const points = hullDamage(enemy)
  const count = critical ? points.length : 1
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.scale(size * scale, size * scale)
  if (defeated) {
    for (let i = hydra ? 0 : 2; i < points.length; i++) {
      const [px, py] = points[i]
      drawRaidVfx(ctx, RAID_VFX_TILE.charredPlate, px, py, .12, .1, opacity * .7)
    }
    ctx.restore()
    return
  }
  for (let i = 0; i < count; i++) {
    const [px, py] = points[i]
    const cycle = (clock * (hydra ? 1.25 : 1.8) + (hydra ? i / 3 : enemy.id * .139 + i * .29)) % 1
    const burn = reducedMotion ? .35 : Math.max(.08, 1 - cycle * 2)
    drawRaidVfx(ctx, RAID_VFX_TILE.hullDamage, px, py, critical ? .17 : .13, .13,
      .44 + burn * .44, i * 1.05 - .38)
  }
  if (isCommandCoreExposed(enemy)) {
    const pulse = reducedMotion ? 1 : .94 + Math.sin(clock * 10) * .06
    if (!drawRaidContactArt(ctx, RAID_CONTACT_TILE.reactor, 0, .09, .19 * pulse, .19 * pulse, .98)) {
      drawRaidVfx(ctx, RAID_VFX_TILE.precision, 0, .09, .11, .11, .82, 0, true)
    }
  }
  if (!hydra && !reducedMotion) {
    const [px, py] = points[2]
    const pulse = (clock * 3.2 + enemy.id * .17) % 1
    if (pulse < .58) drawRaidVfx(ctx, RAID_VFX_TILE.muzzle, px, py + .032, .075, .11, .67 * (1 - pulse), Math.PI / 2, true)
  }
  ctx.restore()
}

export function getBossBreakupPoint(enemy: Enemy, index: number): HullPoint {
  const points = hullDamage(enemy)
  if (index === 3) return [0, -.12]
  if (index === 4) return [0, .05]
  return points[index % points.length]
}
