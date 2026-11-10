const unit = (value: number) => Math.max(0, Math.min(1, value))

/** Presentation only: quick ignition followed by a longer ember/smoke tail. */
export function impactFrameProgress(progress: number) {
  const p = unit(progress)
  return p < 0.38 ? p * (0.5 / 0.38) : 0.5 + (p - 0.38) * (0.5 / 0.62)
}
export function impactScale(progress: number) {
  return 0.66 + (1 - Math.pow(1 - unit(progress), 3)) * 0.56
}
export function impactAlpha(progress: number) {
  return 1 - Math.pow(unit(progress), 1.65)
}

export type FlightPose = { time: number; x: number; bank: number }
/** Responsive cosmetic bank; reset on teleports/resume rather than snapping. */
export function updateFlightPose(pose: FlightPose, time: number, x: number) {
  const dt = (time - pose.time) / 1000
  if (dt <= 0 || dt > 0.15 || Math.abs(x - pose.x) > 12) {
    pose.bank = 0
  } else {
    const target = Math.max(-1, Math.min(1, (x - pose.x) / dt / 48)) * 0.14
    pose.bank += (target - pose.bank) * (1 - Math.exp(-dt * 12))
  }
  pose.time = time
  pose.x = x
  return pose.bank
}

/** Readable explosions inside the existing bounded ripple/sprite budget. */
export function explosionDiameter(size: number, visualScale: number, progress: number) {
  return Math.min(180, Math.max(56, size * 8.8)) * visualScale * impactScale(progress)
}
export function rippleLifetime(size: number, warm: boolean) {
  return warm && size >= 7 ? size >= 18 ? 1.25 : 0.9 : 0.38
}
export function rippleReplacement(ripples: readonly {size: number}[], incomingSize: number) {
  let candidate = 0
  for (let i = 1; i < ripples.length; i++) if (ripples[i].size < ripples[candidate].size) candidate = i
  return ripples.length && incomingSize < ripples[candidate].size * 0.7 ? -1 : candidate
}
