import { HEIGHT, WIDTH } from './constants'
import { getRaidPlayerHitRadius } from './shipSize'
import type { AsteroidHazard, MeteorHazard, Player, PowerUp, Shot, Vec } from './types'

export function passesNearPilot(shot: Shot, pilot: Vec & { sizeScale?: number }, dt: number) {
  if (shot.kind === 'beam' || shot.kind === 'poisonCloud' || shot.kind === 'squidBubble' || dt <= 0) return false
  const dx = shot.x - pilot.x
  const dy = shot.y - pilot.y
  const hitRadius = shot.radius + getRaidPlayerHitRadius(pilot)
  const audibleRadius = hitRadius + 3.8
  if (Math.abs(dx) > audibleRadius + Math.abs(shot.vx) * dt || Math.abs(dy) > audibleRadius + Math.abs(shot.vy) * dt) return false
  const velocitySq = shot.vx * shot.vx + shot.vy * shot.vy
  const projection = dx * shot.vx + dy * shot.vy
  // Trigger only when crossing the closest point on this frame.
  if (projection < 0 || projection >= velocitySq * dt) return false
  const distanceSq = dx * dx + dy * dy - projection * projection / velocitySq
  return distanceSq > (hitRadius + .45) ** 2 && distanceSq <= audibleRadius ** 2
}

export function needsRepair(pilot: Player) {
  return pilot.hp > 0 && pilot.hp < pilot.maxHp && pilot.hp <= Math.max(1, Math.floor(pilot.maxHp * .35))
}

export function drawRecoveryCue(ctx: CanvasRenderingContext2D, power: PowerUp, pilot: Player,
  x: number, y: number, viewportWidth: number) {
  if (!needsRepair(pilot) || power.type !== 'repair' || Math.abs(power.x - pilot.x) > 33) return
  const size = Math.max(15, power.radius * viewportWidth / WIDTH * 1.27)
  ctx.save()
  ctx.strokeStyle = '#a7f3d0'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  for (let sign = -1; sign <= 1; sign += 2) {
    const corner = x + sign * size
    ctx.moveTo(corner + sign * -5, y - size)
    ctx.lineTo(corner, y - size)
    ctx.lineTo(corner, y - size + 5)
    ctx.moveTo(corner, y + size - 5)
    ctx.lineTo(corner, y + size)
    ctx.lineTo(corner - sign * 5, y + size)
  }
  ctx.stroke()
  ctx.restore()
}

export function findIncomingHazard(asteroids: readonly AsteroidHazard[], meteors: readonly MeteorHazard[], pilot: Vec) {
  let incoming: AsteroidHazard | MeteorHazard | undefined
  let nearest = Infinity
  // Warn only about objects outside the playfield heading toward the pilot's lane.
  for (let group = 0; group < 2; group++) {
    for (const hazard of group === 0 ? asteroids : meteors) {
      if (hazard.y + hazard.radius > 3 || hazard.vy <= 0) continue
      if ('hp' in hazard ? hazard.hp <= 0 : hazard.life <= 0) continue
      const seconds = Math.min(1.25, Math.max(0, (pilot.y - hazard.y) / hazard.vy))
      if (Math.abs(pilot.x - hazard.x - hazard.vx * seconds) > hazard.radius + 17) continue
      const entry = -(hazard.y + hazard.radius) / hazard.vy
      if (entry >= .85 || entry >= nearest) continue
      incoming = hazard
      nearest = entry
    }
  }
  return incoming
}

export function drawIncomingHazard(ctx: CanvasRenderingContext2D, hazard: AsteroidHazard | MeteorHazard,
  width: number, height: number) {
  const timeToEdge = Math.max(0, -hazard.y / hazard.vy)
  const predictedX = (hazard.x + hazard.vx * timeToEdge) * width / WIDTH
  const x = Math.min(width - 16, Math.max(16, predictedX))
  const y = Math.min(32, height / HEIGHT * 5)
  ctx.save()
  ctx.fillStyle = '#162030'
  ctx.strokeStyle = '#fbbf24'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(x - 10, y)
  ctx.lineTo(x + 10, y)
  ctx.lineTo(x, y + 12)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}
