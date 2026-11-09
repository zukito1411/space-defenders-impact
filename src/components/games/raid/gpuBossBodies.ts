import { Container, Sprite, Texture } from 'pixi.js'
import { getCobraBossCanvasSprite, getEnemyCanvasSize, getFinalBossCanvasSprite, getSquidBossCanvasSprite } from './assets'
import { STAGE_CLEAR_SECONDS } from './constants'
import { drawStageBossBodyDirect, getStageBossIntroProgress } from './stageBossRender'
import type { Enemy } from './types'
import { clamp } from './utils'
import { raidObjectInView } from './visibility'
import type { RaidGpuForegroundFrame } from './gpuForeground'

type GpuBossKind = 'squid' | 'snake' | 'final'
type BossArtworkEntry = {
  key: string
  kind: GpuBossKind
  renderSize: number
  frames: Texture[]
  canvases: HTMLCanvasElement[]
  pending: boolean
  cancelled: boolean
  lastUsedMs: number
}
type BossSpritePair = { base: Sprite; blend: Sprite }

const FRAME_COUNT = 3
const FRAME_TIME_MS = 620
const GPU_BOSS_MAX_ARTWORK_SIZE = 440
const MAX_ACTIVE_BOSS_ARTSETS = 2

/**
 * Renders mobile boss body art once, ahead of the battle where possible, and
 * reuses it as GPU textures. Hitboxes, attacks, telegraphs, health bars and
 * dynamic Canvas overlays are deliberately left to the original game logic.
 * If an image isn't ready, Canvas handles the body without interruption.
 */
export class RaidGpuBossBodies {
  readonly root = new Container()
  private readonly art = new Map<string, BossArtworkEntry>()
  private readonly nodes = new Map<number, BossSpritePair>()
  private readonly spareNodes: BossSpritePair[] = []
  private readonly renderedIds = new Set<number>()
  private disposed = false

  private getArtworkKey(kind: GpuBossKind, size: number) {
    const renderSize = Math.max(180, Math.min(GPU_BOSS_MAX_ARTWORK_SIZE, Math.ceil(size / 16) * 16))
    return { key: kind + ':' + renderSize, renderSize }
  }

  private imageAvailable(kind: GpuBossKind) {
    const image = kind === 'squid' ? getSquidBossCanvasSprite()
      : kind === 'snake' ? getCobraBossCanvasSprite() : getFinalBossCanvasSprite()
    return image.loaded && image.image.complete
  }

  private disposeArtwork(entry: BossArtworkEntry) {
    entry.cancelled = true
    for (const texture of entry.frames) texture.destroy(true)
    for (const canvas of entry.canvases) {
      canvas.width = 0
      canvas.height = 0
    }
    entry.frames.length = 0
    entry.canvases.length = 0
  }

