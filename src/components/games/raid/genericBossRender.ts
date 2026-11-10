import { drawCanvasSpriteContain, getGenericBossCanvasSprite } from './assets'
import type { Enemy } from './types'

/** One opaque bitmap per frame, retaining the existing boss motion and draw footprint. */
export function drawGenericBossShip(ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number,
  size: number, rotation: number, scale: number, alpha: number) {
  const sprite = getGenericBossCanvasSprite(enemy.bossKind ?? 'carrier', enemy.bossArtStage)
  if (sprite?.loaded && sprite.image.complete) {
    drawCanvasSpriteContain(ctx, sprite, x, y, size * 1.04, 'none', alpha, rotation, scale, enemy.color)
    return
  }
  // A bounded command-hull silhouette while art is unavailable; never borrow a random swarm sprite.
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.scale(size * scale * 0.5, size * scale * 0.5)
  ctx.globalAlpha *= alpha
  ctx.fillStyle = enemy.color
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 0.025
  ctx.beginPath()
  if (enemy.bossKind === 'orb') {
    ctx.arc(0, 0, 0.9, 0, Math.PI * 2)
  } else {
    ctx.moveTo(-0.82, -0.5); ctx.lineTo(-0.4, -0.85); ctx.lineTo(0.4, -0.85)
    ctx.lineTo(0.82, -0.5); ctx.lineTo(0.9, 0.45); ctx.lineTo(0.3, 0.7)
    ctx.lineTo(0, 0.96); ctx.lineTo(-0.3, 0.7); ctx.lineTo(-0.9, 0.45)
    ctx.closePath()
  }
  ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#c4b5fd'
  ctx.fillRect(-0.12, -0.15, 0.24, 0.45)
  ctx.restore()
}
