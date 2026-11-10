import { Color, Container, Sprite, Texture } from 'pixi.js'
import type { Renderer } from 'pixi.js'
import {
  getCanvasSpriteDimensions,
  getEnemyCanvasSize,
  getNormalAlienCanvasSprite,
} from './assets'
import type { CachedCanvasDrawSource } from './assets'
import { getCachedProjectileOrbSprite, getCachedProjectileTrailSprite, getCachedSpriteGlow } from './utils'
import { getHomingMissileSprite } from './effectsRender'
import type { Enemy, Ripple, Shot, Spark } from './types'
import { raidObjectInView } from './visibility'
import { createGpuBossProjectileCanvas, getGpuBossProjectileSpec } from './gpuBossProjectiles'
import type { GpuBossProjectileSpec } from './gpuBossProjectiles'
import { RaidGpuBossBodies } from './gpuBossBodies'
import type { RaidVisibilityBounds } from './visibility'
import { COMBAT_TILE, getRaidBossFrame, getRaidCombatFrame, getRaidCombatRootTextures, getRaidExplosionFrame, getRaidProjectileMaterial, preloadRaidCombatArt } from './combatArt'

export type RaidGpuForegroundFrame = {
  width: number
  height: number
  dpr: number
  visualScale: number
  time: number
  guestView: boolean
  measureGpu: boolean
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
  if (getRaidProjectileMaterial(shot.kind)) return true
  // Homing support swarms have cached missile artwork; drawing them in
  // Canvas 2D per frame was expensive once four Mesiah scouts were active.
  if (shot.kind === 'homing') return true
  if (advanced) return shot.kind === 'needle'
  return shot.kind !== 'beam' && shot.kind !== 'coreBlast' && shot.kind !== 'spiegelKunai'
}

