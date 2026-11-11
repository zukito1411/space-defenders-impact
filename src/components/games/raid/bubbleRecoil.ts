import type { Shot } from './types'

/** Apply recoil in the hit direction without shifting the collision hash mid-tick. */
export function pushSquidBubble(bubble: Shot, directionX: number, directionY: number, damage: number) {
  const magnitude = Math.hypot(directionX, directionY)
  const nx = magnitude > 0 ? directionX / magnitude : 0
  const ny = magnitude > 0 ? directionY / magnitude : -1
  const forward = bubble.vx * nx + bubble.vy * ny
  const impulse = 4.8 + Math.min(7, damage * .65)
  // Cancel motion into the shot first so even a weak hit visibly pushes back.
  const outward = Math.min(19, Math.max(0, forward) + impulse)
  bubble.vx += nx * (outward - forward)
  bubble.vy += ny * (outward - forward)
  const speed = Math.hypot(bubble.vx, bubble.vy)
  if (speed > 22) {
    bubble.vx *= 22 / speed
    bubble.vy *= 22 / speed
  }
}
