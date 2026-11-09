import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import {
  getCanvasSpriteDimensions,
  getEnemyCanvasSize,
  getNormalAlienCanvasSprite,
} from './assets'
import type { CachedCanvasDrawSource } from './assets'
import { getCachedProjectileOrbSprite, getCachedProjectileTrailSprite, getCachedSpriteGlow } from './utils'
import type { Enemy, Ripple, Shot, Spark } from './types'
import { raidObjectInView } from './visibility'
import type { RaidVisibilityBounds } from './visibility'

export type RaidGpuForegroundFrame = {
  width: number
  height: number
  dpr: number
  visualScale: number
  time: number
  bounds: RaidVisibilityBounds
  drawAdvancedShotFx: boolean
  drawRipples: boolean
  maxSparks: number
  maxRipples: number
  enemies: readonly Enemy[]
  shots: readonly Shot[]
  guestShots: readonly Shot[]
  enemyShots: readonly Shot[]
  sparks: readonly Spark[]
  ripples: readonly Ripple[]
}

// Special scripted weapons and beam-column warnings deliberately remain on
// Canvas. The remaining shots can use already-cached identical orb/trail art.
export function isGpuPlayerShot(shot: Shot, advanced: boolean) {
  if (advanced) return shot.kind === 'needle'
  return shot.kind !== 'beam' && shot.kind !== 'coreBlast' && shot.kind !== 'spiegelKunai'
}

export function isGpuEnemyShot(shot: Shot, advanced: boolean) {
  if (shot.kind === 'beam') return false
  if (!advanced) return true
  return shot.kind === 'orbShot' || shot.kind === 'blade' ||
    shot.kind === 'needle' || shot.kind === 'voidShot' ||
    shot.kind === 'scatterBoss' || shot.kind === 'superShot' ||
    shot.kind === 'enemy' || shot.kind === 'boss' || shot.kind === 'plasma'
}

type ShotStyle = { kind: 'trail' | 'orb'; color: string; lengthOrRadius: number; stroke: number }
const orb = (color: string, radius: number): ShotStyle => ({ kind: 'orb', color, lengthOrRadius: radius, stroke: 0 })
const trail = (color: string, length: number, stroke: number): ShotStyle => ({ kind: 'trail', color, lengthOrRadius: length, stroke })

function playerStyle(shot: Shot, advanced: boolean, scale: number): ShotStyle | null {
  if (!isGpuPlayerShot(shot, advanced)) return null
  if (advanced) return trail('rgba(125,249,255,0.9)', 42 * scale, 3.2 * scale)
  if (shot.kind === 'laser' || shot.kind === 'rocket' || shot.kind === 'needle' || shot.kind === 'homing')
    return trail(shot.kind === 'rocket' ? 'rgba(251,146,60,0.88)' : 'rgba(125,249,255,0.86)', 36 * scale, 3 * scale)
  return orb('rgba(34,197,94,0.86)', 6 * scale)
}

function enemyStyle(shot: Shot, advanced: boolean, scale: number): ShotStyle | null {
  if (!isGpuEnemyShot(shot, advanced)) return null
  if (!advanced) {
    const green = shot.kind === 'poisonCloud' || shot.kind === 'venomSpit' || shot.kind === 'snakeFang' || shot.kind === 'devilSnakeHead'
    const pink = shot.kind === 'squidInk' || shot.kind === 'squidSpine'
    return orb(green ? 'rgba(132,204,22,0.68)' : pink ? 'rgba(244,114,182,0.78)' : 'rgba(251,113,133,0.78)', (shot.kind === 'squidBubble' ? 12 : 8) * scale)
  }
  if (shot.kind === 'blade') return trail('rgba(34,211,238,0.9)', 46 * scale, 7 * scale)
  if (shot.kind === 'needle') return trail('rgba(190,242,100,0.92)', 42 * scale, 5 * scale)
  if (shot.kind === 'scatterBoss') return trail('rgba(251,146,60,0.9)', 34 * scale, 5 * scale)
  if (shot.kind === 'orbShot') return orb('rgba(168,85,247,0.92)', 12 * scale)
  if (shot.kind === 'voidShot') return orb('rgba(192,132,252,0.95)', 15 * scale)
  if (shot.kind === 'superShot') return orb('rgba(251,191,36,0.95)', 14 * scale)
  return orb('rgba(251,113,133,0.9)', 10 * scale)
}

type OwnedTexture = { texture: Texture; canvas: HTMLCanvasElement; owned: boolean }
type EnemyPair = { ship: Sprite; glow: Sprite }
const HUES = [-18, 24, -8, 36, -30, 12, 44, -40]

