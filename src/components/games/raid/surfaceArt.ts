import { Assets, Rectangle, Texture } from 'pixi.js'
import { getPublicAssetUrl } from '../sound'
export const SURFACE_ART_URLS = ['assets/raid-fx/terrain-water-v1.webp', 'assets/raid-fx/terrain-basalt-v1.webp', 'assets/raid-fx/planet-weather-atlas-v1.webp'].map(getPublicAssetUrl)
const terrain: Array<Texture | undefined> = []
const weather: Array<Texture | undefined> = []
let pending: Promise<void> | null = null
/** Two terrain tiles and one shared weather atlas, decoded once during loading. */
export function preloadSurfaceArt(): Promise<void> {
  if (!pending) pending = Promise.all(SURFACE_ART_URLS.map(async (url, index) => {
    try {
      const texture = await Assets.load<Texture>(url)
      texture.source.autoGenerateMipmaps = true
      texture.source.scaleMode = 'linear'
      if (index < 2) {
        texture.source.style.addressMode = 'repeat'
        terrain[index] = texture
      } else for (let cell = 0; cell < 4; cell++) weather[cell] = new Texture({ source: texture.source,
        frame: new Rectangle(cell % 2 * texture.width / 2, Math.floor(cell / 2) * texture.height / 2, texture.width / 2, texture.height / 2) })
    } catch { /* Existing destination plates remain a fallback. */ }
  })).then(() => {})
  return pending
}
export const getSurfaceTerrain = (index: number) => terrain[index]
export const getPlanetWeatherArt = (index: number) => weather[index]
