/** Hand the pre-JavaScript studio screen to the mounted menu once its artwork settles. */
export function startStudioSplash(onComplete: () => void) {
  const splash = document.getElementById('startup-splash')
  const root = document.getElementById('root')
  if (!splash) { root?.removeAttribute('inert'); onComplete(); return }
  const logo = splash.querySelector<HTMLImageElement>('img')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let disposed = false, revealing = false, pending = 0
  let minimumTimer: number | undefined, removalTimer: number | undefined, paintFrame: number | undefined
  const detach: Array<() => void> = []
  root?.setAttribute('inert', '')

  const removeListeners = () => { for (const remove of detach) remove(); detach.length = 0 }
  const reveal = (skipMinimum = false) => {
    if (disposed || revealing) return
    if (!skipMinimum) {
      if (!logo?.complete || pending > 0) return
      const shownAt = Number(splash.dataset.logoReadyAt ?? performance.now())
      const remaining = 1400 - (performance.now() - shownAt)
      if (remaining > 0) { window.clearTimeout(minimumTimer); minimumTimer = window.setTimeout(() => reveal(), remaining); return }
    }
    revealing = true
    window.clearTimeout(deadline); window.clearTimeout(minimumTimer)
    // Ignore unfinished optional artwork; late decodes cannot revive the intro.
    removeImageListeners()
    paintFrame = requestAnimationFrame(() => {
      if (disposed) return
      splash.classList.add('is-complete')
      splash.setAttribute('aria-hidden', 'true')
      removalTimer = window.setTimeout(() => {
        if (disposed) return
        splash.remove(); root?.removeAttribute('inert'); removeListeners(); onComplete()
      }, reduced ? 0 : 450)
    })
  }
  const imageListeners: Array<() => void> = []
  const removeImageListeners = () => { for (const remove of imageListeners) remove(); imageListeners.length = 0 }
  const watch = (image: HTMLImageElement, isLogo = false) => {
    if (revealing) return
    if (image.complete && image.naturalWidth > 0) {
      if (isLogo && !splash.dataset.logoReadyAt) splash.dataset.logoReadyAt = String(performance.now())
      return
    }
    if (isLogo && image.complete) { reveal(true); return }
    pending++
    let settled = false
    const finish = () => {
      if (disposed || revealing || settled) return
      settled = true
      image.removeEventListener('load', loaded); image.removeEventListener('error', failed)
      pending--
      if (isLogo) splash.dataset.logoReadyAt ||= String(performance.now())
      reveal()
    }
    const loaded = () => { void image.decode().catch(() => {}).then(finish) }
    const failed = () => { if (isLogo) reveal(true); else finish() }
    image.addEventListener('load', loaded); image.addEventListener('error', failed)
    imageListeners.push(() => { image.removeEventListener('load', loaded); image.removeEventListener('error', failed) })
  }
  // A missing optional menu image must never trap an installed/offline game.
  const deadline = window.setTimeout(() => reveal(true), 5000)
  if (logo) watch(logo, true)
  for (const property of ['--ui-hangar-art', '--ui-console-texture']) {
    const value = root?.style.getPropertyValue(property).trim()
    const url = value?.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
    if (!url) continue
    const image = new Image(); image.src = url; watch(image)
  }
  const blockPointer = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); reveal(true) }
  const blockKey = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    event.preventDefault(); event.stopImmediatePropagation()
    if (event.type === 'keydown' && ['Enter', ' ', 'Escape'].includes(event.key)) reveal(true)
  }
  for (const name of ['pointerdown', 'click'] as const) {
    window.addEventListener(name, blockPointer, true)
    detach.push(() => window.removeEventListener(name, blockPointer, true))
  }
  for (const name of ['keydown', 'keyup'] as const) {
    window.addEventListener(name, blockKey, true)
    detach.push(() => window.removeEventListener(name, blockKey, true))
  }
  reveal()
  return () => {
    disposed = true; window.clearTimeout(deadline); window.clearTimeout(minimumTimer); window.clearTimeout(removalTimer)
    if (paintFrame !== undefined) cancelAnimationFrame(paintFrame)
    removeImageListeners(); removeListeners()
  }
}