export function isGpuEnemyShot(shot: Shot, advanced: boolean) {
  // Full-screen boss beams and heavy poison/bubble effects are rendered
  // from reusable GPU sprites rather than fresh gradients on the 2D canvas.
  if (shot.kind === 'beam') return shot.life !== undefined
  if (shot.kind === 'poisonCloud' || shot.kind === 'squidBubble' ||
    shot.kind === 'squidInk' || shot.kind === 'squidSpine' ||
    shot.kind === 'snakeFang' || shot.kind === 'venomSpit') return true
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
type ProjectileSprite = Sprite & { bornAt: number; originX: number; originY: number }
const HUES = [-18, 24, -8, 36, -30, 12, 44, -40]

/**
 * A single shared Pixi/WebGL renderer draws both the background and pooled
 * game sprites. No extra full-screen GL context is created.
 * Physics, collision, networking and bosses never depend on GPU visibility.
 */
const BOSS_ART_TILES: Partial<Record<GpuBossProjectileSpec['kind'], number>> = {
  squidBubble: 0, squidInk: 1, squidSpine: 2, snakeFang: 3, venomSpit: 4, poisonCloud: 5,
}

export class RaidGpuForeground {
  readonly root = new Container()
  private readonly particles = new Container()
  private readonly impacts = new Container()
  private readonly particleNodes: Sprite[] = []
  private readonly impactNodes: Sprite[] = []
  private particleCount = 0
  private impactCount = 0
  private particleCircleTexture: Texture | null = null
  private particleRingTexture: Texture | null = null
  private readonly glowLayer = new Container()
  private readonly alienLayer = new Container()
  private readonly projectileLayer = new Container()
  private readonly solidProjectileLayer = new Container()
  private readonly bossBodies = new RaidGpuBossBodies()
  private readonly enemyNodes = new Map<number, EnemyPair>()
  private readonly shotNodes = new Map<number, ProjectileSprite>()
  // Bounded recycling avoids continuous Sprite creation/destruction when
  // hundreds of projectiles enter and exit the viewport each second.
  private readonly inactiveShotNodes: ProjectileSprite[] = []
  private readonly inactiveEnemyNodes: EnemyPair[] = []
  private readonly textures = new Map<string, OwnedTexture>()
  private readonly visibleEnemies = new Set<number>()
  private readonly visibleShots = new Set<number>()
  private readonly tintCache = new Map<string, number>()
  private readonly usedTextures = new Set<Texture>()
  private readonly bossSpec: GpuBossProjectileSpec = { kind: 'beam', width: 0, height: 0, rotation: 0, alpha: 1, x: 0, y: 0 }
  private lastTexturePrune = 0
  private alienGlowTexture: Texture | null = null
  private broken = false
  private destroyed = false

  constructor() {
    this.particles.blendMode = 'add'
    this.projectileLayer.blendMode = 'add'
    this.root.addChild(this.particles, this.glowLayer, this.alienLayer, this.bossBodies.root, this.impacts, this.solidProjectileLayer, this.projectileLayer)
  }

  private makeProjectileSprite(): ProjectileSprite {
    const sprite = new Sprite(Texture.WHITE) as ProjectileSprite
    sprite.anchor.set(0.5)
    sprite.visible = false
    sprite.bornAt = 0
    sprite.originX = 0
    sprite.originY = 0
    this.projectileLayer.addChild(sprite)
    return sprite
  }

  /** Allocate reusable nodes and upload art while the launch screen is active. */
  async prepare(renderer: Renderer) {
    await preloadRaidCombatArt()
    if (this.destroyed) return
    this.ensureParticleTextures()
    const glow = getCachedSpriteGlow('rgba(239,35,60,0.34)', 128)
    if (glow) this.alienGlowTexture = this.cachedTexture('alien-glow', glow.canvas, false)
    for (let variant = 0; variant < 8; variant += 1) this.alienTexture(variant)
    for (let index = 0; index < 48; index += 1) {
      const ship = new Sprite(Texture.WHITE)
      const glowSprite = new Sprite(Texture.WHITE)
      ship.anchor.set(0.5)
      glowSprite.anchor.set(0.5)
      ship.visible = glowSprite.visible = false
      this.alienLayer.addChild(ship)
      this.glowLayer.addChild(glowSprite)
      this.inactiveEnemyNodes.push({ ship, glow: glowSprite })
    }
    for (const kind of ['beam', 'squidBubble', 'squidInk', 'squidSpine', 'snakeFang', 'venomSpit', 'poisonCloud'] as const) {
      this.cachedTexture('boss-bullet:' + kind, createGpuBossProjectileCanvas(kind), true)
    }
    for (let index = 0; index < 256; index += 1) {
      if (this.destroyed) return
      this.inactiveShotNodes.push(this.makeProjectileSprite())
      if (index % 64 === 63) await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    if (this.destroyed) return
    for (let index = 0; index < 96; index += 1) {
      const sprite = new Sprite(Texture.WHITE)
      sprite.anchor.set(0.5)
      sprite.visible = false
      this.particles.addChild(sprite)
      this.particleNodes.push(sprite)
    }
    for (let index = 0; index < 8; index += 1) {
      const sprite = new Sprite(Texture.WHITE)
      sprite.anchor.set(0.5)
      sprite.visible = false
      this.impacts.addChild(sprite)
      this.impactNodes.push(sprite)
    }
    // Frame textures use the same two underlying sources; upload each once.
    await renderer.prepare.upload([...getRaidCombatRootTextures(), ...Array.from(this.textures.values(), (record) => record.texture)])
  }

  private colorTint(color: string) {
    let tint = this.tintCache.get(color)
    if (tint === undefined) {
      tint = new Color(color).toNumber()
      this.tintCache.set(color, tint)
    }
    return tint
  }

  private ensureParticleTextures() {
    if (this.particleCircleTexture && this.particleRingTexture) return
    const makeCanvas = (ring: boolean) => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.beginPath()
      ctx.arc(32, 32, ring ? 29 : 27, 0, Math.PI * 2)
      if (ring) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      }
      return canvas
    }
    const circle = makeCanvas(false)
    const ring = makeCanvas(true)
    if (!circle || !ring) return
    this.particleCircleTexture = this.cachedTexture('particle-circle', circle, true)
    this.particleRingTexture = this.cachedTexture('particle-ring', ring, true)
  }

  private paintParticle(texture: Texture, x: number, y: number, diameter: number, color: string | number, alpha: number, height = diameter, rotation = 0) {
    let sprite = this.particleNodes[this.particleCount]
    if (!sprite) {
      sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      this.particles.addChild(sprite)
      this.particleNodes.push(sprite)
    }
    this.particleCount += 1
    sprite.visible = true
    sprite.texture = texture
    sprite.tint = typeof color === 'string' ? this.colorTint(color) : color
    sprite.alpha = alpha
    sprite.position.set(x, y)
    sprite.width = diameter
    sprite.height = height
    sprite.rotation = rotation
  }

  private cachedTexture(key: string, canvas: HTMLCanvasElement, owned: boolean) {
    const existing = this.textures.get(key)
    if (existing) return existing.texture
    const texture = Texture.from(canvas)
    this.textures.set(key, { texture, canvas, owned })
    return texture
  }

  private alienTexture(variant: number) {
    const asset = getNormalAlienCanvasSprite(variant)
    if (!asset.loaded || !asset.image.complete) return null
    const source = getCanvasSpriteDimensions(asset)
    if (!source.width || !source.height) return null
    // One full-detail raster per variant; resizing never creates new textures.
    const edge = 320
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
      const texture = this.alienTexture(alien.variant)
      if (!texture) continue
      this.visibleEnemies.add(alien.id)
      let pair = this.enemyNodes.get(alien.id)
      if (!pair) {
        pair = this.inactiveEnemyNodes.pop()
        if (pair) {
          pair.ship.visible = true
          pair.glow.visible = true
        } else {
          const ship = new Sprite(texture)
          const glow = new Sprite(Texture.WHITE)
          ship.anchor.set(0.5)
          glow.anchor.set(0.5)
          this.alienLayer.addChild(ship)
          this.glowLayer.addChild(glow)
          pair = { ship, glow }
        }
        this.enemyNodes.set(alien.id, pair)
      }
      const aspect = texture.width / Math.max(1, texture.height)
      pair.ship.texture = texture
      pair.ship.width = aspect >= 1 ? size : size * aspect
      pair.ship.height = aspect >= 1 ? size / aspect : size
      pair.ship.position.set(alien.x * sx, alien.y * sy)
      pair.ship.alpha = pulse
      pair.ship.tint = (alien.hitFlash ?? 0) > 0.03 ? 0xffe8e8 : 0xffffff
      if (this.alienGlowTexture) {
        pair.glow.texture = this.alienGlowTexture
        pair.glow.width = size * 1.2
        pair.glow.height = size * 1.04
        pair.glow.position.set(alien.x * sx, alien.y * sy)
        pair.glow.alpha = (alien.hitFlash ?? 0) > 0.03 ? 1 : 0.7
        pair.glow.visible = true
      } else pair.glow.visible = false
    }
    for (const [id, pair] of this.enemyNodes) {
      if (this.visibleEnemies.has(id)) continue
      pair.ship.visible = false
      pair.glow.visible = false
      pair.ship.texture = Texture.WHITE
      pair.glow.texture = Texture.WHITE
      if (this.inactiveEnemyNodes.length < 48) this.inactiveEnemyNodes.push(pair)
      else {
        pair.ship.destroy()
        pair.glow.destroy()
      }
      this.enemyNodes.delete(id)
    }
  }

  private acquireShot(frame: RaidGpuForegroundFrame, shot: Shot, id: number, solid = false) {
    this.visibleShots.add(id)
    let node = this.shotNodes.get(id)
    if (!node) {
      node = this.inactiveShotNodes.pop() ?? this.makeProjectileSprite()
      node.bornAt = frame.time
      node.originX = shot.x * frame.width / 100
      node.originY = shot.y * frame.height / 100
      this.shotNodes.set(id, node)
    }
    const layer = solid ? this.solidProjectileLayer : this.projectileLayer
    if (node.parent !== layer) layer.addChild(node)
    node.visible = true
    node.tint = 0xffffff
    return node
  }

  private showCombatShot(frame: RaidGpuForegroundFrame, shot: Shot, id: number, enemy = false, predicted = false) {
    const material = getRaidProjectileMaterial(shot.kind, enemy)
    if (!material) return false
    if (!raidObjectInView(frame.bounds, shot.x, shot.y, shot.radius + 16)) return true
    const node = this.acquireShot(frame, shot, id, material.solid)
    const sx = frame.width / 100
    const sy = frame.height / 100
    const heading = Math.atan2(shot.vy * sy, shot.vx * sx)
    node.texture = material.texture
    node.anchor.set(0.5)
    node.position.set(shot.x * sx, shot.y * sy)
    node.width = material.width * frame.visualScale
    node.height = material.height * frame.visualScale
    node.rotation = material.directional ? heading : frame.time * 0.0003 + shot.id
    node.alpha = material.solid ? 1 : 0.94 + Math.sin(frame.time * 0.025 + shot.id) * 0.06
    node.blendMode = material.solid ? 'normal' : 'add'
    // A brief local muzzle flash, never a flash in the middle of a remote
    // projectile's flight when a delayed network snapshot first arrives.
    const age = frame.time - node.bornAt
    const muzzle = getRaidCombatFrame(COMBAT_TILE.muzzle)
    if (!enemy && (!frame.guestView || predicted) && age < 38 && muzzle) {
      this.paintParticle(muzzle, node.originX, node.originY, 25 * frame.visualScale,
        0xffffff, (1 - age / 38) * 0.7, 18 * frame.visualScale, heading)
    }
    return true
  }

  private showShot(frame: RaidGpuForegroundFrame, shot: Shot, id: number, style: ShotStyle) {
    if (!raidObjectInView(frame.bounds, shot.x, shot.y, shot.radius + 16)) return
    const art: CachedCanvasDrawSource | null = style.kind === 'orb'
      ? getCachedProjectileOrbSprite(style.color, style.lengthOrRadius)
      : getCachedProjectileTrailSprite(style.color, style.lengthOrRadius, style.stroke)
    if (!art) return
    const key = [style.kind, style.color, Math.round(style.lengthOrRadius * 2) / 2, Math.round(style.stroke * 2) / 2, Math.round(frame.dpr * 10) / 10].join('|')
    const texture = this.cachedTexture(key, art.canvas, false)
    const node = this.acquireShot(frame, shot, id)
    node.blendMode = 'add'
    node.texture = texture
    node.alpha = 1
    node.anchor.set(art.originX / art.width, art.originY / art.height)
    node.width = art.width
    node.height = art.height
    node.position.set(shot.x * frame.width / 100, shot.y * frame.height / 100)
    node.rotation = style.kind === 'trail' ? Math.atan2(shot.vy, shot.vx) : 0
  }

  private showHomingShot(frame: RaidGpuForegroundFrame, shot: Shot, id: number) {
    if (!raidObjectInView(frame.bounds, shot.x, shot.y, shot.radius + 16)) return
    // Use the SAME missile bitmap as the original advanced Canvas renderer;
    // only transfer positioning and rotation to pooled Pixi GPU sprites.
    const image = getHomingMissileSprite(frame.visualScale)
    if (!image.width || !image.height) return
    const texture = this.cachedTexture('player-homing:' + image.width + ':' + image.height, image, false)
    const node = this.acquireShot(frame, shot, id, true)
    node.visible = true
    node.blendMode = 'normal'
    node.texture = texture
    node.alpha = 1
    node.anchor.set(0.5)
    node.position.set(shot.x * frame.width / 100, shot.y * frame.height / 100)
    node.width = image.width
    node.height = image.height
    node.rotation = Math.atan2(shot.vy, shot.vx) + Math.PI / 2
  }

  private showSpecialShot(frame: RaidGpuForegroundFrame, shot: Shot, id: number) {
    const spec = getGpuBossProjectileSpec(shot, frame.visualScale, frame.width, frame.height, frame.time, this.bossSpec)
    if (!spec) return false
    if (spec.kind !== 'beam' && !raidObjectInView(frame.bounds, shot.x, shot.y,
      spec.width * 50 / Math.max(1, frame.width), spec.height * 50 / Math.max(1, frame.height))) return true
    const tile = BOSS_ART_TILES[spec.kind]
    const illustrated = tile === undefined ? undefined : getRaidBossFrame(tile)
    const key = 'boss-bullet:' + spec.kind
    let texture = illustrated ?? this.textures.get(key)?.texture
    if (!texture) {
      const canvas = createGpuBossProjectileCanvas(spec.kind)
      texture = this.cachedTexture(key, canvas, true)
    }
    const node = this.acquireShot(frame, shot, id, Boolean(illustrated && spec.kind === 'poisonCloud'))
    node.visible = true
    node.blendMode = illustrated && spec.kind === 'poisonCloud' ? 'normal' : 'add'
    node.anchor.set(0.5)
    node.texture = texture
    node.position.set(spec.x, spec.y)
    const directionalFang = illustrated && (spec.kind === 'snakeFang' || spec.kind === 'squidSpine')
    node.width = (directionalFang ? spec.height : spec.width) * (illustrated ? 1.2 : 1)
    node.height = (directionalFang ? spec.width : spec.height) * (illustrated ? 1.2 : 1)
    node.rotation = spec.rotation - (directionalFang ? Math.PI / 2 : 0)
    node.alpha = spec.alpha
    return true
  }

  private updateShots(frame: RaidGpuForegroundFrame) {
    this.visibleShots.clear()
    for (const shot of frame.shots) {
      const id = shot.id * 3
      if (this.showCombatShot(frame, shot, id)) continue
      if (shot.kind === 'homing') {
        this.showHomingShot(frame, shot, id)
        continue
      }
      const style = playerStyle(shot, frame.drawAdvancedShotFx, frame.visualScale)
      if (style) this.showShot(frame, shot, id, style)
    }
    for (const shot of frame.guestShots) {
      const id = shot.id * 3 + 1
      if (this.showCombatShot(frame, shot, id, false, true)) continue
      if (shot.kind === 'homing') {
        this.showHomingShot(frame, shot, id)
        continue
      }
      const style = playerStyle(shot, frame.drawAdvancedShotFx, frame.visualScale)
      if (style) this.showShot(frame, shot, id, style)
    }
    for (const shot of frame.enemyShots) {
      const id = shot.id * 3 + 2
      if (this.showSpecialShot(frame, shot, id)) continue
      if (this.showCombatShot(frame, shot, id, true)) continue
      const style = enemyStyle(shot, frame.drawAdvancedShotFx, frame.visualScale)
      if (style) this.showShot(frame, shot, id, style)
    }
    for (const [id, sprite] of this.shotNodes) {
      if (this.visibleShots.has(id)) continue
      sprite.visible = false
      sprite.texture = Texture.WHITE
      if (this.inactiveShotNodes.length < 512) this.inactiveShotNodes.push(sprite)
      else sprite.destroy()
      this.shotNodes.delete(id)
    }
  }

  private updateParticles(frame: RaidGpuForegroundFrame) {
    // Previously each spark and ring created new tessellated Graphics
    // geometry on every frame. Reuse two small GPU textures and pooled
    // Sprite instances so dozens of particles share just two textures.
    this.ensureParticleTextures()
    this.particleCount = 0
    this.impactCount = 0
    const sx = frame.width / 100
    const sy = frame.height / 100
    if (this.particleRingTexture && frame.drawRipples) {
      for (let i = Math.max(0, frame.ripples.length - frame.maxRipples); i < frame.ripples.length; i++) {
        const ripple = frame.ripples[i]
        if (!raidObjectInView(frame.bounds, ripple.x, ripple.y, ripple.size * 3)) continue
        const progress = 1 - ripple.life / Math.max(0.001, ripple.maxLife)
        const radius = ripple.size * 2.7 * (0.35 + progress * 1.05)
        this.paintParticle(
          this.particleRingTexture, ripple.x * sx, ripple.y * sy, radius * 2,
          ripple.color, Math.max(0, ripple.life / Math.max(0.001, ripple.maxLife)) * 0.42,
        )
        const shock = getRaidCombatFrame(COMBAT_TILE.shock)
        if (shock) {
          this.paintParticle(shock, ripple.x * sx, ripple.y * sy, radius * 2.1,
            ripple.color, (1 - progress) * 0.34, radius * 1.5, ripple.id * 2.399)
        }
        const tint = this.colorTint(ripple.color)
        const red = (tint >>> 16) & 255
        const green = (tint >>> 8) & 255
        const blue = tint & 255
        const warm = red > green * 0.95 && red > blue * 1.1
        const explosion = warm && ripple.size >= 5 ? getRaidExplosionFrame(progress) : undefined
        if (explosion) {
          let sprite = this.impactNodes[this.impactCount]
          if (!sprite) {
            sprite = new Sprite(explosion)
            sprite.anchor.set(0.5)
            this.impacts.addChild(sprite)
            this.impactNodes.push(sprite)
          }
          this.impactCount += 1
          sprite.texture = explosion
          sprite.visible = true
          sprite.position.set(ripple.x * sx, ripple.y * sy)
          const diameter = Math.max(28, ripple.size * 6.2) * frame.visualScale * (0.85 + progress * 0.3)
          sprite.width = diameter
          sprite.height = diameter
          sprite.rotation = ripple.id * 2.399
          sprite.alpha = Math.max(0, 1 - progress * 0.55)
        } else {
          const corona = getRaidCombatFrame(COMBAT_TILE.ionImpact)
          if (corona && progress < 0.65) {
            this.paintParticle(corona, ripple.x * sx, ripple.y * sy,
              Math.max(20, ripple.size * 4.5) * frame.visualScale, tint,
              Math.max(0, 1 - progress / 0.65) * 0.65, undefined, ripple.id * 2.399)
          }
        }
      }
    }
    if (this.particleCircleTexture) {
      for (let i = Math.max(0, frame.sparks.length - frame.maxSparks); i < frame.sparks.length; i++) {
        const spark = frame.sparks[i]
        if (!raidObjectInView(frame.bounds, spark.x, spark.y, 3)) continue
        const life = Math.max(0, spark.life / Math.max(0.001, spark.maxLife))
        const streak = getRaidCombatFrame(COMBAT_TILE.spark)
        const fragment = spark.id % 5 === 0 ? getRaidCombatFrame(COMBAT_TILE.fragment) : undefined
        if (fragment) {
          this.paintParticle(fragment, spark.x * sx, spark.y * sy, Math.max(3, spark.size * 1.7),
            0xffffff, life, Math.max(3, spark.size * 1.3), spark.id + (1 - life) * 4)
        } else if (streak) {
          const length = Math.max(5, spark.size * (1.4 + life * 2))
          this.paintParticle(streak, spark.x * sx, spark.y * sy, length,
            spark.color, life, Math.max(2, spark.size * 0.7), Math.atan2(spark.vy * sy, spark.vx * sx))
        } else {
          this.paintParticle(this.particleCircleTexture, spark.x * sx, spark.y * sy,
            Math.max(2, spark.size * 0.84), spark.color, life)
        }
      }
    }
    for (let i = this.particleCount; i < this.particleNodes.length; i++) this.particleNodes[i].visible = false
    for (let i = this.impactCount; i < this.impactNodes.length; i++) this.impactNodes[i].visible = false
  }

  private pruneTextureCache(time: number) {
    if (this.textures.size <= 96) return
    if (time - this.lastTexturePrune < 1000) return
    this.lastTexturePrune = time
    const used = this.usedTextures
    used.clear()
    for (const pair of this.enemyNodes.values()) {
      used.add(pair.ship.texture)
      used.add(pair.glow.texture)
    }
    for (const shot of this.shotNodes.values()) used.add(shot.texture)
    if (this.particleCircleTexture) used.add(this.particleCircleTexture)
    if (this.particleRingTexture) used.add(this.particleRingTexture)
    if (this.alienGlowTexture) used.add(this.alienGlowTexture)
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

  prewarmBoss(kind: 'squid' | 'snake' | 'final' | 'devil' | null, width: number, height: number, time: number) {
    this.bossBodies.prewarm(kind, width, height, time)
  }

  isBossGpuRendered(enemyId: number) { return this.bossBodies.isRendered(enemyId) }

  getStats() {
    const boss = this.bossBodies.getStats()
    return { enemies: this.enemyNodes.size, shots: this.shotNodes.size,
      textures: this.textures.size + getRaidCombatRootTextures().length, particles: this.particleCount + this.impactCount,
      bossFrames: boss.cachedFrames, bossTextureMB: boss.estimatedTextureMB }
  }

  update(frame: RaidGpuForegroundFrame) {
    if (this.broken || this.destroyed) return false
    try {
      this.bossBodies.update(frame)
      this.updateParticles(frame)
      this.updateAliens(frame)
      this.updateShots(frame)
      this.pruneTextureCache(frame.time)
      this.root.visible = true
      return true
    } catch (error) {
      console.warn('Raid GPU combat rendering failed; using Canvas combat rendering:', error)
      this.broken = true
      this.root.visible = false
      return false
    }
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.root.removeChild(this.bossBodies.root)
    this.bossBodies.destroy()
    this.root.destroy({ children: true })
    this.enemyNodes.clear()
    this.shotNodes.clear()
    this.inactiveEnemyNodes.length = 0
    this.inactiveShotNodes.length = 0
    this.particleNodes.length = 0
    this.impactNodes.length = 0
    this.tintCache.clear()
    this.usedTextures.clear()
    this.alienGlowTexture = null
    this.particleCircleTexture = null
    this.particleRingTexture = null
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
