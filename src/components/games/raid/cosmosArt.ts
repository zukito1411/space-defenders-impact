import { bakeSceneryLighting } from './sceneryLighting'
import { Assets, Rectangle, Texture } from 'pixi.js'
import { getPublicAssetUrl } from '../sound'
export const COSMOS_ART_URLS = ['assets/raid-fx/cosmos-regions-v1.webp', 'assets/raid-fx/cosmos-landmarks-v1.webp'].map(getPublicAssetUrl)
const frames: Texture[][] = [[], []]
let bloomFrames: Texture[] = []
let pending: Promise<void> | null = null
/** Two primary 1024px sources plus a 512px local bloom atlas; allocated once at load. */
export function preloadCosmosArt(): Promise<void> {
  if (!pending) pending = Promise.all(COSMOS_ART_URLS.map(async (url, atlas) => {
    try {
      let root = await Assets.load<Texture>(url)
      if (atlas === 1) {
        const lighting = bakeSceneryLighting(root)
        if (lighting) { root = lighting.surface; bloomFrames = lighting.bloom }
      }
      root.source.scaleMode = 'linear'
      // Avoid mip bleed across atlas cells and keep the GPU allocation bounded.
      root.source.autoGenerateMipmaps = false
      const tile = root.width / 2
      const inset = atlas === 0 ? 4 : 24
      frames[atlas] = Array.from({ length: 4 }, (_, i) => new Texture({ source: root.source,
        frame: new Rectangle((i % 2) * tile + inset, Math.floor(i / 2) * tile + inset, tile - inset * 2, tile - inset * 2) }))
    } catch { /* Preserve original scenery when assets are unavailable. */ }
  })).then(() => {})
  return pending
}
export const getCosmosBackdrop = (index: number) => frames[0][index]
export const getCosmosLandmark = (index: number) => frames[1][index]

export const getCosmosBloom = (index: number) => bloomFrames[index]
