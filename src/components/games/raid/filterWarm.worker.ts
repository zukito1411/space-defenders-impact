/**
 * Off-main-thread sprite filter rasterization.
 * Pure image preparation; this worker never owns gameplay state, collision,
 * networking, DOM rendering or the Pixi renderer.
 */
type FilterWarmBatch = {
  type: 'batch'
  spriteKey: string
  bitmap: ImageBitmap
  width: number
  height: number
  filters: string[]
}
type Reply =
  | { type: 'result'; spriteKey: string; width: number; height: number; filter: string; bitmap: ImageBitmap }
  | { type: 'done' }
  | { type: 'error' }

function send(message: Reply, transfer: Transferable[] = []) {
  ;(self as unknown as { postMessage: (value: Reply, transfer: Transferable[]) => void }).postMessage(message, transfer)
}

self.onmessage = (event: MessageEvent<FilterWarmBatch>) => {
  const job = event.data
  if (job.type !== 'batch') return
  try {
    const width = Math.max(1, Math.round(job.width))
    const height = Math.max(1, Math.round(job.height))
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    // Not every Android WebView implements OffscreenCanvas 2D filters.
    if (!ctx || !('filter' in ctx)) throw new Error('OffscreenCanvas filter unsupported')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    for (const filter of job.filters) {
      ctx.clearRect(0, 0, width, height)
      ctx.filter = filter
      ctx.drawImage(job.bitmap, 0, 0, width, height)
      ctx.filter = 'none'
      const filtered = canvas.transferToImageBitmap()
      send({ type: 'result', spriteKey: job.spriteKey, width, height, filter, bitmap: filtered }, [filtered])
    }
    send({ type: 'done' })
  } catch {
    send({ type: 'error' })
  } finally {
    job.bitmap.close()
  }
}
