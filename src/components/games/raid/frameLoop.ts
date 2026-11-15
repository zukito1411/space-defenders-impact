export function startRaidFrameLoop(
  tick: FrameRequestCallback,
  onError: (error: unknown) => void,
  onSuspend: () => void,
  onResume: () => void,
) {
  let pending: number | null = null
  let active = true

  const schedule = () => {
    if (active && !document.hidden && pending === null) pending = requestAnimationFrame(run)
  }
  const run: FrameRequestCallback = time => {
    pending = null
    if (!active || document.hidden) return
    try {
      tick(time)
    } catch (error) {
      onError(error)
    } finally {
      schedule()
    }
  }
  const cancel = () => {
    if (pending !== null) cancelAnimationFrame(pending)
    pending = null
  }
  const resume = () => {
    if (!active || document.hidden || pending !== null) return
    onResume()
    schedule()
  }
  const visibilityChanged = () => {
    if (document.hidden) {
      cancel()
      onSuspend()
    } else resume()
  }

  document.addEventListener('visibilitychange', visibilityChanged)
  window.addEventListener('pageshow', resume)
  window.addEventListener('focus', resume)
  schedule()
  return () => {
    active = false
    cancel()
    document.removeEventListener('visibilitychange', visibilityChanged)
    window.removeEventListener('pageshow', resume)
    window.removeEventListener('focus', resume)
  }
}
