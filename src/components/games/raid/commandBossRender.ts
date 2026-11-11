import { PLAYER_RADIUS } from './constants'
import { createCommandVolley, isCommandBeam, writeCommandVolley } from './commandBoss'
import type { Enemy } from './types'
const preview = createCommandVolley()
/** At most twelve trajectory strokes, no blur, gradients, texture baking or new particle systems. */
export function drawCommandBossTelegraph(ctx: CanvasRenderingContext2D, enemy: Enemy,
  toX: (v: number) => number, toY: (v: number) => number, viewportWidth: number) {
  if (enemy.hp <= 0 || enemy.bossAttackState !== 'warning' || (enemy.bossAttackTimer ?? 0) <= 0) return
  const count = writeCommandVolley(enemy, preview, enemy.bossAttackPattern === 'hydra' ? -1 : 0)
  if (!count) return
  const progress = 1 - (enemy.bossAttackTimer ?? 0) / Math.max(.01, enemy.bossWarningSeconds ?? 1)
  ctx.save()
  ctx.lineWidth = Math.max(1, Math.min(2, viewportWidth / 600))
  ctx.strokeStyle = `rgba(251,191,36,${.35 + progress * .4})`
  ctx.setLineDash([7, 6])
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const shot = preview[i]
    if (isCommandBeam(enemy.bossAttackPattern)) {
      // This warning covers the beam's entire actual collision lane, including the player radius.
      const half = shot.radius * .82 + PLAYER_RADIUS * .72
      ctx.fillStyle = `rgba(251,113,133,${.045 + progress * .075})`
      ctx.fillRect(toX(shot.x - half), toY(0), toX(half * 2) - toX(0), toY(100) - toY(0))
      ctx.moveTo(toX(shot.x - half), toY(0)); ctx.lineTo(toX(shot.x - half), toY(100))
      ctx.moveTo(toX(shot.x + half), toY(0)); ctx.lineTo(toX(shot.x + half), toY(100))
    } else {
      // Preview the locked first volley; follow-up bursts retain that aim and origin.
      const span = shot.vy > 2 ? Math.max(.8, (92 - shot.y) / shot.vy) : 1.25
      ctx.moveTo(toX(shot.x), toY(shot.y))
      ctx.lineTo(toX(shot.x + shot.vx * span), toY(shot.y + shot.vy * span))
    }
  }
  ctx.stroke()
  ctx.setLineDash([])
  if (enemy.bossAttackPattern === 'curtain') {
    const gap = enemy.bossGapX ?? 50
    const radius = 15 - (enemy.bossCombatPhase ?? 0) - (PLAYER_RADIUS + 1.5)
    ctx.fillStyle = 'rgba(56,189,248,0.075)'
    ctx.fillRect(toX(gap - radius), toY(enemy.bossAttackY ?? enemy.y), toX(radius * 2) - toX(0), toY(100) - toY(enemy.bossAttackY ?? enemy.y))
  }
  ctx.restore()
}
