import { getGenericBossArt } from './bossCatalog'
import { PLAYER_RADIUS } from './constants'
import { COMMAND_PHASE_HP, createCommandVolley, isCommandBeam, writeCommandVolley } from './commandBoss'
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

const reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : undefined
export const prefersRaidReducedMotion = () => reducedMotion?.matches === true
const phaseColors = ['#67e8f9', '#fbbf24', '#fb7185'] as const

/** Short, local effects driven by the same encounter clock as the attacks. */
export function drawCommandBossEnergy(ctx: CanvasRenderingContext2D, enemy: Enemy,
  toX: (v: number) => number, toY: (v: number) => number, size: number) {
  const age = enemy.bossEncounterAge
  if (enemy.hp <= 0 || age === undefined) return

  const phaseAge = age - (enemy.bossPhaseStartedAge ?? -Infinity)
  const volleyAge = age - (enemy.bossLastVolleyAge ?? -Infinity)
  const charging = enemy.bossAttackState === 'warning' && (enemy.bossAttackTimer ?? 0) > 0
  const phasePulse = phaseAge >= 0 && phaseAge < .65
  const firing = volleyAge >= 0 && volleyAge < .18
  if (!charging && !phasePulse && !firing) return

  const x = toX(enemy.x)
  const y = toY(enemy.y)
  const phaseColor = phaseColors[enemy.bossCombatPhase ?? 0] ?? phaseColors[0]
  const motionReduced = prefersRaidReducedMotion()
  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  if (phasePulse) {
    const progress = phaseAge / .65
    const radius = size * (motionReduced ? .64 : .53 + .37 * progress)
    ctx.beginPath()
    ctx.ellipse(x, y, radius, radius * .76, 0, 0, Math.PI * 2)
    ctx.strokeStyle = phaseColor
    ctx.globalAlpha = .16 * (1 - progress)
    ctx.lineWidth = Math.max(4, size * .04)
    ctx.stroke()
    ctx.globalAlpha = .72 * (1 - progress)
    ctx.lineWidth = Math.max(1.5, size * .009)
    ctx.stroke()
  }

  if (charging) {
    const timer = enemy.bossAttackTimer ?? 0
    const progress = Math.max(0, Math.min(1, 1 - timer / Math.max(.01, enemy.bossWarningSeconds ?? 1)))
    const radius = size * .54
    const start = -Math.PI / 2
    ctx.beginPath()
    ctx.arc(x, y, radius, start, start + Math.PI * 2)
    ctx.lineWidth = Math.max(1.5, size * .012)
    ctx.strokeStyle = phaseColor
    ctx.globalAlpha = .16
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, radius, start, start + Math.PI * 2 * progress)
    ctx.globalAlpha = .36 + progress * .42
    ctx.stroke()
  }

  if (firing) {
    const count = writeCommandVolley(enemy, preview, Math.max(0, (enemy.bossBurstIndex ?? 1) - 1))
    const progress = volleyAge / .18
    const radius = Math.max(3, size * .045) * (motionReduced ? 1 : 1 + progress)
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const shotX = toX(preview[i].x)
      const shotY = toY(preview[i].y)
      ctx.moveTo(shotX + radius, shotY)
      ctx.arc(shotX, shotY, radius, 0, Math.PI * 2)
    }
    ctx.strokeStyle = phaseColor
    ctx.lineWidth = Math.max(2, size * .015)
    ctx.globalAlpha = .8 * (1 - progress)
    ctx.stroke()
    ctx.fillStyle = '#fff7df'
    ctx.globalAlpha = .33 * (1 - progress) ** 2
    ctx.fill()
  }

  ctx.restore()
}

/** Phase divisions use the same HP thresholds as the encounter scheduler. */
export function drawCommandBossHealthBar(ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, size: number) {
  const width = size * .9
  const height = 7
  const left = x - width / 2
  const top = y + size * .5 + 12
  const fill = Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp)))

  ctx.save()
  ctx.fillStyle = '#08111e'
  ctx.fillRect(left - 2, top - 2, width + 4, height + 4)
  ctx.fillStyle = '#243448'
  ctx.fillRect(left, top, width, height)
  ctx.fillStyle = phaseColors[enemy.bossCombatPhase ?? 0] ?? phaseColors[0]
  ctx.fillRect(left, top, width * fill, height)
  ctx.fillStyle = 'rgba(255,255,255,0.34)'
  ctx.fillRect(left, top, width * fill, 1)
  ctx.fillStyle = '#08111e'
  ctx.fillRect(left + width * COMMAND_PHASE_HP.critical - 1, top, 2, height)
  ctx.fillRect(left + width * COMMAND_PHASE_HP.pressure - 1, top, 2, height)
  const name = getGenericBossArt(enemy.bossKind ?? 'carrier', enemy.bossArtStage)?.name
  if (name) {
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '600 10px Orbitron, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(name, x, top + height + 5, width + 14)
  }
  ctx.restore()
}
