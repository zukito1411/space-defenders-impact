/** All launch choreography is sampled from simulation time, never a DOM timer. */
export const CARRIER_BOARDING_SECONDS = 2.8
export const CARRIER_CLEAR_SECONDS = 1
export const CARRIER_IGNITION_START = CARRIER_BOARDING_SECONDS + CARRIER_CLEAR_SECONDS
export const CARRIER_DEPARTURE_START = CARRIER_IGNITION_START + 1.6
export const CARRIER_EXIT_SECONDS = CARRIER_DEPARTURE_START + 3
export const CARRIER_LAUNCH_SECONDS = CARRIER_DEPARTURE_START + 4.8
export const CARRIER_IGNITION_SECONDS = 1.6
export const MESIAH_ENTRY_SECONDS = 2.4
const unit = (n: number) => Math.max(0, Math.min(1, n))
const smooth = (n: number) => { const p = unit(n); return p * p * (3 - 2 * p) }

export function sampleCarrierLaunch(age: number, landscape: boolean, reducedMotion = false, compact = false, underway = false) {
  const t = Math.max(0, Number.isFinite(age) ? age : 0)
  if (underway) {
    const entry = smooth(t / MESIAH_ENTRY_SECONDS)
    const cruiseY = landscape ? 40 : compact ? 53 : 60
    return {
      x: landscape ? 58 - 8 * entry : 50,
      y: cruiseY + (82 - cruiseY) * entry,
      scale: 1, engine: 1, release: 1, backdrop: 0, shift: 0,
      phase: t < MESIAH_ENTRY_SECONDS ? 'clear' : 'flight',
      done: t >= MESIAH_ENTRY_SECONDS,
    } as const
  }
  const ignition = unit((t - CARRIER_IGNITION_START) / CARRIER_IGNITION_SECONDS)
  const flight = unit((t - CARRIER_DEPARTURE_START) / 3)
  const settle = smooth((t - CARRIER_DEPARTURE_START - 3) / 1.8)
  const dockX = landscape ? 58 : 50
  const dockY = landscape ? 44 : compact ? 55 : 65
  // Acceleration clears the aperture; the camera then catches up to combat framing.
  const forward = flight * flight
  const flightY = dockY + ((landscape ? 32 : 40) - dockY) * forward
  const exited = t >= CARRIER_EXIT_SECONDS
  return {
    x: dockX + (50 - dockX) * settle,
    y: reducedMotion ? (t < CARRIER_DEPARTURE_START ? dockY : 82) : flightY + (82 - flightY) * settle,
    scale: reducedMotion ? (t < CARRIER_DEPARTURE_START ? 1.65 : 1) : 1.65 + (1 - 1.65) * smooth((t - CARRIER_DEPARTURE_START - 1.6) / 3.2),
    engine: smooth(ignition),
    release: smooth((t - CARRIER_IGNITION_START - .8) / .8),
    // Move the opaque carrier out of frame. Never dissolve planets over its walls.
    backdrop: reducedMotion ? (t < CARRIER_DEPARTURE_START ? 1 : 0) : (exited ? 0 : 1),
    shift: reducedMotion ? 0 : 1.3 * forward,
    phase: t < CARRIER_BOARDING_SECONDS ? 'boarding' : t < CARRIER_IGNITION_START ? 'clearing' : t < CARRIER_DEPARTURE_START ? 'ignition' : t < CARRIER_EXIT_SECONDS ? 'launch' : t < CARRIER_LAUNCH_SECONDS ? 'clear' : 'flight',
    done: t >= CARRIER_LAUNCH_SECONDS,
  } as const
}
