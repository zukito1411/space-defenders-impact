import type { Shot } from './types'
import { clamp } from './utils'

/**
 * Boss-battle projectile art is generated once as a tiny texture and reused
 * by every active projectile. All per-frame work becomes a Pixi sprite
 * transform, not Canvas gradients / bezier paths for every live bullet.
 */
export type GpuBossProjectileKind =
  | 'squidBubble' | 'squidInk' | 'squidSpine'
  | 'snakeFang' | 'venomSpit' | 'poisonCloud' | 'beam'

export type GpuBossProjectileSpec = {
  kind: GpuBossProjectileKind
  width: number
  height: number
  rotation: number
  alpha: number
  x: number
  y: number
}

export function getGpuBossProjectileSpec(
  shot: Shot, visualScale: number, width: number, height: number, time: number,
  out: GpuBossProjectileSpec,
): GpuBossProjectileSpec | null {
  const kind = shot.kind
  if (kind !== 'poisonCloud' && kind !== 'squidBubble' && kind !== 'squidInk' &&
    kind !== 'venomSpit' && kind !== 'snakeFang' && kind !== 'squidSpine' &&
    !(kind === 'beam' && shot.life !== undefined)) return null
  const x = shot.x * width / 100
  const y = shot.y * height / 100
  const heading = Math.atan2(shot.vy * height, shot.vx * width)
  out.kind = kind as GpuBossProjectileKind
  out.x = x
  out.y = y
  if (kind === 'poisonCloud') {
    const lifeRatio = clamp((shot.life ?? 1) / Math.max(0.01, shot.maxLife ?? 1), 0, 1)
    const radius = Math.max(18, shot.radius * 7.8 * visualScale) * (0.86 + (1 - lifeRatio) * 0.34)
    out.width = out.height = radius * 2.3
    out.rotation = time / 5000 + shot.id
    out.alpha = 0.42 * Math.sin(lifeRatio * Math.PI)
  } else if (kind === 'squidBubble') {
    const radius = Math.max(Math.max(8, 26 - (shot.splitLevel ?? 0) * 5), shot.radius * visualScale * 7)
    const pulse = 0.85 + Math.sin(time / 160 + shot.id) * 0.12
    out.width = out.height = radius * 2.24 * pulse
    out.rotation = time / 1100
    out.alpha = 0.92
  } else if (kind === 'squidInk') {
    const radius = Math.max(9, shot.radius * visualScale * 5.2)
    const pulse = 0.82 + Math.sin(time / 115 + shot.id) * 0.12
    out.width = radius * 4.2 * pulse
    out.height = radius * 2.3
    out.rotation = heading
    out.alpha = 0.9
  } else if (kind === 'venomSpit') {
    const radius = Math.max(8, shot.radius * visualScale * 4.6)
    const pulse = 0.86 + Math.sin(time / 130 + shot.id * 1.7) * 0.13
    out.width = radius * 2.3 * pulse
    out.height = radius * 2.1 * pulse
    out.rotation = heading
    out.alpha = 0.93
  } else if (kind === 'snakeFang' || kind === 'squidSpine') {
    const length = kind === 'snakeFang' ? Math.max(24, visualScale * 26) : Math.max(22, visualScale * 24)
    const broad = kind === 'snakeFang' ? Math.max(8, visualScale * 8) : Math.max(7, visualScale * 7)
    out.width = broad * 3.8
    out.height = length * 1.5
    out.rotation = heading + Math.PI / 2
    out.alpha = 1
  } else {
    const ratio = clamp((shot.life ?? 0) / Math.max(0.01, shot.maxLife ?? 1), 0, 1)
    const beamWidth = Math.max(42, shot.radius * width / 100 * 2.2)
    const vertical = shot.angle === undefined
    out.y = vertical ? height * 0.5 : y
    out.width = vertical ? height : Math.hypot(width, height) * 1.45
    out.height = beamWidth * 1.44
    out.rotation = vertical ? Math.PI / 2 : shot.angle ?? 0
    out.alpha = Math.min(1, Math.sin(ratio * Math.PI) * 1.25)
  }
  return out
}

const colorStops = {
  squidBubble: [[0, 'rgba(255,255,255,0.92)'], [0.1, 'rgba(250,232,255,0.8)'], [0.27, 'rgba(244,114,182,0.54)'], [0.68, 'rgba(126,34,206,0.3)'], [1, 'rgba(126,34,206,0)']],
  squidInk: [[0, 'rgba(255,255,255,0.96)'], [0.24, 'rgba(251,113,133,0.76)'], [0.64, 'rgba(168,85,247,0.38)'], [1, 'rgba(88,28,135,0)']],
  venomSpit: [[0, 'rgba(255,255,255,0.96)'], [0.22, 'rgba(253,230,138,0.92)'], [0.54, 'rgba(132,204,22,0.56)'], [1, 'rgba(21,128,61,0)']],
  poisonCloud: [[0, 'rgba(236,252,203,0.86)'], [0.26, 'rgba(132,204,22,0.56)'], [0.62, 'rgba(22,101,52,0.32)'], [1, 'rgba(22,101,52,0)']],
} as const

