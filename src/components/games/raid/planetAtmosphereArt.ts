/** Deterministic, periodic materials baked at load time, never in the render loop. */
export type PlanetAtmosphereKind = 'pelagic' | 'cinder'
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => t * t * (3 - 2 * t)
const fract = (n: number) => n - Math.floor(n)
function hash(x: number, y: number, seed: number) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}
function noise(x: number, y: number, seed: number, period = 256) {
  const ix = Math.floor(x), iy = Math.floor(y), u = smooth(fract(x)), v = smooth(fract(y))
  const wrap = (n: number) => ((n % period) + period) % period
  return mix(mix(hash(wrap(ix), iy, seed), hash(wrap(ix + 1), iy, seed), u),
    mix(hash(wrap(ix), iy + 1, seed), hash(wrap(ix + 1), iy + 1, seed), u), v)
}
export function atmosphereNoise(x: number, y: number, seed: number) {
  let value = 0, amplitude = .55, frequency = 1
  for (let octave = 0; octave < 4; octave++) {
    value += noise(x * frequency, y * frequency, seed + octave * 19) * amplitude
    amplitude *= .5; frequency *= 2
  }
  return value
}
export const CINDER_VENTS = [.18, .61, .86] as const
export function planetTerrainHeight(u: number, layer: number, kind: PlanetAtmosphereKind) {
  u = fract(u)
  let detail = 0
  for (let octave = 0; octave < 5; octave++) {
    const period = 8 * 2 ** octave
    detail += noise(u * period, layer * 3.7, 52 + layer + octave * 19, period) * (.5 / 2 ** octave)
  }
  const crags = noise(u * 256, layer * 1.7, 113, 256) - .5
  if (kind === 'pelagic') {
    const islands = Math.max(0, Math.sin(u * Math.PI * 6 + layer * 2) * .6 + Math.sin(u * Math.PI * 10 - layer) * .25)
    return Math.min(.94, .82 - islands * (.39 + layer * .04) + (detail - .5) * .23 + crags * .045)
  }
  let cone = 0
  for (let i = 0; i < CINDER_VENTS.length; i++) {
    const distance = Math.min(Math.abs(fract(u) - CINDER_VENTS[i]), 1 - Math.abs(fract(u) - CINDER_VENTS[i]))
    const flank = Math.exp(-((distance / (.065 + i * .017)) ** 1.65))
    const crater = Math.exp(-((distance / .005) ** 2)) * .045
    cone = Math.max(cone, flank * (.51 - i * .065) - crater)
  }
  return Math.max(.12, .78 - cone + (detail - .5) * .31 + crags * .055)
}
export function bakePlanetTerrain(kind: PlanetAtmosphereKind, layer: number, width = 1024, height = 256) {
  const data = new Uint8ClampedArray(width * height * 4)
  const colors = kind === 'pelagic' ? [[49, 70, 86], [20, 44, 56], [8, 26, 35]] : [[88, 62, 65], [43, 34, 40], [19, 22, 29]]
  const color = colors[layer]
  const ventHeights = CINDER_VENTS.map(vent => planetTerrainHeight(vent, layer, kind))
  for (let x = 0; x < width; x++) {
    const u = x / width, ridge = planetTerrainHeight(u, layer, kind) * height
    for (let y = Math.max(0, Math.floor(ridge)); y < height; y++) {
      const v = y / height
      const n = atmosphereNoise(u * 32, v * 9, 91 + layer)
      const grain = hash(x, y, 33 + layer)
      const strata = atmosphereNoise(u * 128 + v * 3, v * 52, 87 + layer)
      const shade = .48 + n * .65 + strata * .23 + grain * .09
      const i = (y * width + x) * 4
      const shore = kind === 'pelagic' && layer < 2 && v > .865 && v < .88 && ridge < height * .8 && n > .46
      let lava = 0
      if (kind === 'cinder' && layer === 1) for (let ventIndex = 0; ventIndex < CINDER_VENTS.length; ventIndex++) {
        const vent = CINDER_VENTS[ventIndex], flow = v - ventHeights[ventIndex]
        const channel = vent + flow * .04 + Math.sin(flow * 25) * .006
        if (flow >= 0 && flow < .57 && Math.abs(u - channel) < .00065 + flow * .0012) lava = .5 + n * .5
        const tributary = channel - Math.max(0, flow - .18) * .13
        if (flow > .18 && flow < .5 && Math.abs(u - tributary) < .0007) lava = .3 + n * .25
      }
      data[i] = color[0] * shade + lava * 205
      data[i + 1] = color[1] * shade + lava * 66 + (shore ? 31 : 0)
      data[i + 2] = color[2] * shade + lava * 12 + (shore ? 33 : 0)
      const edge = Math.min(1, y - ridge + 1)
      data[i + 3] = edge * 255 * (kind === 'pelagic' && layer < 2 ? Math.max(0, Math.min(1, (.93 - v) * 18)) : 1)
    }
  }
  return data
}
export function bakeAtmosphereCloud(width = 512, height = 192) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / width, v = y / height
    const n = atmosphereNoise(u * 7, v * 5, 278)
    const shape = Math.max(0, 1 - ((u - .5) / .51) ** 2 - ((v - .5) / .5) ** 2)
    const density = Math.max(0, Math.min(1, (n - .23) * shape * 3.4))
    const light = Math.max(0, Math.min(1, (1 - v) * .45 + n * .7))
    const i = (y * width + x) * 4
    data[i] = 97 + light * 120; data[i + 1] = 109 + light * 115; data[i + 2] = 133 + light * 100
    data[i + 3] = smooth(density) * 230
  }
  return data
}

export type LandscapeAtmosphereFrame = { width: number; height: number; horizon: number; seconds: number; cloudCount: number; moteCount: number }
export function sampleLandscapeAtmosphere(logicalWidth: number, logicalHeight: number, time: number,
  reduced: boolean, quality: string, out: LandscapeAtmosphereFrame) {
  // Inverse of the game's clockwise CSS rotation: art stays upright on screen.
  out.width = Math.max(1, logicalHeight); out.height = Math.max(1, logicalWidth)
  out.horizon = out.height * .685
  out.seconds = reduced ? 0 : Math.max(0, time / 1000)
  out.cloudCount = quality === 'low' ? 4 : quality === 'medium' ? 6 : 8
  out.moteCount = reduced ? 0 : quality === 'low' ? 18 : quality === 'medium' ? 42 : 72
  return out
}
