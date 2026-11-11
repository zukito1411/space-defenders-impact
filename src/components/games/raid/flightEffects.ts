const smoothStep = (n: number) => {
  const p = Math.max(0, Math.min(1, n))
  return p * p * (3 - 2 * p)
}

export function sampleCapitalFlyby(age: number, stage: number) {
  const clock = (age + (stage % 3) * 2.2) % 32
  return clock >= 8 && clock <= 14 ? (clock - 8) / 6 : -1
}

export type OrbitalShadow = {
  x: number; y: number; length: number; width: number; rotation: number; strength: number; sunSide: number
}

export function sampleOrbitalShadow(out: OrbitalShadow, planetX: number, planetY: number, diameter: number, width: number, height: number, approach: number) {
  const inward = planetX > width / 2 ? -1 : 1
  const dx = inward * width * .23
  const dy = height * .77
  out.x = planetX + dx * .72
  out.y = planetY + dy * .72
  out.length = Math.hypot(dx, dy) * 1.9
  out.width = Math.min(diameter * .72, Math.min(width, height) * .68)
  out.rotation = Math.atan2(dy, dx)
  out.strength = smoothStep((approach - .49) / .20)
  out.sunSide = -inward
}

export function orbitalShadowCoverage(shadow: OrbitalShadow, x: number, y: number) {
  if (!shadow.strength) return 0
  const dx = x - shadow.x
  const dy = y - shadow.y
  const cos = Math.cos(shadow.rotation)
  const sin = Math.sin(shadow.rotation)
  const along = (dx * cos + dy * sin) * 2 / shadow.length
  const across = (dy * cos - dx * sin) * 2 / shadow.width
  return shadow.strength * (1 - smoothStep((Math.hypot(along, across) - .16) / .84))
}

export function getHullImpactDirection(dx: number, dy: number, vx: number, vy: number) {
  return Math.hypot(dx, dy) > .25 ? Math.atan2(dy, dx) : Math.atan2(-vy, -vx)
}
