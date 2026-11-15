/** Cold-path hull geometry. No image reads or contour searches run during drawing. */
export type ProtectionContour = { points: Float32Array; nose: number }

export function hullDistanceField(alpha: Uint8ClampedArray, width: number, height: number) {
  const distance = new Float32Array(width * height)
  for (let i = 0; i < distance.length; i++) distance[i] = alpha[i * 4 + 3] >= 80 ? 0 : 10000
  const diagonal = Math.SQRT2
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x
    if (x) distance[i] = Math.min(distance[i], distance[i - 1] + 1)
    if (y) {
      distance[i] = Math.min(distance[i], distance[i - width] + 1)
      if (x) distance[i] = Math.min(distance[i], distance[i - width - 1] + diagonal)
      if (x + 1 < width) distance[i] = Math.min(distance[i], distance[i - width + 1] + diagonal)
    }
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x
    if (x + 1 < width) distance[i] = Math.min(distance[i], distance[i + 1] + 1)
    if (y + 1 < height) {
      distance[i] = Math.min(distance[i], distance[i + width] + 1)
      if (x) distance[i] = Math.min(distance[i], distance[i + width - 1] + diagonal)
      if (x + 1 < width) distance[i] = Math.min(distance[i], distance[i + width + 1] + diagonal)
    }
  }
  return distance
}

/** Trace pixel edges, keep the external loop, then resample by perimeter distance. */
export function protectionContour(distance: Float32Array, width: number, height: number, padding: number): ProtectionContour {
  const stride = width + 1
  const edges = new Map<number, number>()
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && distance[y * width + x] <= padding
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!inside(x, y)) continue
    const top = y * stride + x, bottom = top + stride
    if (!inside(x, y - 1)) edges.set(top, top + 1)
    if (!inside(x + 1, y)) edges.set(top + 1, bottom + 1)
    if (!inside(x, y + 1)) edges.set(bottom + 1, bottom)
    if (!inside(x - 1, y)) edges.set(bottom, top)
  }
  let longest: number[] = []
  while (edges.size) {
    const start = edges.keys().next().value!
    const loop: number[] = []
    let point = start
    while (edges.has(point)) {
      loop.push(point)
      const next = edges.get(point)!
      edges.delete(point)
      point = next
      if (point === start) break
    }
    if (loop.length > longest.length) longest = loop
  }
  const count = 256
  const points = new Float32Array(count * 2)
  if (!longest.length) return { points, nose: 0 }
  const lengths = new Float32Array(longest.length + 1)
  for (let i = 0; i < longest.length; i++) {
    const a = longest[i], b = longest[(i + 1) % longest.length]
    lengths[i + 1] = lengths[i] + Math.hypot(a % stride - b % stride, Math.floor(a / stride) - Math.floor(b / stride))
  }
  let segment = 0, nose = 0
  for (let i = 0; i < count; i++) {
    const position = lengths[longest.length] * i / count
    while (segment + 1 < longest.length && lengths[segment + 1] < position) segment++
    const a = longest[segment], b = longest[(segment + 1) % longest.length]
    const blend = (position - lengths[segment]) / Math.max(.001, lengths[segment + 1] - lengths[segment])
    points[i * 2] = a % stride + (b % stride - a % stride) * blend - width / 2
    points[i * 2 + 1] = Math.floor(a / stride) + (Math.floor(b / stride) - Math.floor(a / stride)) * blend - height / 2
    if (points[i * 2 + 1] < points[nose * 2 + 1]) nose = i
  }
  return { points, nose }
}
