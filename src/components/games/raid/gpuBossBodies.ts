import { Container, Sprite, Texture } from 'pixi.js'
import { drawCanvasSpriteContain, getDevilBossCanvasSprite, getEnemyCanvasSize, RAID_DEVIL_BOSS_ATTACK_FILTER, RAID_DEVIL_BOSS_BASE_FILTER } from './assets'
import { STAGE_CLEAR_SECONDS } from './constants'
import { getDevilBossPose } from './devilBossRender'
import type { DevilBossPose, Enemy } from './types'
import { clamp } from './utils'
import { raidObjectInView } from './visibility'
import type { RaidGpuForegroundFrame } from './gpuForeground'

type GpuBossKind = 'squid' | 'snake' | 'final'
type DevilArt = { texture: Texture; canvas: HTMLCanvasElement; renderSize: number }
type BossSpritePair = {
  base: Sprite
  blend: Sprite
  pose: DevilBossPose | null
  transitionStarted: number
  fromTexture: Texture | null
}
const DEVIL_POSES: DevilBossPose[] = ['idle', 'idle2', 'attack', 'attack2', 'rage']
const MAX_DEVIL_ART_SIZE = 640
const DEVIL_POSE_BLEND_MS = 160

/**
 * Keep static Devil Gundam pose art on the GPU, but never turn the animated
 * squid, snake or final boss into a slideshow of three pre-baked pictures.
 * Those bosses use their original time-driven Canvas animation instead.
 * Decorative GPU squares, reticles and auras are intentionally not created.
 */
export class RaidGpuBossBodies {
  readonly root = new Container()
  private readonly nodes = new Map<number, BossSpritePair>()
  private readonly spareNodes: BossSpritePair[] = []
  private readonly renderedIds = new Set<number>()
  private readonly devilArt = new Map<string, DevilArt>()
  private readonly pendingDevilArt = new Set<string>()
  private lastDevilUseMs = 0
  private disposed = false

  private isMobile(width: number, height = 560) {
    return width <= 900 || height <= 600
  }

  private devilArtKey(pose: DevilBossPose, size: number) {
    const renderSize = Math.max(180, Math.min(MAX_DEVIL_ART_SIZE, Math.ceil(size / 16) * 16))
    return { key: 'devil:' + pose + ':' + renderSize, renderSize }
  }

  private buildDevilArt(pose: DevilBossPose, renderSize: number): DevilArt | null {
    const source = getDevilBossCanvasSprite(pose)
    if (!source.loaded || !source.image.complete || typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    const side = Math.ceil(renderSize * 1.84)
    canvas.width = side
    canvas.height = side
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return null
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.setTransform(1, 0, 0, 1, side * 0.5, side * 0.5)
    drawCanvasSpriteContain(ctx, source, 0, renderSize * 0.28, renderSize,
      pose === 'rage' || pose === 'attack' || pose === 'attack2' ? RAID_DEVIL_BOSS_ATTACK_FILTER : RAID_DEVIL_BOSS_BASE_FILTER,
      1, 0, 1, '#ef4444')
    return { canvas, texture: Texture.from(canvas), renderSize }
  }

  private prepareDevil(pose: DevilBossPose, size: number): DevilArt | null {
    if (this.disposed) return null
    const { key, renderSize } = this.devilArtKey(pose, size)
    const cached = this.devilArt.get(key)
    if (cached) return cached
    if (!this.pendingDevilArt.has(key)) {
      this.pendingDevilArt.add(key)
      const bake = () => {
        this.pendingDevilArt.delete(key)
        if (this.disposed || this.devilArt.has(key)) return
        const art = this.buildDevilArt(pose, renderSize)
        if (!art) return
        if (this.devilArt.size >= 8) {
          const oldest = this.devilArt.entries().next().value as [string, DevilArt] | undefined
          if (oldest) {
            this.devilArt.delete(oldest[0])
            oldest[1].texture.destroy(true)
            oldest[1].canvas.width = 0
            oldest[1].canvas.height = 0
          }
        }
        this.devilArt.set(key, art)
      }
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(bake, { timeout: 1800 })
      } else if (typeof window !== 'undefined') {
        setTimeout(bake, 36)
      }
    }
    return null
  }

  prewarm(kind: GpuBossKind | 'devil' | null, viewportWidth: number, viewportHeight: number, time: number) {
    // Don't pre-render animated bosses: that caused the slideshow regression.
    if (kind !== 'devil' || this.disposed || !this.isMobile(viewportWidth, viewportHeight)) return
    this.lastDevilUseMs = time
    if (this.pendingDevilArt.size === 0) {
      const size = getEnemyCanvasSize({ isBoss: true, bossKind: 'devil' } as Enemy, viewportWidth)
      for (const pose of DEVIL_POSES) {
        if (this.devilArt.has(this.devilArtKey(pose, size).key)) continue
        this.prepareDevil(pose, size)
        break
      }
    }
  }

