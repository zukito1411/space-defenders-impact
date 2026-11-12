/** Shared by actual player entry, including checkpoint and co-op launches. */
export function sampleLaunchFlight(progress: number, reducedMotion: boolean) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0))
  return reducedMotion ? 1 : 1 - (1 - p) ** 3
}
