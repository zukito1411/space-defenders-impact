import { BOSS_FX, COMBAT_TILE, drawBossFx, drawRaidCombatTexture, getRaidCombatFrame } from './combatArt'
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

export function recordBossImpact(enemy: Enemy, shot: Shot, shielded: boolean): BossImpactKind | undefined {
  if (!enemy.isBoss && !enemy.isMiniBoss) return
  const x = shot.x - enemy.x
  const y = shot.y - enemy.y
  const heavy = shot.kind === 'rocket' || shot.kind === 'homing' || shot.kind === 'coreBlast'
  const exposedCore = !heavy && enemy.bossArtStage !== undefined && y >= 0
    && enemy.hp / Math.max(1, enemy.maxHp) <= COMMAND_PHASE_HP.critical && Math.abs(x) <= enemy.radius * .24
  const kind = shielded ? 'shield' : heavy ? 'heavy' : exposedCore ? 'core' : 'armor'
  const recent = enemy.bossImpactTime ?? 0
  if (recent > .10 && (enemy.bossImpact?.kind !== 'armor' || kind === 'armor')) return
  enemy.bossImpact = { kind, shotId: shot.id, x, y }
  enemy.bossImpactTime = IMPACT_SECONDS
  return kind
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
  const diameter = Math.max(16, size * (shield ? .32 : heavy || core ? .29 : .21))
    * (reducedMotion ? 1 : 1 + progress * .45)
  if (shield) {
    // The shock spreads along the shield surface from the point of contact.
    const tangent = Math.atan2(dy, dx) + Math.PI / 2
    drawBossFx(ctx, BOSS_FX.shield, atX, atY, diameter * (reducedMotion ? 1 : 1 + progress * .8), diameter * .67,
      .95 * (1 - progress) ** 1.15, tangent, true)
    return
  }
  drawBossFx(ctx, core ? BOSS_FX.precision : BOSS_FX.impact, atX, atY,
    diameter, diameter, .93 * (1 - progress) ** 1.3, impact.shotId * .37, !heavy)
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
      drawBossFx(ctx, BOSS_FX.char, px, py, .11, .09, opacity * .78)
    }
    ctx.restore()
    return
  }
  for (let i = 0; i < count; i++) {
    const [px, py] = points[i]
    const cycle = (clock * (hydra ? 1.25 : 1.8) + (hydra ? i / 3 : enemy.id * .139 + i * .29)) % 1
    const burn = reducedMotion ? .35 : Math.max(.08, 1 - cycle * 2)
    drawBossFx(ctx, BOSS_FX.damage, px, py, critical ? .17 : .135, .125, .4 + burn * .55, i * .78 - .35)
  }
  if (critical) {
    drawBossFx(ctx, BOSS_FX.precision, 0, .09, .095, .095, .57, 0, true)
    // A single cached smoke sprite makes critical damage readable without particle spam.
    const smoke = !reducedMotion ? getRaidCombatFrame(COMBAT_TILE.smoke) : undefined
    if (smoke) {
      const [px, py] = points[0]
      const drift = (clock * .55 + enemy.id * .17) % 1
      drawRaidCombatTexture(ctx, smoke, px, py - .08 - drift * .14, .16 + drift * .05, .18 + drift * .06, 0, false, (1 - drift) * .32 * opacity)
    }
  }
  if (!hydra && !reducedMotion) {
    const [px, py] = points[2]
    const pulse = (clock * 3.2 + enemy.id * .17) % 1
    if (pulse < .58) drawBossFx(ctx, BOSS_FX.muzzle, px, py + .036, .075, .125, .65 * (1 - pulse), 0, true)
  }
  ctx.restore()
}

export function getBossBreakupPoint(enemy: Enemy, index: number): HullPoint {
  const points = hullDamage(enemy)
  if (index === 3) return [0, -.12]
  if (index === 4) return [0, .05]
  return points[index % points.length]
}

