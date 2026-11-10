import { Rectangle, Texture } from 'pixi.js'
import { extractSceneryBloom, shadeSceneryAtlas } from './sceneryMaterial'

/** Bake self-shadowing and a 512px bright-pass atlas while the loading screen is up. */
export function bakeSceneryLighting(root: Texture, shadePlanets = true): { surface: Texture; bloom: Texture[] } | null {
  if (typeof document === 'undefined') return null
  const surface = document.createElement('canvas')
  surface.width = root.width
  surface.height = root.height
  const ctx = surface.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  try {
    ctx.drawImage(root.source.resource as CanvasImageSource, 0, 0, surface.width, surface.height)
    const image = ctx.getImageData(0, 0, surface.width, surface.height)
    if (shadePlanets) shadeSceneryAtlas(image.data, surface.width, surface.height)
    ctx.putImageData(image, 0, 0)
    const lit = Texture.from(surface)
    lit.source.autoGenerateMipmaps = false
    lit.source.scaleMode = 'linear'
    // Reuse the scratch pixel buffer after uploading the opaque surface canvas.
    extractSceneryBloom(image.data)
    const bright = document.createElement('canvas')
    bright.width = surface.width
    bright.height = surface.height
    const brightContext = bright.getContext('2d')
    if (!brightContext) return { surface: lit, bloom: [] }
    brightContext.putImageData(image, 0, 0)
    const glow = document.createElement('canvas')
    glow.width = 512
    glow.height = shadePlanets ? 512 : 256
    const bloomCount = shadePlanets ? 4 : 2
    const glowContext = glow.getContext('2d')
    if (!glowContext) return { surface: lit, bloom: [] }
    const sourceTile = surface.width / 2
    // Each 256px cell has a 192px footprint plus enough padding for the blur.
    glowContext.filter = 'blur(7px)'
    for (let i = 0; i < bloomCount; i++) {
      const x = (i % 2) * 256, y = Math.floor(i / 2) * 256
      glowContext.drawImage(bright, (i % 2) * sourceTile + 24, Math.floor(i / 2) * sourceTile + 24,
        sourceTile - 48, sourceTile - 48, x + 32, y + 32, 192, 192)
    }
    const texture = Texture.from(glow)
    texture.source.scaleMode = 'linear'
    texture.source.autoGenerateMipmaps = false
    return { surface: lit, bloom: Array.from({ length: bloomCount }, (_, i) => new Texture({ source: texture.source,
      frame: new Rectangle((i % 2) * 256, Math.floor(i / 2) * 256, 256, 256) })) }
  } catch { return null } // optional lighting cannot prevent original art from loading
}
