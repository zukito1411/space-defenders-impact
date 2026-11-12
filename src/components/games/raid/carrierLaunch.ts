/** All launch choreography is sampled from simulation time, never a DOM timer. */
export const CARRIER_LAUNCH_SECONDS = 6.4
export const CARRIER_IGNITION_SECONDS = 1.6
const unit = (n: number) => Math.max(0, Math.min(1, n))
const smooth = (n: number) => { const p = unit(n); return p * p * (3 - 2 * p) }

export function sampleCarrierLaunch(age: number, landscape: boolean, reducedMotion = false, compact = false) {
  const t = Math.max(0, Number.isFinite(age) ? age : 0)
  const ignition = unit(t / CARRIER_IGNITION_SECONDS)
  const flight = unit((t - CARRIER_IGNITION_SECONDS) / 3)
  const settle = smooth((t - 4.6) / 1.8)
  const dockX = landscape ? 58 : 50
  const dockY = landscape ? 44 : compact ? 55 : 65
  // Acceleration clears the aperture; the camera then catches up to combat framing.
  const forward = flight * flight
  const flightY = dockY + (45 - dockY) * forward
  const exited = t >= 4.6
  return {
    x: dockX + (50 - dockX) * settle,
    y: reducedMotion ? (t < 1.6 ? dockY : 82) : flightY + (82 - flightY) * settle,
    scale: reducedMotion ? (t < 1.6 ? 1.65 : 1) : 1.65 + (1 - 1.65) * smooth((t - 3.2) / 3.2),
    engine: smooth(ignition),
    release: smooth((t - .8) / .8),
    // Move the opaque carrier out of frame. Never dissolve planets over its walls.
    backdrop: reducedMotion ? (t < 1.6 ? 1 : 0) : (exited ? 0 : 1),
    shift: reducedMotion ? 0 : 1.3 * forward,
    phase: t < 1.6 ? 'ignition' : t < 4.6 ? 'launch' : t < CARRIER_LAUNCH_SECONDS ? 'clear' : 'flight',
    done: t >= CARRIER_LAUNCH_SECONDS,
  } as const
}

/** Four articulated service contacts. These are equipment, not a second hull. */
export function drawCarrierClamps(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, release: number) {
  if (release >= 1) return
  ctx.save()
  ctx.globalAlpha *= 1 - release
  ctx.lineCap = 'square'
  for (const side of [-1, 1]) for (const end of [-1, 1]) {
    const sx = x + side * size * (.4 + release * .28)
    const sy = y + end * size * .24
    ctx.strokeStyle = '#0c1c27'; ctx.lineWidth = Math.max(5, size * .065)
    ctx.beginPath(); ctx.moveTo(sx + side * size * .28, sy + end * size * .1); ctx.lineTo(sx, sy); ctx.lineTo(sx - side * size * .08, sy); ctx.stroke()
    ctx.strokeStyle = '#77929b'; ctx.lineWidth = Math.max(1, size * .018); ctx.stroke()
    ctx.fillStyle = '#ffc16c'; ctx.fillRect(sx - size * .025, sy - size * .025, size * .05, size * .05)
  }
  ctx.restore()
}
