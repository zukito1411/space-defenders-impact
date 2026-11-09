import { useEffect, useRef } from 'react'
import { drawDevilGundamBoss, drawFinalBossSpriteBody, drawGalacticSnakeBoss, drawGalacticSquidBoss } from './bossRender'
import { BOSS_COLORS, BRIEFING_PICKUP_TYPES, HEIGHT, PICKUP_PREVIEW_SEEDS, WIDTH } from './constants'
import { drawPowerUpCanvas } from './effectsRender'
import { preloadRaidCanvasAssets } from './preload'
import type { BriefingBossKind, PowerKind } from './types'

export function getBriefingPickupType(item: string) {
  const label = item.split(':')[0]
  const pickupKey = Object.keys(BRIEFING_PICKUP_TYPES).find((key) => label.startsWith(key))
  return pickupKey ? BRIEFING_PICKUP_TYPES[pickupKey] : null
}

export function PickupPreviewCanvas({ type }: { type: PowerKind }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let raf = 0
    const seed = PICKUP_PREVIEW_SEEDS[type]
    const draw = (time: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)
      drawPowerUpCanvas(
        ctx,
        {
          id: seed,
          type,
          x: 50,
          y: 50,
          vy: 0,
          radius: 3,
          spin: (time / 18 + seed * 28) % 360,
        },
        (value) => (value / WIDTH) * rect.width,
        (value) => (value / HEIGHT) * rect.height,
        rect.width < 70 ? 640 : 1000,
        time,
      )
      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [type])

  return <canvas className="raid__pickup-preview" ref={canvasRef} aria-hidden="true" />
}

export function BossBriefingCanvas({ kind }: { kind: BriefingBossKind }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    void preloadRaidCanvasAssets()
    let raf = 0
    const draw = (time: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)

      ctx.save()
      const size = Math.min(rect.width * (kind === 'devil' ? 0.86 : kind === 'snake' ? 0.58 : kind === 'final' ? 0.68 : 0.62), rect.height * (kind === 'devil' ? 0.96 : 0.78))
      ctx.translate(rect.width * 0.5, rect.height * (kind === 'devil' ? 0.33 : kind === 'final' ? 0.58 : 0.54))
      if (kind === 'squid') drawGalacticSquidBoss(ctx, size, time)
      else if (kind === 'snake') drawGalacticSnakeBoss(ctx, size, time)
      else if (kind === 'devil') {
        drawDevilGundamBoss(ctx, {
          id: 0,
          x: 50,
          y: 18,
          vx: 0,
          vy: 0,
          hp: 100,
          maxHp: 100,
          radius: 12.8,
          variant: 0,
          isBoss: true,
          isMiniBoss: false,
          fireCooldown: 0,
          phase: 0,
          color: BOSS_COLORS.devil,
          pattern: 10,
          bossKind: 'devil',
          miniBossKind: null,
          shieldTime: 0,
          originX: 50,
          amplitude: 0,
          trainSlot: 0,
          pathSpeed: 0,
          chargeCooldown: 0,
          chargeTimer: 0,
          chargeLane: 50,
          chargeTargetY: 50,
          chargePattern: 'single',
        }, size, time)
      } else {
        const briefingRage = 0.45 + Math.sin(time / 900) * 0.18
        drawFinalBossSpriteBody(ctx, size, time, briefingRage)
      }
      ctx.restore()

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [kind])

  return <canvas className="raid__boss-briefing-preview" ref={canvasRef} aria-hidden="true" />
}
