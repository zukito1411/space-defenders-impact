import { RAID_ALIEN_SPRITE_COUNT, RAID_ELITE_SPRITE_COUNT } from '../RaidShipSprite'
import { drawCanvasSpriteContain, drawSpriteGlow, getCanvasSpriteDimensions, getEliteAlienCanvasSprite, getEnemyCanvasSize, getNormalAlienCanvasSprite, getNormalAlienImageFilter } from './assets'
import { DEG, STAGE_CLEAR_SECONDS } from './constants'
import type { BossKind, Enemy, MirageBossKind } from './types'
import { clamp } from './utils'
import { drawBossShield, drawCachedBossAura, drawCachedBossBar, drawCachedBossReticle } from './bossHudRender'
import { drawDevilGundamBoss } from './devilBossRender'
import { drawSnakeVenomTelegraph } from './snakeBossRender'
import { drawSquidWhipStrike } from './squidBossRender'
import { drawCachedStageBossBody, drawEnemyHitFlash, drawStageBossIntroEffect, getStageBossIntroProgress, hexToRgba } from './stageBossRender'

// Normal enemies change their color grading with the background pulse. Drawing
// a large original PNG with ctx.filter on every animation frame is costly in
// Android WebView. Cache the same filter result at the actual screen pixel
// dimensions instead, and refresh only when the filter or size changes.
// The cache is bounded and never changes combat state or sprite appearance.
type NormalEnemyRaster = {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  filter: string
  spriteKey: string
  width: number
  height: number
}
const normalEnemyRasters = new Map<number, NormalEnemyRaster>()
const MAX_NORMAL_ENEMY_RASTERS = 96

export function pruneNormalEnemyRasters(activeEnemies: readonly Enemy[], maxRetire = 8) {
  if (!normalEnemyRasters.size) return
  const active = new Set(activeEnemies.map(enemy => enemy.id))
  let retired = 0
  for (const [id, raster] of normalEnemyRasters) {
    if (active.has(id)) continue
    raster.canvas.width = 0
    raster.canvas.height = 0
    normalEnemyRasters.delete(id)
    if (++retired >= maxRetire) break
  }
}

export function clearNormalEnemyRasters() {
  for (const raster of normalEnemyRasters.values()) {
    raster.canvas.width = 0
    raster.canvas.height = 0
  }
  normalEnemyRasters.clear()
}

function drawRasterizedNormalEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  x: number,
  y: number,
  size: number,
  filter: string,
  dpr: number,
) {
  const sprite = getNormalAlienCanvasSprite(enemy.variant)
  if (!sprite.loaded || !sprite.image.complete) {
    drawCanvasSpriteContain(ctx, sprite, x, y, size, filter, 1, 0, 1, enemy.color, false)
    return
  }

  const { source, width, height } = getCanvasSpriteDimensions(sprite)
  if (width <= 0 || height <= 0) {
    drawCanvasSpriteContain(ctx, sprite, x, y, size, filter, 1, 0, 1, enemy.color, false)
    return
  }

  const aspect = width / height
  const drawWidth = aspect > 1 ? size : size * aspect
  const drawHeight = aspect > 1 ? size / aspect : size
  const pixelWidth = Math.max(1, Math.ceil(drawWidth * dpr))
  const pixelHeight = Math.max(1, Math.ceil(drawHeight * dpr))
  let cached = normalEnemyRasters.get(enemy.id)
  if (!cached) {
    const canvas = document.createElement('canvas')
    const cachedContext = canvas.getContext('2d', { alpha: true })
    if (!cachedContext) {
      drawCanvasSpriteContain(ctx, sprite, x, y, size, filter, 1, 0, 1, enemy.color, false)
      return
    }
    if (normalEnemyRasters.size >= MAX_NORMAL_ENEMY_RASTERS) {
      const oldest = normalEnemyRasters.keys().next().value
      if (oldest !== undefined) {
        const old = normalEnemyRasters.get(oldest)
        if (old) {
          old.canvas.width = 0
          old.canvas.height = 0
        }
        normalEnemyRasters.delete(oldest)
      }
    }
    cached = { canvas, context: cachedContext, filter: '', spriteKey: '', width: 0, height: 0 }
    normalEnemyRasters.set(enemy.id, cached)
  }

  if (
    cached.filter !== filter ||
    cached.spriteKey !== sprite.cacheKey ||
    cached.width !== pixelWidth ||
    cached.height !== pixelHeight
  ) {
    if (cached.width !== pixelWidth || cached.height !== pixelHeight) {
      cached.canvas.width = pixelWidth
      cached.canvas.height = pixelHeight
      cached.context.imageSmoothingEnabled = true
      cached.context.imageSmoothingQuality = 'high'
    }
    cached.context.clearRect(0, 0, pixelWidth, pixelHeight)
    cached.context.filter = filter
    cached.context.drawImage(source, 0, 0, pixelWidth, pixelHeight)
    cached.context.filter = 'none'
    cached.filter = filter
    cached.spriteKey = sprite.cacheKey
    cached.width = pixelWidth
    cached.height = pixelHeight
  }
  ctx.drawImage(cached.canvas, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight)
}

