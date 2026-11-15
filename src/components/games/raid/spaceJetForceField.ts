// Compatibility entry points for isolated Space Jet effect previews.
// Gameplay uses the shared hull-aware renderer for every ship.
import { getRaidSideShipCanvasSprite, getShipCanvasSprite } from './assets'
import { drawShipProtection, warmShipProtection } from './shipProtection'

export function warmSpaceJetForceField() {
  const portrait = getShipCanvasSprite('spaceEt')
  const side = getRaidSideShipCanvasSprite('spaceEt')
  warmShipProtection({ sprite: portrait })
  if (side) warmShipProtection({ sprite: side, contain: true, rotation: -Math.PI / 2 })
}

export function drawSpaceJetForceField(ctx: CanvasRenderingContext2D, x: number, y: number,
  size: number, time: number, charge: number, landscape = false) {
  const side = landscape ? getRaidSideShipCanvasSprite('spaceEt') : null
  drawShipProtection(ctx, x, y, size, time, charge, 0, side?.loaded
    ? { sprite: side, contain: true, rotation: -Math.PI / 2 }
    : { sprite: getShipCanvasSprite('spaceEt') }, false, 3)
}