export function createGpuBossProjectileCanvas(kind: GpuBossProjectileKind): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const c = canvas.getContext('2d')!
  c.translate(64, 64)
  if (kind === 'beam') {
    // A soft cyan column / beam with the same bright core and twin edge
    // streaks as the Canvas implementation, but one GPU quad per beam.
    const gradient = c.createLinearGradient(0, -48, 0, 48)
    gradient.addColorStop(0, 'rgba(14,165,233,0)')
    gradient.addColorStop(0.08, 'rgba(14,165,233,0.16)')
    gradient.addColorStop(0.2, 'rgba(56,189,248,0.46)')
    gradient.addColorStop(0.45, 'rgba(224,242,254,0.92)')
    gradient.addColorStop(0.55, 'rgba(224,242,254,0.92)')
    gradient.addColorStop(0.8, 'rgba(56,189,248,0.46)')
    gradient.addColorStop(0.92, 'rgba(14,165,233,0.16)')
    gradient.addColorStop(1, 'rgba(14,165,233,0)')
    c.fillStyle = gradient
    c.fillRect(-64, -64, 128, 128)
    c.fillStyle = 'rgba(125,249,255,0.65)'
    c.fillRect(-64, -33, 128, 2)
    c.fillRect(-64, 31, 128, 2)
    return canvas
  }
  if (kind === 'snakeFang' || kind === 'squidSpine') {
    const gradient = c.createLinearGradient(0, -50, 0, 50)
    if (kind === 'squidSpine') {
      gradient.addColorStop(0, '#ffffff')
      gradient.addColorStop(0.25, '#fb7185')
      gradient.addColorStop(0.8, '#581c87')
      gradient.addColorStop(1, 'rgba(24,3,36,0)')
    } else {
      gradient.addColorStop(0, '#fffdf3')
      gradient.addColorStop(0.4, '#fef3c7')
      gradient.addColorStop(1, '#bef264')
    }
    c.fillStyle = gradient
    c.strokeStyle = kind === 'snakeFang' ? 'rgba(190,242,100,0.82)' : 'rgba(250,232,255,0.75)'
    c.lineWidth = 4
    c.beginPath()
    c.moveTo(0, -52)
    c.quadraticCurveTo(30, -16, 12, 42)
    c.quadraticCurveTo(0, 54, -12, 42)
    c.quadraticCurveTo(-30, -16, 0, -52)
    c.closePath()
    c.fill()
    c.stroke()
    return canvas
  }
  const gradient = c.createRadialGradient(0, 0, 3, 0, 0, 57)
  for (const [offset, color] of colorStops[kind]) gradient.addColorStop(offset, color)
  c.fillStyle = gradient
  c.beginPath()
  c.arc(0, 0, 57, 0, Math.PI * 2)
  c.fill()
  if (kind === 'poisonCloud') {
    for (let puff = 0; puff < 7; puff++) {
      const angle = puff * 2.399
      const dist = 14 + (puff % 3) * 10
      const puffGradient = c.createRadialGradient(Math.cos(angle) * dist, Math.sin(angle) * dist * 0.72, 1, Math.cos(angle) * dist, Math.sin(angle) * dist * 0.72, 23)
      puffGradient.addColorStop(0, 'rgba(217,249,157,0.45)')
      puffGradient.addColorStop(1, 'rgba(22,101,52,0)')
      c.fillStyle = puffGradient
      c.beginPath()
      c.arc(Math.cos(angle) * dist, Math.sin(angle) * dist * 0.72, 23, 0, Math.PI * 2)
      c.fill()
    }
  } else if (kind === 'squidInk') {
    c.strokeStyle = 'rgba(250,232,255,0.7)'
    c.lineWidth = 3
    c.beginPath()
    c.ellipse(0, 0, 41, 29, 0, 0, Math.PI * 2)
    c.stroke()
    c.strokeStyle = 'rgba(244,114,182,0.5)'
    c.beginPath()
    c.moveTo(-62, 6)
    c.quadraticCurveTo(-44, -28, 0, 0)
    c.stroke()
  } else {
    c.lineWidth = 3
    c.strokeStyle = kind === 'squidBubble' ? 'rgba(250,232,255,0.76)' : 'rgba(253,230,138,0.68)'
    c.beginPath()
    c.arc(0, 0, 43, 0, Math.PI * 2)
    c.stroke()
    c.fillStyle = 'rgba(255,255,255,0.8)'
    c.beginPath()
    c.arc(-13, -15, 9, 0, Math.PI * 2)
    c.fill()
  }
  return canvas
}
