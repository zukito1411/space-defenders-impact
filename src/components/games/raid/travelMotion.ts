/** Continuous cosmetic travel; independent of gameplay coordinates and hitboxes. */
export class RaidTravelMotion {
  private lastTime: number | null = null
  far = 0
  near = 0
  rush = 0
  x = 0
  y = 0

  update(time: number, rush: number, speedScale: number, playerX: number, playerY: number) {
    const dt = this.lastTime === null ? 0 : Math.max(0, Math.min(0.1, (time - this.lastTime) / 1000))
    this.lastTime = time
    const blend = 1 - Math.exp(-dt * 4)
    const targetRush = Math.max(0, Math.min(1, rush))
    // Exact integral of exponential acceleration keeps travel consistent at
    // 30/60/120Hz, including a stage-clear acceleration/deceleration.
    const rushIntegral = targetRush * dt + (this.rush - targetRush) * blend / 4
    this.far += (15 * dt + 42 * rushIntegral) * speedScale
    this.near += (72 * dt + 170 * rushIntegral) * speedScale
    this.rush += (targetRush - this.rush) * blend
    this.x += (Math.max(-1, Math.min(1, (playerX - 50) / 50)) - this.x) * blend
    this.y += (Math.max(-1, Math.min(1, (playerY - 65) / 50)) - this.y) * blend
  }
}