  isRendered(enemyId: number) { return this.renderedIds.has(enemyId) }

  private takePair(id: number) {
    const pair = this.spareNodes.pop() ?? {
      base: new Sprite(Texture.WHITE),
      blend: new Sprite(Texture.WHITE),
      pose: null,
      transitionStarted: 0,
      fromTexture: null,
    }
    pair.pose = null
    pair.fromTexture = null
    for (const sprite of [pair.base, pair.blend]) {
      sprite.anchor.set(0.5)
      if (!sprite.parent) this.root.addChild(sprite)
    }
    this.nodes.set(id, pair)
    return pair
  }

  update(frame: RaidGpuForegroundFrame) {
    this.renderedIds.clear()
    const activeIds = new Set<number>()
    if (this.isMobile(frame.width, frame.height)) {
      for (const enemy of frame.enemies) {
        if (!enemy.isBoss || enemy.bossKind !== 'devil' ||
          !raidObjectInView(frame.bounds, enemy.x, enemy.y, enemy.radius + 26)) continue
        this.lastDevilUseMs = frame.time
        const size = getEnemyCanvasSize(enemy, frame.width, frame.landscape)
        const pose = getDevilBossPose(enemy, frame.time)
        const art = this.prepareDevil(pose, size)
        if (!art) continue // Canvas draws the model until its texture is ready.
        const pair = this.nodes.get(enemy.id) ?? this.takePair(enemy.id)
        activeIds.add(enemy.id)
        this.renderedIds.add(enemy.id)
        const fade = enemy.hp > 0 ? 1 :
          clamp((enemy.defeatTimer ?? enemy.devilDefeatedTimer ?? STAGE_CLEAR_SECONDS) / STAGE_CLEAR_SECONDS, 0, 1)
        if (pair.pose !== pose) {
          pair.fromTexture = pair.pose !== null
            ? (pair.blend.visible ? pair.blend.texture : pair.base.texture) : null
          pair.pose = pose
          pair.transitionStarted = frame.time
        }
        const blend = clamp((frame.time - pair.transitionStarted) / DEVIL_POSE_BLEND_MS, 0, 1)
        const smoothBlend = blend * blend * (3 - 2 * blend)
        const pulse = 0.985 + Math.sin(frame.time / 880 + enemy.phase) * 0.016
        const drawSize = size * (art.canvas.width / art.renderSize) * pulse
        const px = enemy.x * frame.width / 100
        const py = enemy.y * frame.height / 100 + Math.sin(frame.time / 690 + enemy.phase) * size * 0.006
        const tilt = Math.sin(frame.time / 1080 + enemy.phase) * 0.012
        for (const sprite of [pair.base, pair.blend]) {
          sprite.position.set(px, py)
          sprite.width = drawSize
          sprite.height = drawSize
          sprite.rotation = tilt
          sprite.tint = 0xffffff
        }
        if (pair.fromTexture && smoothBlend < 1) {
          pair.base.texture = pair.fromTexture
          pair.blend.texture = art.texture
          pair.base.alpha = fade * (1 - smoothBlend)
          pair.blend.alpha = fade * smoothBlend
          pair.base.visible = true
          pair.blend.visible = true
        } else {
          pair.base.texture = art.texture
          pair.base.alpha = fade
          pair.base.visible = true
          pair.blend.visible = false
          pair.fromTexture = null
        }
      }
    }
    for (const [id, pair] of this.nodes) {
      if (activeIds.has(id)) continue
      pair.base.visible = false
      pair.blend.visible = false
      pair.base.texture = Texture.WHITE
      pair.blend.texture = Texture.WHITE
      pair.pose = null
      pair.fromTexture = null
      this.nodes.delete(id)
      if (this.spareNodes.length < 3) this.spareNodes.push(pair)
      else { pair.base.destroy(); pair.blend.destroy() }
    }
    if (this.lastDevilUseMs > 0 && frame.time - this.lastDevilUseMs > 14000) {
      for (const art of this.devilArt.values()) {
        art.texture.destroy(true)
        art.canvas.width = 0
        art.canvas.height = 0
      }
      this.devilArt.clear()
      this.lastDevilUseMs = 0
    }
  }

  getStats() {
    let pixels = 0
    for (const art of this.devilArt.values()) pixels += art.canvas.width * art.canvas.height
    return { cachedFrames: this.devilArt.size, estimatedTextureMB: Math.round(pixels * 4 / 1048576) }
  }

  destroy() {
    this.disposed = true
    this.root.destroy({ children: true })
    this.nodes.clear()
    this.spareNodes.length = 0
    this.renderedIds.clear()
    for (const art of this.devilArt.values()) {
      art.texture.destroy(true)
      art.canvas.width = 0
      art.canvas.height = 0
    }
    this.devilArt.clear()
    this.pendingDevilArt.clear()
  }
}