/**
 * A single shared Pixi/WebGL renderer draws both the background and pooled
 * game sprites. No extra full-screen GL context is created.
 * Physics, collision, networking and bosses never depend on GPU visibility.
 */
export class RaidGpuForeground {
  readonly root = new Container()
  private readonly particles = new Graphics()
  private readonly glowLayer = new Container()
  private readonly alienLayer = new Container()
  private readonly projectileLayer = new Container()
  private readonly enemyNodes = new Map<number, EnemyPair>()
  private readonly shotNodes = new Map<string, Sprite>()
  private readonly textures = new Map<string, OwnedTexture>()
  private readonly visibleEnemies = new Set<number>()
  private readonly visibleShots = new Set<string>()
  private broken = false
  private destroyed = false

  constructor() {
    this.particles.blendMode = 'add'
    this.projectileLayer.blendMode = 'add'
    this.root.addChild(this.particles, this.glowLayer, this.alienLayer, this.projectileLayer)
  }

  private cachedTexture(key: string, canvas: HTMLCanvasElement, owned: boolean) {
    const existing = this.textures.get(key)
    if (existing) return existing.texture
    const texture = Texture.from(canvas)
    this.textures.set(key, { texture, canvas, owned })
    return texture
  }

  private alienTexture(variant: number, size: number, dpr: number) {
    const asset = getNormalAlienCanvasSprite(variant)
    if (!asset.loaded || !asset.image.complete) return null
    const source = getCanvasSpriteDimensions(asset)
    if (!source.width || !source.height) return null
    const edge = Math.min(320, Math.max(128, Math.ceil(size * dpr * 1.25 / 64) * 64))
    const key = 'alien:' + asset.cacheKey + ':' + edge
    const existing = this.textures.get(key)
    if (existing) return existing.texture
    const aspect = source.width / source.height
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(aspect >= 1 ? edge : edge * aspect))
    canvas.height = Math.max(1, Math.round(aspect >= 1 ? edge / aspect : edge))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.filter = 'brightness(1.19) contrast(1.12) saturate(1.38) hue-rotate(' + HUES[Math.abs(Math.trunc(variant)) % HUES.length] + 'deg)'
    ctx.drawImage(source.source, 0, 0, canvas.width, canvas.height)
    ctx.filter = 'none'
    return this.cachedTexture(key, canvas, true)
  }

  private updateAliens(frame: RaidGpuForegroundFrame) {
    this.visibleEnemies.clear()
    const sx = frame.width / 100
    const sy = frame.height / 100
    const pulse = 0.94 + (Math.sin(frame.time / 700) + 1) * 0.03
    for (const alien of frame.enemies) {
      if (alien.isBoss || alien.isMiniBoss) continue
      if (!raidObjectInView(frame.bounds, alien.x, alien.y, alien.radius + 5)) continue
      const size = getEnemyCanvasSize(alien, frame.width) * (frame.width > 1100 ? 0.96 : 1)
      const texture = this.alienTexture(alien.variant, size, frame.dpr)
      if (!texture) continue
      this.visibleEnemies.add(alien.id)
      let pair = this.enemyNodes.get(alien.id)
      if (!pair) {
        const ship = new Sprite(texture)
        const glow = new Sprite(Texture.WHITE)
        ship.anchor.set(0.5)
        glow.anchor.set(0.5)
        this.alienLayer.addChild(ship)
        this.glowLayer.addChild(glow)
        pair = { ship, glow }
        this.enemyNodes.set(alien.id, pair)
      }
      const aspect = texture.width / Math.max(1, texture.height)
      pair.ship.texture = texture
      pair.ship.width = aspect >= 1 ? size : size * aspect
      pair.ship.height = aspect >= 1 ? size / aspect : size
      pair.ship.position.set(alien.x * sx, alien.y * sy)
      pair.ship.alpha = pulse
      pair.ship.tint = (alien.hitFlash ?? 0) > 0.03 ? 0xffe8e8 : 0xffffff
      const cachedGlow = getCachedSpriteGlow('rgba(239,35,60,0.34)', size)
      if (cachedGlow) {
        pair.glow.texture = this.cachedTexture('glow:' + Math.round(size), cachedGlow.canvas, false)
        pair.glow.width = cachedGlow.width
        pair.glow.height = cachedGlow.height
        pair.glow.position.set(alien.x * sx, alien.y * sy)
        pair.glow.visible = true
      } else pair.glow.visible = false
    }
    for (const [id, pair] of this.enemyNodes) {
      if (this.visibleEnemies.has(id)) continue
      pair.ship.destroy()
      pair.glow.destroy()
      this.enemyNodes.delete(id)
    }
  }

  private showShot(frame: RaidGpuForegroundFrame, shot: Shot, id: string, style: ShotStyle) {
    if (!raidObjectInView(frame.bounds, shot.x, shot.y, shot.radius + 16)) return
    const art: CachedCanvasDrawSource | null = style.kind === 'orb'
      ? getCachedProjectileOrbSprite(style.color, style.lengthOrRadius)
      : getCachedProjectileTrailSprite(style.color, style.lengthOrRadius, style.stroke)
    if (!art) return
    const key = [style.kind, style.color, Math.round(style.lengthOrRadius * 2) / 2, Math.round(style.stroke * 2) / 2, Math.round(frame.dpr * 10) / 10].join('|')
    const texture = this.cachedTexture(key, art.canvas, false)
    this.visibleShots.add(id)
    let node = this.shotNodes.get(id)
    if (!node) {
      node = new Sprite(texture)
      this.projectileLayer.addChild(node)
      this.shotNodes.set(id, node)
    }
    node.texture = texture
    node.anchor.set(art.originX / art.width, art.originY / art.height)
    node.width = art.width
    node.height = art.height
    node.position.set(shot.x * frame.width / 100, shot.y * frame.height / 100)
    node.rotation = style.kind === 'trail' ? Math.atan2(shot.vy, shot.vx) : 0
  }

  private updateShots(frame: RaidGpuForegroundFrame) {
    this.visibleShots.clear()
    for (const shot of frame.shots) {
      const style = playerStyle(shot, frame.drawAdvancedShotFx, frame.visualScale)
      if (style) this.showShot(frame, shot, 'p:' + shot.id, style)
    }
    for (const shot of frame.guestShots) {
      const style = playerStyle(shot, frame.drawAdvancedShotFx, frame.visualScale)
      if (style) this.showShot(frame, shot, 'g:' + shot.id, style)
    }
    for (const shot of frame.enemyShots) {
      const style = enemyStyle(shot, frame.drawAdvancedShotFx, frame.visualScale)
      if (style) this.showShot(frame, shot, 'e:' + shot.id, style)
    }
    for (const [id, sprite] of this.shotNodes) {
      if (this.visibleShots.has(id)) continue
      sprite.destroy()
      this.shotNodes.delete(id)
    }
  }

  private updateParticles(frame: RaidGpuForegroundFrame) {
    this.particles.clear()
    const sx = frame.width / 100
    const sy = frame.height / 100
    if (frame.drawRipples) {
      for (let i = Math.max(0, frame.ripples.length - frame.maxRipples); i < frame.ripples.length; i++) {
        const ripple = frame.ripples[i]
        if (!raidObjectInView(frame.bounds, ripple.x, ripple.y, ripple.size * 3)) continue
        const progress = 1 - ripple.life / Math.max(0.001, ripple.maxLife)
        const radius = ripple.size * 2.7 * (0.35 + progress * 1.05)
        this.particles.circle(ripple.x * sx, ripple.y * sy, radius)
          .stroke({ color: ripple.color, alpha: Math.max(0, ripple.life / Math.max(0.001, ripple.maxLife)) * 0.42, width: 1.25 })
      }
    }
    for (let i = Math.max(0, frame.sparks.length - frame.maxSparks); i < frame.sparks.length; i++) {
      const spark = frame.sparks[i]
      if (!raidObjectInView(frame.bounds, spark.x, spark.y, 3)) continue
      this.particles.circle(spark.x * sx, spark.y * sy, Math.max(1, spark.size * 0.42))
        .fill({ color: spark.color, alpha: Math.max(0, spark.life / Math.max(0.001, spark.maxLife)) })
    }
  }

  private pruneTextureCache() {
    if (this.textures.size <= 96) return
    const used = new Set<Texture>()
    for (const pair of this.enemyNodes.values()) {
      used.add(pair.ship.texture)
      used.add(pair.glow.texture)
    }
    for (const shot of this.shotNodes.values()) used.add(shot.texture)
    for (const [key, record] of this.textures) {
      if (this.textures.size <= 96) break
      if (used.has(record.texture)) continue
      this.textures.delete(key)
      record.texture.destroy(true)
      if (record.owned) {
        record.canvas.width = 0
        record.canvas.height = 0
      }
    }
  }

  update(frame: RaidGpuForegroundFrame) {
    if (this.broken || this.destroyed) return false
    try {
      this.updateParticles(frame)
      this.updateAliens(frame)
      this.updateShots(frame)
      this.pruneTextureCache()
      return true
    } catch {
      this.broken = true
      this.root.visible = false
      return false
    }
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.root.destroy({ children: true })
    this.enemyNodes.clear()
    this.shotNodes.clear()
    for (const record of this.textures.values()) {
      record.texture.destroy(true)
      if (record.owned) {
        record.canvas.width = 0
        record.canvas.height = 0
      }
    }
    this.textures.clear()
  }
}
