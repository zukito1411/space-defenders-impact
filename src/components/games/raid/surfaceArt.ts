import { Assets, Texture } from 'pixi.js'
import { getPublicAssetUrl } from '../sound'
export const SURFACE_ART_URLS = ['assets/raid-fx/terrain-water-v1.webp', 'assets/raid-fx/terrain-basalt-v1.webp'].map(getPublicAssetUrl)
const terrain: Array<Texture | undefined> = []
let pending: Promise<void> | null = null
/** Two shared POT tiles, decoded once; no texture work in the frame loop. */
export function preloadSurfaceArt(): Promise<void> {
  if (!pending) pending = Promise.all(SURFACE_ART_URLS.map(async (url, index) => {
    try {
      const texture = await Assets.load<Texture>(url)
      texture.source.autoGenerateMipmaps = true
      texture.source.scaleMode = 'linear'
      texture.source.style.addressMode = 'repeat'
      terrain[index] = texture
    } catch { /* Existing destination plates remain a fallback. */ }
  })).then(() => {})
  return pending
}
export const getSurfaceTerrain = (index: number) => terrain[index]
