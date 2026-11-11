import { HEIGHT, HOMING_RETARGET_SECONDS, HOMING_RETARGET_STAGGER_SECONDS, WIDTH } from './constants'
import { homingCruiseSpeed } from './missilePresentation'
import type { AsteroidHazard, Enemy, Shot, Vec } from './types'

export function isRaidEnemyShielded(enemy: Enemy) {
  return (enemy.isBoss && (enemy.shieldTime > 0 || enemy.y < 15))
    || (enemy.isMiniBoss && (enemy.shieldTime > 0 || enemy.y < 8))
}

export function canHomingLock(enemy: Enemy) {
  return enemy.hp > 0 && enemy.y >= -10 && enemy.y <= HEIGHT + 4
    && enemy.x >= -4 && enemy.x <= WIDTH + 4 && !isRaidEnemyShielded(enemy)
}

export function acquireHomingTarget(shot: Shot, enemies: readonly Enemy[]) {
  let target: Enemy | undefined
  let bestScore = Infinity
  for (const enemy of enemies) {
    if (!canHomingLock(enemy)) continue
    const dx = shot.x - enemy.x
    const dy = shot.y - enemy.y
    const distance = dx * dx + dy * dy
    const forwardBias = enemy.y > shot.y + 18 ? 2400 : 0
    const bossBias = enemy.isBoss ? -1400 : enemy.isMiniBoss ? -700 : 0
    const score = distance + forwardBias + bossBias
    if (score < bestScore) {
      bestScore = score
      target = enemy
    }
  }
  return target
}

export function fillRaidHomingTargets(targets: Map<number, Enemy>, enemies: readonly Enemy[]) {
  targets.clear()
  for (const enemy of enemies) if (canHomingLock(enemy)) targets.set(enemy.id, enemy)
  return targets
}

export function steerRaidHoming(shot: Shot, dt: number, enemies: readonly Enemy[], targets: ReadonlyMap<number, Enemy>) {
  const previousId = shot.homingTargetId
  let target = previousId === undefined ? undefined : targets.get(previousId)
  if (!target) {
    const retry = (shot.retargetTime ?? 0) - dt
    if (previousId !== undefined || retry <= 0) {
      target = acquireHomingTarget(shot, enemies)
      shot.homingTargetId = target?.id
      shot.retargetTime = HOMING_RETARGET_SECONDS + (shot.id % 7) * HOMING_RETARGET_STAGGER_SECONDS
    } else {
      shot.retargetTime = retry
    }
  }
  if (!target) return
  const aimX = target.x - shot.x
  const aimY = target.y - shot.y
  const distance = Math.sqrt(aimX * aimX + aimY * aimY) || 1
  const speed = homingCruiseSpeed(shot.vx, shot.vy)
  const turn = Math.min(1, (shot.turn ?? 8) * dt)
  shot.vx += (aimX / distance * speed - shot.vx) * turn
  shot.vy += (aimY / distance * speed - shot.vy) * turn
}

export function isRaidSpecialTargetOnField(target: Vec) {
  return target.y > -18 && target.y < HEIGHT + 16
}

export function isRaidSpecialBubble(shot: Shot) {
  return shot.kind === 'squidBubble' && (shot.hp ?? 1) > 0 && isRaidSpecialTargetOnField(shot)
}

export function hasRaidSpecialTarget(enemies: readonly Enemy[], asteroids: readonly AsteroidHazard[], shots: readonly Shot[]) {
  return enemies.some(enemy => enemy.hp > 0 && isRaidSpecialTargetOnField(enemy))
    || asteroids.some(asteroid => asteroid.hp > 0 && isRaidSpecialTargetOnField(asteroid))
    || shots.some(isRaidSpecialBubble)
}
