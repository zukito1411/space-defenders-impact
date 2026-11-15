export type PlanetFlightParticle = { x: number; y: number; width: number; height: number; alpha: number; rotation: number; near: boolean }
const fract = (n: number) => n - Math.floor(n)
const wrap = (n: number, length: number) => ((n % length) + length) % length
const clamp = (n: number) => Math.max(0, Math.min(1, n))

/** Absolute scene time keeps particles stable across refresh rates and quality switches. */
export function samplePlanetFlightParticle(index: number, seconds: number, width: number, height: number,
  wet: boolean, speed: number, streak: boolean, out: PlanetFlightParticle) {
  const seed = fract(index * .61803398875 + .173), layer = index % 3
  const depth = [.32, .62, 1][layer], rush = clamp(speed), t = Math.max(0, seconds)
  const length = streak ? width * (.018 + seed * .035) * (1 + rush * .9) * (.6 + depth * .4) : 0
  const padding = streak ? width * .12 : 20, span = width + padding * 2
  // Rush changes the drawn trail, not the transport phase: accelerating cannot teleport particles.
  out.x = wrap(seed * span - t * width * (streak ? .2 + depth * .25 : .035 + depth * .12), span) - padding
  const lane = streak ? (index % 2 ? .06 + fract(index * .37) * .22 : .74 + fract(index * .41) * .2) : .06 + fract(index * .137) * .9
  out.y = height * lane + Math.sin(t * (.1 + depth * .14) + index * 2.4) * height * (streak ? .003 : .014)
  const edge = clamp(Math.min((out.x + length) / Math.max(20, length), (width - out.x + length) / Math.max(20, length)))
  const pulse = .72 + Math.sin(t * .7 + index) * .28
  out.width = streak ? Math.max(32, width * .025, length) * (1 + rush * .22) : Math.max(1.4, height * .0035) * (.55 + depth) * (wet ? .65 : 1.1)
  out.height = streak ? Math.max(2.8, height * .003) * (.7 + depth * .4) : out.width * (wet ? 2.6 : .7)
  out.rotation = streak ? 0 : wet ? -.26 : Math.sin(t * .35 + index) * 1.8
  out.alpha = edge * pulse * (streak ? (.4 + depth * .18 + rush * .17) : wet ? .18 + depth * .2 : .22 + depth * .24)
  out.near = layer === 2
  return out
}
