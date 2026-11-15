import { bakeSceneryLighting } from './sceneryLighting'
import { Assets, Rectangle, Texture } from 'pixi.js'
import { getPublicAssetUrl } from '../sound'
export const COSMOS_ART_URLS = ['assets/raid-fx/cosmos-regions-remaster-v2.webp', 'assets/raid-fx/cosmos-landmarks-remaster-v2.webp', 'assets/raid-fx/destination-worlds-remaster-v2.webp'].map(getPublicAssetUrl)
export const COSMOS_FALLBACK_ART_URLS = ['assets/raid-fx/cosmos-regions-v1.webp', 'assets/raid-fx/cosmos-landmarks-v1.webp', 'assets/raid-fx/destination-worlds-v1.webp'].map(getPublicAssetUrl)
export const COSMOS_BACKDROP_FALLBACK_URL = COSMOS_FALLBACK_ART_URLS[0]
const frames: Texture[][] = [[], [], []]
let bloomFrames: Texture[] = []
let journeyBloomFrames: Texture[] = []
let pending: Promise<void> | null = null
/** Three 2048px remasters with proportional frame gutters and original-art fallbacks. */
export function preloadCosmosArt(): Promise<void> {
  if (!pending) pending = Promise.all(COSMOS_ART_URLS.map(async (url, atlas) => {
    try {
      let root: Texture
      try { root = await Assets.load<Texture>(url) }
      catch (error) {
        root = await Assets.load<Texture>(COSMOS_FALLBACK_ART_URLS[atlas])
      }
      if (atlas >= 1) {
        const lighting = bakeSceneryLighting(root, atlas === 1)
        if (lighting) {
          root = lighting.surface
          if (atlas === 1) bloomFrames = lighting.bloom
          else journeyBloomFrames = lighting.bloom
        }
      }
      root.source.scaleMode = 'linear'
      // Avoid mip bleed across atlas cells and keep the GPU allocation bounded.
      root.source.autoGenerateMipmaps = false
      const tile = root.width / 2
      const scale = root.width / 1024
      const inset = (atlas === 0 ? 4 : 24) * scale
      frames[atlas] = Array.from({ length: 4 }, (_, i) => {
        const gutter = atlas === 2 && i >= 2 ? 4 * scale : inset
        return new Texture({ source: root.source,
          frame: new Rectangle((i % 2) * tile + gutter, Math.floor(i / 2) * tile + gutter, tile - gutter * 2, tile - gutter * 2) })
      })
    } catch { /* Preserve original scenery when assets are unavailable. */ }
  })).then(() => {})
  return pending
}
export const getCosmosBackdrop = (index: number) => frames[0][index]
export const getCosmosLandmark = (index: number) => frames[1][index]

export const getCosmosBloom = (index: number) => bloomFrames[index]

export const getJourneyPlanet = (index: number) => frames[2][index]
export const getJourneySurface = (index: number) => frames[2][index + 2]
export const getJourneyBloom = (index: number) => journeyBloomFrames[index]
