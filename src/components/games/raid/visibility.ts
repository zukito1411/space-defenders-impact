/**
 * Air Raid is simulated in a fixed logical world (100x100), then scaled to
 * the actual CSS viewport. Convert CSS-pixel overscan into world coordinates
 * so portrait/landscape/tablet views get the same visual safety band.
 * Only cull DRAW calls here; gameplay state is authoritative elsewhere.
 */
export type RaidVisibilityBounds = {
  left: number
  right: number
  top: number
  bottom: number
  marginX: number
  marginY: number
}

export function createRaidVisibilityBounds(
  cssWidth: number,
  cssHeight: number,
  worldWidth: number,
  worldHeight: number,
  marginScale = 1,
): RaidVisibilityBounds {
  const width = Math.max(1, cssWidth)
  const height = Math.max(1, cssHeight)
  const paddingPx = Math.max(64, Math.min(144, Math.min(width, height) * 0.16)) * marginScale
  const marginX = paddingPx * worldWidth / width
  const marginY = paddingPx * worldHeight / height
  return {
    left: -marginX,
    right: worldWidth + marginX,
    top: -marginY,
    bottom: worldHeight + marginY,
    marginX,
    marginY,
  }
}

export function raidObjectInView(
  bounds: RaidVisibilityBounds,
  x: number,
  y: number,
  radiusX = 0,
  radiusY = radiusX,
): boolean {
  return x + radiusX >= bounds.left &&
    x - radiusX <= bounds.right &&
    y + radiusY >= bounds.top &&
    y - radiusY <= bounds.bottom
}
