import { getCarrierCanopyProfile } from './carrierCanopyProfiles'
import { getCanvasSpriteDimensions, getRaidSideShipCanvasSprite, getShipCanvasSprite } from './assets'
import { getMechDockAtlas } from './mechDock'
import { drawDeckAtlasTile } from './deckServiceArt'
import { CARRIER_BOARDING_SECONDS, CARRIER_IGNITION_START } from './carrierLaunch'

const boardingUnit = (v: number) => Math.max(0, Math.min(1, v))
const boardingEase = (v: number) => { const t = boardingUnit(v); return t * t * (3 - 2 * t) }

/** Open during clearance; seal the cockpit, then stow the ladder before ignition. */
export function sampleCarrierBoarding(age: number, briefing: boolean, reduced: boolean, ambientAge = 1) {
  const canopy = briefing ? boardingEase(ambientAge / .65) : 1 - boardingEase((age - CARRIER_BOARDING_SECONDS) / .65)
  const ladder = briefing ? boardingEase((ambientAge - .12) / .42) : 1 - boardingEase((age - 3.1) / .65)
  return {
    canopy: reduced ? Number(canopy > .5) : canopy,
    ladder: reduced ? Number(ladder > .5) : ladder,
    sealed: !briefing && age >= CARRIER_BOARDING_SECONDS + .65,
    ready: !briefing && age >= CARRIER_IGNITION_START,
  }
}

/** Physical-screen offsets in the same hull units as the artwork. */
export function getCarrierCockpitMount(key: string, landscape: boolean, groundedMech = false) {
  const profile = getCarrierCanopyProfile(key, landscape, groundedMech)
  if (!profile) return { x: 0, y: -.1, w: .02, h: .025, hatch: true }
  const [left, top, right, bottom] = profile.bounds
  return { x: (left + right - 240) / 480, y: (top + bottom - 240) / 480,
    w: (right - left) / 480, h: (bottom - top) / 480, hatch: profile.hatch }
}

export function getCarrierBoardingGeometry(shipX: number, shipY: number, hull: number, visualKey: string, landscape: boolean, sourceScale: number, groundedMech=false) {
  const mount = getCarrierCockpitMount(visualKey, landscape,groundedMech)
  const cockpitX = shipX + hull * mount.x, cockpitY = shipY + hull * mount.y
  // The ladder meets the near lip of the cockpit instead of stopping at the hull center.
  const topX = cockpitX - hull * mount.w * .7, topY = cockpitY + hull * mount.h
  const floorY = landscape ? Math.max(topY + 40 * sourceScale, 608 * sourceScale) : groundedMech ? shipY + hull * .30 : topY + 95 * sourceScale
  const footX = topX - 36 * sourceScale
  return { mount, cockpitX, cockpitY, topX, topY, floorY, footX, startX: footX - 130 * sourceScale }
}

export function drawBoardingLadder(ctx: CanvasRenderingContext2D, footX: number, floorY: number, topX: number, topY: number, extension: number, sourceScale = 1) {
  if (extension <= 0) return
  const x = footX + (topX - footX) * (1 - extension), y = floorY + (topY - floorY) * (1 - extension)
  const dx = topX - x, dy = topY - y, length = Math.hypot(dx, dy)
  const nx = -dy / Math.max(1, length) * 4 * sourceScale, ny = dx / Math.max(1, length) * 4 * sourceScale
  ctx.save(); ctx.lineCap = 'round'
  ctx.strokeStyle = '#07131b'; ctx.lineWidth = 4 * sourceScale
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + nx * side, y + ny * side); ctx.lineTo(topX + nx * side, topY + ny * side); ctx.stroke() }
  ctx.strokeStyle = '#b3c5c8'; ctx.lineWidth = 1.6 * sourceScale
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + nx * side, y + ny * side); ctx.lineTo(topX + nx * side, topY + ny * side); ctx.stroke() }
  const steps = Math.max(2, Math.ceil(length / (10 * sourceScale)))
  ctx.strokeStyle = '#d6bd80'; ctx.lineWidth = 1.5 * sourceScale
  for (let i = 0; i <= steps; i++) { const t = i / steps; ctx.beginPath(); ctx.moveTo(x + dx * t - nx, y + dy * t - ny); ctx.lineTo(x + dx * t + nx, y + dy * t + ny); ctx.stroke() }
  ctx.restore()
}

/** Reveal the seat well and lift a cutout of the original glass on its hinge. */
export function drawCarrierCockpit(ctx: CanvasRenderingContext2D, x: number, y: number, hull: number, key: string, landscape: boolean, open: number, groundedMech = false) {
  if (open <= .001) return
  const profile = getCarrierCanopyProfile(key, landscape, groundedMech)
  if (!profile) return
  const side = landscape || groundedMech
  const sprite = groundedMech ? getMechDockAtlas(key === 'spiegel' ? 'spiegel' : 'godGundam')
    : landscape ? getRaidSideShipCanvasSprite(key) : getShipCanvasSprite(key)
  if (!sprite?.loaded) return
  const { source, width, height } = getCanvasSpriteDimensions(sprite)
  if (!width || !height) return
  const frameWidth = groundedMech ? width / 2 : width
  const frameHeight = groundedMech ? height / 2 : height
  const fittedHeight = side ? hull * frameHeight / frameWidth : hull
  const mount = getCarrierCockpitMount(key, landscape, groundedMech)
  const outline = () => {
    ctx.beginPath()
    const [[firstX, firstY]] = profile.outline
    ctx.moveTo((firstX / 240 - .5) * hull, (firstY / 240 - .5) * hull)
    for (let index = 1; index < profile.outline.length; index += 1) {
      const [px, py] = profile.outline[index]
      ctx.lineTo((px / 240 - .5) * hull, (py / 240 - .5) * hull)
    }
    ctx.closePath()
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.save()
  ctx.globalAlpha *= Math.min(1, open * 7)
  outline()
  ctx.clip()
  // Fill the opening behind the glass so the closed artwork never ghosts through.
  ctx.fillStyle = '#0a141d'
  ctx.fillRect(hull * (mount.x - mount.w), hull * (mount.y - mount.h), hull * mount.w * 2, hull * mount.h * 2)
  drawDeckAtlasTile(ctx, 'cockpit', (profile.hatch ? 2 : 0) + Number(side),
    hull * mount.x, hull * mount.y, hull * mount.w * 2.1, hull * mount.h * 2.1, true)
  ctx.restore()

  const hx = (profile.hinge[0] / 240 - .5) * hull, hy = (profile.hinge[1] / 240 - .5) * hull
  ctx.translate(hx, hy)
  ctx.rotate(-open * (side ? .88 : .72))
  ctx.scale(1, 1 - open * .22)
  ctx.translate(-hx, -hy)
  outline()
  ctx.clip()
  ctx.drawImage(source, groundedMech ? frameWidth : 0, 0, frameWidth, frameHeight,
    -hull / 2, -fittedHeight / 2, hull, fittedHeight)
  ctx.restore()
}
