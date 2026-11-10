const unit = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number) => { const t = unit(value); return t * t * (3 - 2 * t) }
/** Dim RGB, never coverage: a distant dark surface still hides the stars behind it. */
export function sceneryTint(tint: number, exposure = 1) {
  const gain = unit(exposure)
  return (Math.round(((tint >>> 16) & 255) * gain) << 16) |
    (Math.round(((tint >>> 8) & 255) * gain) << 8) | Math.round((tint & 255) * gain)
}
export const PLANET_DEPTH = [30, 20, 10] as const
export const PLANET_PARALLAX = [0.018, 0.009, 0.004] as const

/** One loading-screen pass over the canonical atlas. Preserve holes/soft edges. */
export function shadeSceneryAtlas(data: Uint8ClampedArray, width: number, height: number) {
  const tile = width / 2
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4
    if (data[p + 3] <= 8) { data[p + 3] = 0; continue }
    // Generated surfaces peak at alpha 253: normalize coverage without filling gutters/holes.
    if (data[p + 3] >= 240) data[p + 3] = 255
    if (y >= tile) continue // wrecks retain their painted metallic lighting
    const cell = x >= tile ? 1 : 0
    const radius = tile * (cell === 0 ? 0.445 : 0.305)
    const nx = (x - cell * tile - tile * 0.5) / radius
    const ny = (y - tile * 0.5) / radius
    const radial = nx * nx + ny * ny
    if (radial > 1) continue // atmosphere and rings keep their existing soft lighting
    const nz = Math.sqrt(1 - radial)
    // Shared upper-left sun; a dark night side is still an opaque surface.
    const light = nx * -0.45 + ny * -0.55 + nz * 0.7
    const brightness = 0.3 + 0.7 * smooth((light + 0.12) / 0.82)
    data[p] = Math.round(data[p] * brightness)
    data[p + 1] = Math.round(data[p + 1] * brightness)
    data[p + 2] = Math.round(data[p + 2] * brightness)
  }
}

/** Bright-pass extraction for cached local bloom; never used in the render loop. */
export function extractSceneryBloom(data: Uint8ClampedArray) {
  for (let p = 0; p < data.length; p += 4) {
    const peak = Math.max(data[p], data[p + 1], data[p + 2])
    const energy = smooth((peak - 170) / 80)
    data[p + 3] = Math.round(data[p + 3] * energy)
  }
}
