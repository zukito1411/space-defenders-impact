export type DepthStar = { x: number; y: number; size: number; alpha: number; rotation: number }
const unit = (n: number) => Math.max(0, Math.min(1, n))
/** One pooled quad per near star; perspective and edge fading, no geometry rebuild. */
export function projectDepthStar(seedX: number, seedY: number, seedZ: number, travel: number,
  width: number, height: number, cameraX: number, cameraY: number, out: DepthStar) {
  const phase = ((seedZ + travel / 900) % 1 + 1) % 1
  const z = 1 - phase * 0.88
  const scale = Math.min(width, height) * 0.35 / z
  const cx = width * 0.5, cy = height * 0.32
  out.x = cx + ((seedX - 0.5) * 2.4 - cameraX * 0.055) * scale
  out.y = cy + ((seedY - 0.5) * 1.8 - cameraY * 0.035) * scale
  const edge = unit(Math.min(out.x / width, (width - out.x) / width, out.y / height, (height - out.y) / height) * 12)
  out.alpha = (0.18 + phase * 0.65) * unit((z - 0.12) / 0.1) * unit((1 - z) / 0.12) * edge
  out.size = Math.min(3, Math.max(0.6, 0.4 / z))
  out.rotation = Math.atan2(out.y - cy, out.x - cx)
  return phase
}