export function getBossDefeatFade(enemy: Enemy) {
  if (enemy.hp > 0) return 1
  return clamp((enemy.defeatTimer ?? enemy.devilDefeatedTimer ?? STAGE_CLEAR_SECONDS) / STAGE_CLEAR_SECONDS, 0, 1)
}

export function drawRaidEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  toX: (value: number) => number,
  toY: (value: number) => number,
  viewportWidth: number,
  time: number,
  normalEnemyFilter: string,
  dpr = 1,
  skipGpuStageBossBody = false,
) {
  const x = toX(enemy.x)
  const y = toY(enemy.y)
  const size = getEnemyCanvasSize(enemy, viewportWidth) * (viewportWidth > 1100 ? 0.96 : 1)

  if (enemy.isBoss) {
    const defeatFade = getBossDefeatFade(enemy)
    const floatScale = 1 + Math.sin(time / 1100) * 0.03
    const rotation = Math.sin(time / 1100) * 0.5 * DEG
    const displayBossKind: BossKind | MirageBossKind | null = enemy.bossKind === 'final' && (enemy.mirageTimer ?? 0) > 0 && enemy.mirageKind
      ? enemy.mirageKind
      : enemy.bossKind
    const hasSpecialBossPresentation = displayBossKind === 'squid' || displayBossKind === 'snake' || displayBossKind === 'final' || displayBossKind === 'devil'
    if (hasSpecialBossPresentation && displayBossKind !== 'devil' && !skipGpuStageBossBody) {
      drawCachedBossAura(ctx, enemy, x, y, size, time)
    }
    if (displayBossKind === 'devil') {
      ctx.save()
      ctx.translate(x, y)
      drawDevilGundamBoss(ctx, enemy, size, time, skipGpuStageBossBody)
      drawEnemyHitFlash(ctx, size, enemy.hitFlash, '#ef4444')
      ctx.restore()
      if (enemy.hp > 0) {
        if (enemy.shieldTime > 0 || enemy.y < 18) drawBossShield(ctx, x, y + size * 0.18, size * 0.86, time, enemy.color)
        if (!skipGpuStageBossBody) drawCachedBossReticle(ctx, x, y, size, time, true)
        drawCachedBossBar(ctx, enemy, x, y + size * 0.16, size)
      }
      return
    }
    if (displayBossKind === 'squid' || displayBossKind === 'snake' || displayBossKind === 'final') {
      const introProgress = getStageBossIntroProgress(enemy, displayBossKind)
      const introScale = 0.74 + introProgress * 0.26
      ctx.save()
      ctx.translate(x, y)
      ctx.globalAlpha *= defeatFade
      drawStageBossIntroEffect(ctx, size, time, displayBossKind, introProgress)
      ctx.rotate(displayBossKind === 'snake' ? 0 : rotation * 0.45)
      ctx.globalAlpha *= 0.58 + introProgress * 0.42
      ctx.scale(floatScale * introScale, floatScale * introScale)
      if (!skipGpuStageBossBody) {
        if (displayBossKind === 'squid') drawCachedStageBossBody(ctx, 'squid', size, time)
        else if (displayBossKind === 'snake') {
          const biteLungeActive = enemy.chargePattern === 'cross' && (enemy.chargeTimer > 0 || (enemy.beamVolleyRecovery ?? 0) > 0)
          drawCachedStageBossBody(ctx, 'snake', size, time, biteLungeActive, biteLungeActive)
        }
        else {
          const finalRage = clamp((0.55 - enemy.hp / Math.max(1, enemy.maxHp)) / 0.55, 0, 1)
          drawCachedStageBossBody(ctx, 'final', size, time, false, false, finalRage)
        }
      }
      drawEnemyHitFlash(ctx, size, enemy.hitFlash, enemy.bossKind === 'final' ? '#fbbf24' : enemy.bossKind === 'squid' ? '#f472b6' : '#f43f5e')
      ctx.restore()
      if (enemy.hp > 0) {
        if (displayBossKind === 'squid' && enemy.chargeTimer > 0 && enemy.chargePattern !== 'rotate') {
          drawSquidWhipStrike(ctx, x, y, toX(enemy.chargeLane), toY(enemy.chargeTargetY ?? enemy.y + 34), size, time, enemy.chargeTimer)
        }
        if (displayBossKind === 'snake' && (enemy.chargeTimer > 0 || (enemy.chargePattern === 'cross' && (enemy.beamVolleyRecovery ?? 0) > 0))) {
          drawSnakeVenomTelegraph(ctx, x, y, toX(enemy.chargeLane), toY(enemy.chargeTargetY ?? enemy.y + 34), size, viewportWidth, time, enemy.chargeTimer, enemy.chargePattern, enemy.beamVolleyRecovery ?? 0)
        }
        if (enemy.shieldTime > 0 || enemy.y < 15) drawBossShield(ctx, x, y, size, time, enemy.color)
        if (!skipGpuStageBossBody) drawCachedBossReticle(ctx, x, y, size, time, enemy.bossKind === 'final')
        drawCachedBossBar(ctx, enemy, x, y, size)
      }
      return
    }
    const bossSpriteVariant = Math.abs(Math.trunc(enemy.id + enemy.variant * 11 + enemy.pattern * 3)) % (RAID_ALIEN_SPRITE_COUNT + RAID_ELITE_SPRITE_COUNT)
    const sprite = bossSpriteVariant < RAID_ALIEN_SPRITE_COUNT
      ? getNormalAlienCanvasSprite(bossSpriteVariant)
      : getEliteAlienCanvasSprite(bossSpriteVariant - RAID_ALIEN_SPRITE_COUNT)
    const bossFilter = enemy.bossKind === 'super'
        ? 'brightness(1.14) contrast(1.18) saturate(1.38)'
        : 'brightness(1.16) contrast(1.18) saturate(1.34)'
    drawCanvasSpriteContain(ctx, sprite, x, y, size * 1.04, bossFilter, defeatFade, rotation, floatScale, enemy.color)
    ctx.save()
    ctx.translate(x, y)
    ctx.globalAlpha *= defeatFade
    drawEnemyHitFlash(ctx, size, enemy.hitFlash, enemy.color)
    ctx.restore()
    if (enemy.hp > 0) {
      if (enemy.shieldTime > 0 || enemy.y < 15) drawBossShield(ctx, x, y, size, time, enemy.color)
      drawCachedBossBar(ctx, enemy, x, y, size)
    }
    return
  }

  if (enemy.isMiniBoss) {
    const sprite = getEliteAlienCanvasSprite(enemy.variant)
    const floatScale = 1 + Math.sin(time / 760 + enemy.phase) * 0.035
    const rotation = Math.sin(time / 900 + enemy.phase) * 1.4 * DEG
    drawSpriteGlow(ctx, x, y, size, hexToRgba(enemy.color, 0.36), 1)
    drawCanvasSpriteContain(ctx, sprite, x, y, size, 'brightness(1.18) contrast(1.2) saturate(1.45)', 1, rotation, floatScale, enemy.color)
    ctx.save()
    ctx.translate(x, y)
    drawEnemyHitFlash(ctx, size, enemy.hitFlash, enemy.color)
    ctx.restore()
    if (enemy.shieldTime > 0 || enemy.y < 8) drawBossShield(ctx, x, y, size * 0.78, time, enemy.color)
    drawCachedBossBar(ctx, enemy, x, y, size * 0.82)
    return
  }

  drawSpriteGlow(ctx, x, y, size, 'rgba(239,35,60,0.34)', 1)
  drawRasterizedNormalEnemy(ctx, enemy, x, y, size, getNormalAlienImageFilter(normalEnemyFilter, enemy), dpr)
  ctx.save()
  ctx.translate(x, y)
  drawEnemyHitFlash(ctx, size, enemy.hitFlash, enemy.color)
  ctx.restore()
}
