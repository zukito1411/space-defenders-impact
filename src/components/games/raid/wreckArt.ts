import { Rectangle, Texture } from 'pixi.js'
import { getPublicAssetUrl } from '../sound'
import type { CanvasSpriteEntry } from './assets'
import { WRECK_ATLAS_PATHS, WRECK_ATLAS_FRAME } from './wreckVariety'

export const WRECK_ART_URLS = WRECK_ATLAS_PATHS.map(getPublicAssetUrl)
const images: Array<{ image: HTMLImageElement; ready: Promise<boolean> }> = []
const canvasFrames: CanvasSpriteEntry[] = []
const textures: Texture[] = []
let pending: Promise<void> | undefined
function atlasImage(atlas: number) {
  if (!images[atlas]) {
    const image = new Image()
    const ready = new Promise<boolean>((resolve) => {
      image.onload = () => resolve(image.naturalWidth === 1024 && image.naturalHeight === 1024)
      image.onerror = () => resolve(false)
    })
    images[atlas] = { image, ready }
    image.src = WRECK_ART_URLS[atlas]
  }
  return images[atlas]
}
function rect(index: number) {
  const cell = index % 4
  return new Rectangle((cell % 2) * 512 + 24, Math.floor(cell / 2) * 512 + 24, WRECK_ATLAS_FRAME, WRECK_ATLAS_FRAME)
}
/** Two shared decodes and two GPU sources; no canvas extraction or texture allocation per frame. */
export function preloadWreckArt() {
  if (!pending) pending = Promise.all(WRECK_ART_URLS.map(async (_, atlas) => {
    const source = atlasImage(atlas)
    if (!await source.ready) return
    try {
      const root = Texture.from(source.image)
      root.source.scaleMode = 'linear'
      root.source.autoGenerateMipmaps = false
      for (let i = atlas * 4; i < atlas * 4 + 4; i++) {
        textures[i] = new Texture({ source: root.source, frame: rect(i) })
      }
    } catch { /* Keep legacy scenery if this source cannot be uploaded. */ }
  })).then(() => {})
  return pending
}
export const getWreckTexture = (index: number) => textures[index]

export function getWreckCanvasSprite(index: number): CanvasSpriteEntry | undefined {
  if (index < 0 || index >= 8) return undefined
  if (canvasFrames[index]) return canvasFrames[index]
  const source = atlasImage(Math.floor(index / 4))
  const entry: CanvasSpriteEntry = { cacheKey: `wreck-atlas-v1:${index}`, image: source.image, loaded: false, ready: Promise.resolve() }
  entry.ready = source.ready.then((ok) => {
    if (!ok) return
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = WRECK_ATLAS_FRAME
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const box = rect(index)
    ctx.drawImage(source.image, box.x, box.y, box.width, box.height, 0, 0, canvas.width, canvas.height)
    entry.processedImage = canvas
    entry.loaded = true
  })
  canvasFrames[index] = entry
  return entry
}
