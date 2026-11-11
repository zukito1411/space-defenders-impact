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
  const radius = Math.max(5, size * (shield ? .15 : heavy || core ? .11 : .065))
  const spread = radius * (reducedMotion ? 1 : 1 + progress)
  ctx.save()
  ctx.globalAlpha *= .82 * (1 - progress)
  ctx.strokeStyle = shield ? '#7dd3fc' : heavy ? '#fdba74' : core ? '#f9a8d4' : '#fff3cc'
  ctx.lineWidth = shield ? 2 : 1.6
  ctx.beginPath()
  if (shield) {
    ctx.ellipse(atX, atY, spread, spread * .67, -.36, 0, Math.PI * 2)
  } else if (core) {
    ctx.moveTo(atX - spread, atY)
    ctx.lineTo(atX + spread, atY)
    ctx.moveTo(atX, atY - spread)
    ctx.lineTo(atX, atY + spread)
  } else {
    for (let i = 0; i < (heavy ? 6 : 3); i++) {
      const angle = i * 2.4 + impact.shotId % 7
      const sparkX = Math.cos(angle) * spread
      const sparkY = Math.sin(angle) * spread
      ctx.moveTo(atX + sparkX * .4, atY + sparkY * .4)
      ctx.lineTo(atX + sparkX, atY + sparkY)
    }
  }
  ctx.stroke()
  ctx.restore()
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
  ctx.lineWidth = .009
  if (defeated) {
    ctx.globalAlpha *= .78 * opacity
    ctx.fillStyle = '#100f17'
    ctx.beginPath()
    for (let i = hydra ? 0 : 2; i < points.length; i++) {
      const [px, py] = points[i]
      ctx.moveTo(px + .032, py)
      ctx.ellipse(px, py, .032, .022, 0, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.restore()
    return
  }
  for (let i = 0; i < count; i++) {
    const [px, py] = points[i]
    const cycle = (clock * (hydra ? 1.25 : 1.8) + (hydra ? i / 3 : enemy.id * .139 + i * .29)) % 1
    const burn = reducedMotion ? .35 : Math.max(.08, 1 - cycle * 2)
    ctx.globalAlpha = .25 + burn * .48
    ctx.strokeStyle = critical ? '#ffd2a0' : '#fb9c56'
    ctx.beginPath()
    ctx.moveTo(px - .025, py - .017)
    ctx.lineTo(px - .008, py + .003)
    ctx.lineTo(px + .011, py - .006)
    ctx.lineTo(px + .028, py + .021)
    ctx.stroke()
    if (!reducedMotion && burn > .22) {
      ctx.globalAlpha = burn * .7
      ctx.fillStyle = '#ffe7bb'
      ctx.fillRect(px + .018 + cycle * .025, py + .025 + cycle * .07, .012, .019)
    }
  }
  if (critical) {
    ctx.globalAlpha = .58
    ctx.strokeStyle = '#f9a8d4'
    ctx.beginPath()
    ctx.moveTo(-.017, .082)
    ctx.lineTo(0, .101)
    ctx.lineTo(.017, .082)
    ctx.stroke()
  }
  if (!hydra && !reducedMotion) {
    const [px, py] = points[2]
    const pulse = (clock * 3.2 + enemy.id * .17) % 1
    if (pulse < .58) {
      ctx.globalAlpha = .56 * (1 - pulse)
      ctx.strokeStyle = '#ffd3a5'
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px + .012, py + .055 + pulse * .06)
      ctx.stroke()
    }
  }
  ctx.restore()
}

export function getBossBreakupPoint(enemy: Enemy, index: number): HullPoint {
  const points = hullDamage(enemy)
  if (index === 3) return [0, -.12]
  if (index === 4) return [0, .05]
  return points[index % points.length]
}
