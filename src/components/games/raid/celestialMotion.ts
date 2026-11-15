const unit = (n: number) => n - Math.floor(n)
const mod = (n: number, span: number) => ((n % span) + span) % span
export type CelestialSample = { x: number; y: number; size: number; alpha: number }
/** Independent slow twinkles avoid synchronized flashing or global brightness pulses. */
export function sampleCelestialStar(index: number, width: number, height: number, seconds: number,
  atmospheric: boolean, reduced: boolean, out: CelestialSample) {
  const seed = unit(index * .61803398875 + .071), phase = index * 2.399963
  const t = reduced ? 0 : Math.max(0, seconds)
  const period = 3.2 + unit(index * .337) * 5.4
  const wave = .5 + .5 * Math.sin(t * Math.PI * 2 / period + phase)
  const twinkle = wave * wave * (.82 + Math.sin(t * .39 + index) * .18)
  out.x = atmospheric ? width * (.025 + seed * .95) : mod(seed * (width + 40) - t * width * (.0007 + index % 3 * .0005), width + 40) - 20
  out.y = height * (atmospheric ? .055 + unit(index * .414213 + .11) * .45 : .025 + unit(index * .414213 + .11) * .95)
  out.size = Math.max(10, Math.min(24, Math.min(width, height) * .025)) * (.65 + unit(index * .729) * .7)
  out.alpha = (atmospheric ? .1 : .13) + twinkle * (atmospheric ? .54 : .58)
  return out
}

/** Scene-local transport; paused time and hidden intervals cannot create a resume leap. */
export class CelestialClock {
  seconds = 0
  private previous: number | null = null
  advance(time: number, paused: boolean, reduced: boolean) {
    if (this.previous === null) this.seconds = Math.max(0, time / 1000)
    else if (!paused && !reduced) this.seconds += Math.max(0, Math.min(50, time - this.previous)) / 1000
    this.previous = time
    return reduced ? 0 : this.seconds
  }
  hide() { this.previous = null }
}
