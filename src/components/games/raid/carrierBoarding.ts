import { CARRIER_BOARDING_SECONDS, CARRIER_IGNITION_START } from './carrierLaunch'

const boardingUnit = (v: number) => Math.max(0, Math.min(1, v))
const boardingEase = (v: number) => { const t = boardingUnit(v); return t * t * (3 - 2 * t) }

/** Open during clearance; seal the cockpit, then stow the ladder before ignition. */
export function sampleCarrierBoarding(age: number, briefing: boolean, reduced: boolean, ambientAge = 1) {
  const canopy = briefing ? boardingEase(ambientAge / .65) : 1 - boardingEase((age - CARRIER_BOARDING_SECONDS) / .65)
  const ladder = briefing ? 1 : 1 - boardingEase((age - 3.1) / .65)
  return {
    canopy: reduced ? Number(canopy > .5) : canopy,
    ladder: reduced ? Number(ladder > .5) : ladder,
    sealed: !briefing && age >= CARRIER_BOARDING_SECONDS + .65,
    ready: !briefing && age >= CARRIER_IGNITION_START,
  }
}

type Mount = { x: number; y: number; w: number; h: number; hatch?: boolean }
/** Physical-screen offsets in the same aspect-preserving hull units as the artwork. */
export function getCarrierCockpitMount(key: string, landscape: boolean, groundedMech = false): Mount {
  if(groundedMech)return{x:key==='spiegel'?.025:.05,y:.025,w:.045,h:.045,hatch:true}
  if (key === 'godGundam' || key === 'godGundamBurning' || key === 'spiegel') {
    return landscape
      ? { x: key === 'spiegel' ? .19 : .22, y: key === 'spiegel' ? -.015 : .05, w: .045, h: .045, hatch: true }
      : { x: 0, y: -.10, w: .055, h: .055, hatch: true }
  }
  if (!landscape) return { x: 0, y: -.20, w: .043, h: .075 }
  if (key.startsWith('dreadnought')) return { x: -.04, y: -.055, w: .061, h: .019 }
  if (key.startsWith('coreLander')) return { x: .22, y: -.026, w: .058, h: .019 }
  if (key.startsWith('laser')) return { x: .11, y: -.024, w: .096, h: .028 }
  return { x: key.startsWith('fast') ? .085 : key.startsWith('xwing') ? .055 : .09, y: -.035, w: .085, h: .024 }
}

export function getCarrierBoardingGeometry(shipX: number, shipY: number, hull: number, visualKey: string, landscape: boolean, sourceScale: number, groundedMech=false) {
  const mount = getCarrierCockpitMount(visualKey, landscape,groundedMech)
  const cockpitX = shipX + hull * mount.x, cockpitY = shipY + hull * mount.y
  // The ladder meets the near lip of the cockpit instead of stopping at the hull center.
  const topX = cockpitX - hull * mount.w * .7, topY = cockpitY + hull * mount.h
  const floorY = landscape ? 608 * sourceScale : groundedMech?shipY+hull*.30:topY + 95 * sourceScale
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

/** Draw over the actual hull in physical screen axes, in either orientation. */
export function drawCarrierCockpit(ctx: CanvasRenderingContext2D, x: number, y: number, hull: number, key: string, landscape: boolean, open: number,groundedMech=false) {
  if (open <= .001) return
  const m = getCarrierCockpitMount(key, landscape,groundedMech)
  ctx.save();ctx.translate(x,y)
  ctx.translate(hull*m.x,hull*m.y)
  const w=hull*m.w,h=hull*m.h
  const outline=()=>{ctx.beginPath();if(m.hatch)ctx.roundRect(-w,-h,w*2,h*2,Math.min(w,h)*.2);else ctx.ellipse(0,0,w,h,0,0,Math.PI*2)}
  // The seat well occludes the closed glass while the physical panel swings upward.
  ctx.globalAlpha*=Math.min(1,open*4);outline();ctx.fillStyle='#020b12';ctx.fill();ctx.strokeStyle='#7a949f';ctx.lineWidth=Math.max(.65,hull*.005);ctx.stroke()
  ctx.fillStyle='#29404c';ctx.fillRect(-w*.38,-h*.6,w*.65,h*1.2)
  ctx.fillStyle='#75dfd7';ctx.fillRect(w*.35,-h*.35,w*.22,h*.2)
  if(m.hatch){ctx.translate(0,h);ctx.rotate(open*.65);ctx.scale(1,Math.max(.3,1-open*.7));ctx.translate(0,-h)}
  else if(landscape){ctx.translate(-w,0);ctx.rotate(-open*.8);ctx.translate(w,0)}
  else{ctx.translate(0,h);ctx.rotate(-open*.65);ctx.translate(0,-h)}
  outline();const glass=ctx.createLinearGradient(-w,-h,w,h);glass.addColorStop(0,m.hatch?'#617883':'#4bafcc');glass.addColorStop(.5,m.hatch?'#223746':'#122c3b');glass.addColorStop(1,'#0a1822')
  ctx.fillStyle=glass;ctx.fill();ctx.strokeStyle='#acc8ce';ctx.lineWidth=Math.max(.7,hull*.005);ctx.stroke()
  if(!m.hatch){ctx.beginPath();ctx.moveTo(-w*.65,-h*.4);ctx.lineTo(w*.55,-h*.1);ctx.strokeStyle='#a6f2fca0';ctx.stroke()}
  ctx.restore()
}
