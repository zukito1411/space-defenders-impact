/** Optional HUD telemetry. Sampling allocates nothing; sorting runs once per report. */
export class RaidFrameTimings {
  private readonly samples = new Float32Array(256)
  private readonly sorted = new Float32Array(256)
  private count = 0
  private cursor = 0

  sample(milliseconds: number) {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) return
    this.samples[this.cursor] = milliseconds
    this.cursor = (this.cursor + 1) % this.samples.length
    this.count = Math.min(this.count + 1, this.samples.length)
  }

  percentiles() {
    if (!this.count) return { p50: 0, p95: 0, p99: 0 }
    const values = this.sorted.subarray(0, this.count)
    values.set(this.samples.subarray(0, this.count))
    values.sort()
    return {
      p50: values[Math.ceil(this.count * 0.5) - 1],
      p95: values[Math.ceil(this.count * 0.95) - 1],
      p99: values[Math.ceil(this.count * 0.99) - 1],
    }
  }

  reset() { this.count = 0; this.cursor = 0 }
}