  private scheduleNextFrame(entry: BossArtworkEntry) {
    if (this.disposed || entry.cancelled || entry.pending || entry.frames.length >= FRAME_COUNT) return
    entry.pending = true
    const makeFrame = () => {
      entry.pending = false
      if (entry.cancelled || this.disposed || entry.frames.length >= FRAME_COUNT) return
      if (!this.imageAvailable(entry.kind)) return
      const index = entry.frames.length
      const canvas = document.createElement('canvas')
      const canvasSize = Math.ceil(entry.renderSize * 2.55)
      canvas.width = canvasSize
      canvas.height = canvasSize
      const ctx = canvas.getContext('2d', { alpha: true })
      if (!ctx) return
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.setTransform(1, 0, 0, 1, canvasSize * 0.5, canvasSize * 0.5)
      // Preserve the existing fully painted squid / snake / final art.
      drawStageBossBodyDirect(ctx, entry.kind, entry.renderSize, 680 + index * FRAME_TIME_MS, false, false, 0.32)
      if (entry.cancelled || this.disposed) {
        canvas.width = 0
        canvas.height = 0
        return
      }
      entry.canvases.push(canvas)
      entry.frames.push(Texture.from(canvas))
      // Each expensive source frame is baked at most once; never inside a
      // gameplay frame's synchronous draw loop.
      this.scheduleNextFrame(entry)
    }
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(makeFrame, { timeout: 1800 })
    } else if (typeof window !== 'undefined') {
      window.setTimeout(makeFrame, 36)
    }
  }

  private prepare(kind: GpuBossKind, size: number, time: number) {
    if (this.disposed || typeof document === 'undefined' || !this.imageAvailable(kind)) return null
    const { key, renderSize } = this.getArtworkKey(kind, size)
    let entry = this.art.get(key)
    if (!entry) {
      if (this.art.size >= MAX_ACTIVE_BOSS_ARTSETS) {
        const oldest = this.art.entries().next().value as [string, BossArtworkEntry] | undefined
        if (oldest) {
          this.art.delete(oldest[0])
          this.disposeArtwork(oldest[1])
        }
      }
      entry = { key, kind, renderSize, frames: [], canvases: [], pending: false, cancelled: false, lastUsedMs: time }
      this.art.set(key, entry)
    }
    entry.lastUsedMs = time
    this.scheduleNextFrame(entry)
    return entry.frames.length === FRAME_COUNT ? entry : null
  }

  prewarm(kind: GpuBossKind | null, viewportWidth: number, time: number) {
    if (!kind || this.disposed || !this.isMobile(viewportWidth)) return
    const size = getEnemyCanvasSize({ isBoss: true, bossKind: kind } as Enemy, viewportWidth)
    this.prepare(kind, size, time)
  }

  private isMobile(width: number, height = 560) {
    return width <= 900 || height <= 600
  }

  isRendered(enemyId: number) { return this.renderedIds.has(enemyId) }

  update(frame: RaidGpuForegroundFrame) {
    this.renderedIds.clear()
    const activeIds = new Set<number>()
    if (this.isMobile(frame.width, frame.height)) {
      for (const enemy of frame.enemies) {
        if (!enemy.isBoss || !raidObjectInView(frame.bounds, enemy.x, enemy.y, enemy.radius + 26)) continue
        const kind = enemy.bossKind === 'final' && (enemy.mirageTimer ?? 0) > 0 && enemy.mirageKind
          ? enemy.mirageKind : enemy.bossKind
        if (kind !== 'squid' && kind !== 'snake' && kind !== 'final') continue
        // The snake's bite-lunge needs a special head-hidden pose; keep the
        // original Canvas art for that short interactive animation.
        if (kind === 'snake' && enemy.chargePattern === 'cross' &&
          (enemy.chargeTimer > 0 || (enemy.beamVolleyRecovery ?? 0) > 0)) continue
        const size = getEnemyCanvasSize(enemy, frame.width) * (frame.width > 1100 ? 0.96 : 1)
        const art = this.prepare(kind, size, frame.time)
        if (!art) continue
        const pair = this.nodes.get(enemy.id) ?? this.takePair(enemy.id)
        activeIds.add(enemy.id)
        this.renderedIds.add(enemy.id)
        const stageIntro = getStageBossIntroProgress(enemy, kind)
        const stageScale = 0.74 + stageIntro * 0.26
        const floatScale = 1 + Math.sin(frame.time / 1100) * 0.03
        const rotation = kind === 'snake' ? 0 : Math.sin(frame.time / 1100) * 0.5 * Math.PI / 180 * 0.45
        const fade = enemy.hp > 0 ? 1 :
          clamp((enemy.defeatTimer ?? enemy.devilDefeatedTimer ?? STAGE_CLEAR_SECONDS) / STAGE_CLEAR_SECONDS, 0, 1)
        const opacity = fade * (0.58 + stageIntro * 0.42)
        const positionX = enemy.x * frame.width / 100
        const positionY = enemy.y * frame.height / 100
        const drawSize = size * (art.canvases[0].width / art.renderSize) * floatScale * stageScale
        const phase = (frame.time / FRAME_TIME_MS) % FRAME_COUNT
        const frameIndex = Math.floor(phase)
        const blend = phase - frameIndex
        pair.base.visible = true
        pair.blend.visible = true
        pair.base.texture = art.frames[frameIndex]
        pair.blend.texture = art.frames[(frameIndex + 1) % FRAME_COUNT]
        const x = positionX
        const y = positionY
        for (const sprite of [pair.base, pair.blend]) {
          sprite.position.set(x, y)
          sprite.width = drawSize
          sprite.height = drawSize
          sprite.rotation = rotation
        }
        pair.base.alpha = (1 - blend) * opacity
        pair.blend.alpha = blend * opacity
        if (kind === 'final') {
          const rage = clamp((0.55 - enemy.hp / Math.max(1, enemy.maxHp)) / 0.55, 0, 1)
          const tint = rage > 0.55 ? 0xffe0e5 : 0xffffff
          pair.base.tint = tint
          pair.blend.tint = tint
        } else {
          pair.base.tint = 0xffffff
          pair.blend.tint = 0xffffff
        }
      }
    }
    for (const [id, pair] of this.nodes) {
      if (activeIds.has(id)) continue
      pair.base.visible = false
      pair.blend.visible = false
      pair.base.texture = Texture.WHITE
      pair.blend.texture = Texture.WHITE
      this.nodes.delete(id)
      if (this.spareNodes.length < 3) this.spareNodes.push(pair)
      else { pair.base.destroy(); pair.blend.destroy() }
    }
  }

  private takePair(id: number) {
    const pair = this.spareNodes.pop() ?? {
      base: new Sprite(Texture.WHITE), blend: new Sprite(Texture.WHITE),
    }
    for (const sprite of [pair.base, pair.blend]) {
      sprite.anchor.set(0.5)
      if (!sprite.parent) this.root.addChild(sprite)
    }
    this.nodes.set(id, pair)
    return pair
  }

  getStats() {
    let pixels = 0
    let count = 0
    for (const entry of this.art.values()) {
      count += entry.frames.length
      for (const canvas of entry.canvases) pixels += canvas.width * canvas.height
    }
    return { cachedFrames: count, estimatedTextureMB: Math.round(pixels * 4 / 1048576) }
  }

  destroy() {
    this.disposed = true
    this.root.destroy({ children: true })
    this.nodes.clear()
    this.spareNodes.length = 0
    for (const entry of this.art.values()) this.disposeArtwork(entry)
    this.art.clear()
  }
}
