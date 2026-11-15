import { Assets, Rectangle, Texture } from 'pixi.js'
import { getPublicAssetUrl } from '../sound'

export const CELESTIAL_ART_URLS = [getPublicAssetUrl('assets/raid-fx/celestial-detail-atlas-v1.webp')]
const frames: Texture[] = []
let pending: Promise<void> | null = null
/** One shared RGBA source: photographic star, cyan gas, violet gas and amber dust. */
export function preloadCelestialArt() {
  if (!pending) pending = Assets.load<Texture>(CELESTIAL_ART_URLS[0]).then(atlas => {
    atlas.source.scaleMode = 'linear'
    atlas.source.autoGenerateMipmaps = false
    for (let cell = 0; cell < 4; cell++) frames[cell] = new Texture({ source: atlas.source,
      frame: new Rectangle(cell % 2 * atlas.width / 2, Math.floor(cell / 2) * atlas.height / 2, atlas.width / 2, atlas.height / 2) })
  }).catch(() => { /* Existing scenery remains available if the optional detail atlas fails. */ })
  return pending
}
export const getCelestialArt = (index: number) => frames[index]
