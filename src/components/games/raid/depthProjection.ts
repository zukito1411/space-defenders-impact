export type DepthStar = { x: number; y: number; size: number; alpha: number; rotation: number }
const unit = (n: number) => Math.max(0, Math.min(1, n))
/** Depth planes for a forward-scrolling raid, not radial head-on warp. */
export function projectDepthStar(seedX: number, seedY: number, seedZ: number, travel: number,
  width: number, height: number, cameraX: number, cameraY: number, out: DepthStar) {
  const depth = unit(seedZ)
  const distance = 1 - depth * 0.78
  const w = Math.max(1, width), h = Math.max(1, height)
  const padding = 24
  const travelHeight = h + padding * 2
  const cycle = ((seedY + travel * (0.16 + depth * 0.95) / travelHeight) % 1 + 1) % 1
  out.x = seedX * w - cameraX * w * 0.004 / distance
  out.y = cycle * travelHeight - padding - cameraY * h * 0.003 / distance
  const edge = unit(Math.min(out.x, w - out.x, out.y, h - out.y) / padding)
  out.alpha = (0.16 + depth * 0.58) * edge
  out.size = 0.65 + depth * depth * 1.8
  out.rotation = Math.PI / 2
  return depth
}
