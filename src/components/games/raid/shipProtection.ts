import { getCanvasSpriteDimensions } from './assets'
import type { CanvasSpriteEntry } from './assets'
import { hullDistanceField, protectionContour } from './protectionGeometry'
import type { ProtectionContour } from './protectionGeometry'

const EDGE = 256
const HULL_SIZE = 192
const CACHE_LIMIT = 24
export type ProtectionHull = {
  sprite: CanvasSpriteEntry
  contain?: boolean
  rotation?: number
  columns?: number
  rows?: number
  frame?: number
}
type ProtectionArt = { field: HTMLCanvasElement; shield: HTMLCanvasElement; combined: HTMLCanvasElement; repair: HTMLCanvasElement; fieldPath: ProtectionContour; shieldPath: ProtectionContour }
const cache = new Map<string, ProtectionArt>()

function key(hull: ProtectionHull) {
  return `${hull.sprite.cacheKey}|${Boolean(hull.contain)}|${hull.rotation ?? 0}|${hull.columns ?? 1}|${hull.rows ?? 1}|${hull.frame ?? 0}`
}

function strokeContour(ctx: CanvasRenderingContext2D, path: ProtectionContour, color: string, width: number, start = 0, length = 256) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  for (let i = 0; i <= length; i++) {
    const index = ((start + i) % 256 + 256) % 256 * 2
    const x = path.points[index], y = path.points[index + 1]
    if (!i) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

export function warmShipProtection(hull: ProtectionHull): ProtectionArt | undefined {
  const id = key(hull)
  const existing = cache.get(id)
  if (existing) return existing
  if (!hull.sprite.loaded || typeof document === 'undefined') return undefined
  const { source, width, height } = getCanvasSpriteDimensions(hull.sprite)
  if (!width || !height) return undefined
  const mask = document.createElement('canvas')
  mask.width = mask.height = EDGE
  const maskCtx = mask.getContext('2d', { willReadFrequently: true })
  if (!maskCtx) return undefined
  const columns = hull.columns ?? 1, rows = hull.rows ?? 1, frame = hull.frame ?? 0
  const cellWidth = width / columns, cellHeight = height / rows
  const aspect = cellWidth / cellHeight
  const w = hull.contain ? HULL_SIZE * Math.min(1, aspect) : HULL_SIZE
  const h = hull.contain ? HULL_SIZE / Math.max(1, aspect) : HULL_SIZE
  maskCtx.translate(EDGE / 2, EDGE / 2)
  maskCtx.rotate(hull.rotation ?? 0)
  maskCtx.drawImage(source, frame % columns * cellWidth, Math.floor(frame / columns) * cellHeight,
    cellWidth, cellHeight, -w / 2, -h / 2, w, h)
  const distance = hullDistanceField(maskCtx.getImageData(0, 0, EDGE, EDGE).data, EDGE, EDGE)
  const fieldPath = protectionContour(distance, EDGE, EDGE, 7)
  const shieldPath = protectionContour(distance, EDGE, EDGE, 13)
  const makeLayer = (mode: 'field' | 'shield' | 'combined') => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = EDGE
    const ctx = canvas.getContext('2d')!
    const image = ctx.createImageData(EDGE, EDGE)
    const outer = mode === 'field' ? 8 : 14
    const color = mode === 'shield' ? [255, 190, 66] : mode === 'combined' ? [141, 116, 255] : [45, 212, 191]
    for (let i = 0; i < distance.length; i++) {
      const d = distance[i]
      if (d < 1 || d > outer) continue
      const x = i % EDGE, y = Math.floor(i / EDGE)
      // Alternating glass facets retain a clear hull while giving the shell depth.
      const facet = (Math.floor(x / 11) + Math.floor(y / 9)) % 3 === 0
      image.data[i * 4] = color[0]
      image.data[i * 4 + 1] = color[1]
      image.data[i * 4 + 2] = color[2]
      image.data[i * 4 + 3] = facet ? 90 : 40
    }
    ctx.putImageData(image, 0, 0)
    ctx.translate(EDGE / 2, EDGE / 2)
    ctx.save()
    // The hex grid is masked to a narrow band outside the actual ship artwork.
    ctx.globalCompositeOperation = 'source-atop'
    ctx.strokeStyle = mode === 'shield' ? 'rgba(255,237,170,.9)' : 'rgba(165,243,252,.85)'
    ctx.lineWidth = 1.2
    const radius = mode === 'shield' ? 8 : 6
    for (let row = -15; row <= 15; row++) for (let col = -15; col <= 15; col++) {
      const x = col * radius * 1.73 + (row % 2) * radius * .865, y = row * radius * 1.5
      ctx.beginPath()
      const corners = mode === 'shield' ? 3 : 6
      for (let corner = 0; corner < corners; corner++) {
        const angle = corner * Math.PI * 2 / corners + Math.PI / 6
        const px = x + Math.cos(angle) * (radius - .5), py = y + Math.sin(angle) * (radius - .5)
        if (!corner) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }
    ctx.restore()
    ctx.lineCap = 'round'
    const path = mode === 'field' ? fieldPath : shieldPath
    ctx.shadowBlur = 5
    ctx.shadowColor = mode === 'shield' ? '#f59e0b' : mode === 'combined' ? '#8b5cf6' : '#2dd4bf'
    strokeContour(ctx, path, mode === 'shield' ? 'rgba(251,191,36,.28)' : 'rgba(45,212,191,.3)', 3)
    // Shield plates are longer and heavier than the force-field lattice segments.
    const step = mode === 'shield' ? 24 : 16
    for (let start = 0; start < 256; start += step) {
      const color = mode === 'shield' ? (start % 48 ? '#fbbf24' : '#fff7d6')
        : mode === 'combined' ? (start % 32 ? '#c4b5fd' : '#67e8f9') : (start % 32 ? 'rgba(45,212,191,.72)' : 'rgba(165,243,252,.88)')
      strokeContour(ctx, path, color, mode === 'shield' ? 2.6 : 1.8, start, step - 6)
    }
    ctx.shadowBlur = 0
    if (mode === 'combined') {
      // Interlocked inner gold armor and outer violet/cyan lattice form one effect.
      strokeContour(ctx, fieldPath, 'rgba(253,230,138,.72)', 1.25)
      for (let i = 8; i < 256; i += 32) {
        const outerX = shieldPath.points[i * 2], outerY = shieldPath.points[i * 2 + 1]
        let nearest = 0, nearestDistance = Infinity
        for (let point = 0; point < 256; point++) {
          const dx = fieldPath.points[point * 2] - outerX, dy = fieldPath.points[point * 2 + 1] - outerY
          const distance = dx * dx + dy * dy
          if (distance < nearestDistance) { nearest = point; nearestDistance = distance }
        }
        ctx.strokeStyle = '#fef3c7'
        ctx.lineWidth = 1.3
        ctx.beginPath()
        ctx.moveTo(fieldPath.points[nearest * 2], fieldPath.points[nearest * 2 + 1])
        ctx.lineTo(outerX, outerY)
        ctx.stroke()
      }
    }
    return canvas
  }
  const repair = document.createElement('canvas')
  repair.width = repair.height = EDGE
  const seam = repair.getContext('2d')!
  seam.fillStyle = 'rgba(52,211,153,.08)'
  seam.fillRect(0, 0, EDGE, EDGE)
  seam.strokeStyle = 'rgba(209,250,229,.9)'
  seam.lineWidth = 1.2
  for (let row = 32; row < EDGE; row += 17) {
    seam.beginPath()
    seam.moveTo(0, row)
    seam.lineTo(82, row)
    seam.lineTo(100, row - 8)
    seam.lineTo(160, row - 8)
    seam.lineTo(178, row)
    seam.lineTo(EDGE, row)
    seam.stroke()
  }
  seam.globalCompositeOperation = 'destination-in'
  seam.drawImage(mask, 0, 0)
  const art = { field: makeLayer('field'), shield: makeLayer('shield'), combined: makeLayer('combined'), repair, fieldPath, shieldPath }
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
  cache.set(id, art)
  return art
}

/** One integrated defensive state: force lattice, shield armor, or their linked form. */
export function drawShipProtection(ctx: CanvasRenderingContext2D, x: number, y: number, size: number,
  time: number, field: number, shield: number, hull: ProtectionHull, reducedMotion = false, capacity = 5) {
  if (size <= 0 || (field <= 0 && shield <= 0)) return
  const art = warmShipProtection(hull)
  if (!art) return
  const force = Math.max(0, Math.min(1, field)), armor = Math.max(0, Math.min(1, shield))
  const combined = force > 0 && armor > 0
  const path = force > 0 && !combined ? art.fieldPath : art.shieldPath
  const clock = reducedMotion ? 0 : time
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / HULL_SIZE, size / HULL_SIZE)
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha *= .64 + Math.max(force, armor) * .3
  ctx.drawImage(combined ? art.combined : force > 0 ? art.field : art.shield, -EDGE / 2, -EDGE / 2)
  ctx.lineCap = 'round'
  for (let sweep = 0; sweep < 2; sweep++) {
    const start = Math.floor(clock / (sweep ? -22 : 17) + sweep * 128)
    strokeContour(ctx, path, combined ? (sweep ? '#fde68a' : '#e9d5ff') : force > 0 ? '#cffafe' : '#fff7ed',
      combined ? 2.8 : 2, start, combined ? 14 : 10)
  }
  const nodes = force > 0 ? capacity : 4
  const active = force > 0 ? Math.max(1, Math.round(force * capacity)) : Math.max(1, Math.ceil(armor * nodes))
  for (let node = 0; node < nodes; node++) {
    const index = ((path.nose + Math.round((node - (nodes - 1) / 2) * 9)) % 256 + 256) % 256 * 2
    ctx.fillStyle = node >= active ? 'rgba(148,163,184,.2)' : active === 1 ? '#fbbf24' : combined ? '#fef3c7' : force > 0 ? '#a5f3fc' : '#fff7d6'
    const px = path.points[index], py = path.points[index + 1]
    ctx.beginPath()
    ctx.moveTo(px, py - 2.8)
    ctx.lineTo(px + 2, py)
    ctx.lineTo(px, py + 2.8)
    ctx.lineTo(px - 2, py)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}
