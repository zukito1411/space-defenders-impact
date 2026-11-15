import { Container, Sprite, Texture } from 'pixi.js'
import { getCelestialArt } from './celestialArt'
import { sampleCelestialStar } from './celestialMotion'
import type { CelestialSample } from './celestialMotion'

const mod = (n: number, span: number) => ((n % span) + span) % span
/** All added detail comes from transparent raster art; existing scenery is untouched. */
export class CelestialScenery {
  readonly root = new Container()
  readonly nebulaRoot = new Container()
  private readonly wisps = Array.from({ length: 3 }, () => new Sprite(Texture.WHITE))
  private readonly stars = Array.from({ length: 64 }, () => new Sprite(Texture.WHITE))
  private readonly dust = Array.from({ length: 12 }, () => new Sprite(Texture.WHITE))
  private readonly sample: CelestialSample = { x: 0, y: 0, size: 0, alpha: 0 }
  private region = -1
  private entered = 0
  constructor() {
    this.root.eventMode = 'none'; this.root.visible = false
    this.nebulaRoot.eventMode = 'none'; this.nebulaRoot.visible = false
    this.nebulaRoot.addChild(...this.wisps)
    this.root.addChild(...this.stars, ...this.dust)
    for (const sprite of [...this.wisps, ...this.stars, ...this.dust]) {
      sprite.anchor.set(.5); sprite.visible = false
    }
    for (const sprite of [...this.stars, ...this.dust]) sprite.blendMode = 'add'
  }
  update(width: number, height: number, seconds: number, region: number, quality: string, reduced: boolean, atmosphere = false, warm = false) {
    const star = getCelestialArt(0)
    this.root.visible = !!star
    this.nebulaRoot.visible = !!star && !atmosphere
    if (!star) return
    const t = reduced ? 0 : seconds
    if (this.region !== region || t < this.entered) { this.region = region; this.entered = t }
    const fade = reduced ? 1 : Math.min(1, Math.max(0, (t - this.entered) / 2.5))
    const count = atmosphere ? quality === 'low' ? 14 : quality === 'medium' ? 24 : 40
      : quality === 'low' ? 20 : quality === 'medium' ? 40 : 64
    for (let i = 0; i < this.stars.length; i++) {
      const sprite = this.stars[i]; sprite.visible = i < count
      if (!sprite.visible) continue
      const p = sampleCelestialStar(i, width, height, t, atmosphere, reduced, this.sample)
      sprite.texture = star; sprite.position.set(p.x, p.y)
      sprite.width = p.size; sprite.height = p.size
      sprite.alpha = p.alpha * (atmosphere ? 1 : .8 + fade * .2)
      sprite.tint = atmosphere ? warm ? 0xffd9bc : 0xd9e9ff : i % 9 === 0 ? 0xffd9b0 : 0xe3edff
    }
    for (let i = 0; i < this.wisps.length; i++) {
      const sprite = this.wisps[i], art = getCelestialArt(1 + (region + i) % 3)
      sprite.visible = !atmosphere && !!art && i < (quality === 'low' ? 1 : quality === 'medium' ? 2 : 3)
      if (!sprite.visible || !art) continue
      sprite.texture = art
      // Edge-weighted composition preserves the central combat corridor.
      sprite.position.set(width * (i % 2 ? .92 : .07) + Math.sin(t * .014 + i * 2.3) * width * .05,
        height * (.18 + i * .32) + Math.cos(t * .019 + i) * height * .035)
      const breath = 1 + Math.sin(t * .043 + i * 1.7) * .025
      sprite.width = width * (.58 + i * .04) * breath; sprite.height = height * (.38 + i * .05) / breath
      sprite.rotation = Math.sin(t * .011 + i) * .035
      sprite.alpha = (.12 + Math.sin(t * .067 + i * 1.3) * .022) * fade
      sprite.tint = [0xb5cced, 0xdfc6b6, 0xb7c9ec, 0xd7c3ef][region % 4]
    }
    for (let i = 0; i < this.dust.length; i++) {
      const sprite = this.dust[i]
      sprite.visible = !atmosphere && !reduced && i < (quality === 'low' ? 3 : quality === 'medium' ? 6 : 12)
      if (!sprite.visible) continue
      sprite.texture = star
      sprite.position.set(mod(width * (i * .618 % 1) - t * width * .004, width), height * (.03 + (i * .233 % .94)))
      const size = Math.max(3, Math.min(width, height) * .007)
      sprite.width = size; sprite.height = size * .75
      sprite.alpha = (.08 + Math.sin(t * .22 + i) * .035) * fade
      sprite.tint = region === 1 ? 0xe8bc8e : 0x9bbfe9
    }
  }
  hide() { this.root.visible = false; this.nebulaRoot.visible = false }
  destroy() { this.root.destroy({ children: true }); this.nebulaRoot.destroy({ children: true }) }
}
