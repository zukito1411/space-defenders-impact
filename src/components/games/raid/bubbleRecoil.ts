import type { Shot } from './types'

const RECOIL_RECOVERY_SECONDS = 1

/** Count damaging contacts. Recovery prevents rapid fire from pinning the bubble in place. */
export function registerSquidBubbleHit(bubble: Shot, directionX: number, directionY: number, damage: number) {
  if (damage <= 0 || (bubble.hp ?? 1) <= 0 || (bubble.bubbleRecoilRecovery ?? 0) > 0) return false

  const level = bubble.splitLevel ?? 0
  const threshold = level === 0 ? 8 : level === 1 ? 6 : 4
  const hits = (bubble.bubbleRecoilHits ?? 0) + 1
  if (hits < threshold) {
    bubble.bubbleRecoilHits = hits
    return false
  }

  bubble.bubbleRecoilHits = 0
  bubble.bubbleRecoilRecovery = RECOIL_RECOVERY_SECONDS
  const magnitude = Math.hypot(directionX, directionY)
  const nx = magnitude > 0 ? directionX / magnitude : 0
  const ny = magnitude > 0 ? directionY / magnitude : -1
  const forward = bubble.vx * nx + bubble.vy * ny
  const recoilSpeed = 3.4 + Math.min(.8, damage * .08)
  // Set the outward speed once, without stacking speed or moving the collision hash mid-tick.
  bubble.vx += nx * (recoilSpeed - forward)
  bubble.vy += ny * (recoilSpeed - forward)
  return true
}
