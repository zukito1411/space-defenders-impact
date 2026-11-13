import { CARRIER_BOARDING_SECONDS, CARRIER_CLEAR_SECONDS } from './carrierLaunch'

const unit = (n: number) => Math.max(0, Math.min(1, n))
export function carrierCover(width: number, height: number, landscape: boolean) {
  const sw = landscape ? 1672 : 1024, sh = landscape ? 941 : 1536
  const scale = Math.max(width / sw, height / sh)
  return { sw, sh, scale, x: (width - sw * scale) / 2, y: (height - sh * scale) / 2 }
}

/** A pilot boards before the marshal leaves; ignition is forbidden until both finish. */
export function sampleCarrierCrew(age: number, briefing: boolean, reducedMotion: boolean) {
  const t = briefing ? 0 : Math.max(0, age)
  const walk = briefing ? 0 : unit(t / (CARRIER_BOARDING_SECONDS * .76))
  const climb = briefing ? 0 : unit((t - CARRIER_BOARDING_SECONDS * .76) / (CARRIER_BOARDING_SECONDS * .24))
  const retreat = briefing ? 0 : unit((t - CARRIER_BOARDING_SECONDS - .25) / (CARRIER_CLEAR_SECONDS - .25))
  return {
    walk: reducedMotion ? 0 : walk,
    climb: reducedMotion ? 0 : climb,
    retreat: reducedMotion ? Number(retreat > 0) : retreat,
    pilotVisible: t < CARRIER_BOARDING_SECONDS,
    pilotState: briefing ? 'waiting' : t < CARRIER_BOARDING_SECONDS * .76 ? 'walking' : t < CARRIER_BOARDING_SECONDS ? 'boarding' : 'aboard',
    marshalState: t < CARRIER_BOARDING_SECONDS + .25 ? 'signal' : retreat < 1 ? 'clearing' : 'safe',
    clear: t >= CARRIER_BOARDING_SECONDS + CARRIER_CLEAR_SECONDS,
  } as const
}

/** Tiny helmeted deck workers: articulated limbs stay readable at 8–12 screen pixels. */
function person(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, cycle: number, suit: string, facing: number, moving: boolean, wands = false, signalling = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * height / 22, height / 22)
  const stride = moving ? Math.sin(cycle) * 3 : 0
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.strokeStyle = '#07121b'; ctx.lineWidth = 2.4
  ctx.beginPath(); ctx.moveTo(-1, -8); ctx.lineTo(-2 - stride, -4); ctx.lineTo(-2 + stride * .7, -1)
  ctx.moveTo(2, -8); ctx.lineTo(3 + stride, -4); ctx.lineTo(3 - stride * .7, -1); ctx.stroke()
  ctx.fillStyle = '#14232c'; ctx.fillRect(-3 + stride * .7, -1.5, 3.5, 1.5); ctx.fillRect(2 - stride * .7, -1.5, 3.5, 1.5)
  ctx.fillStyle = suit; ctx.beginPath(); ctx.moveTo(-3,-16); ctx.lineTo(3,-16); ctx.lineTo(4,-8); ctx.lineTo(-3,-8); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#dbe5d8'; ctx.fillRect(-2.5,-12,5,1)
  ctx.fillStyle = '#dfdfc6'; ctx.beginPath(); ctx.arc(0,-19,3.2,Math.PI,Math.PI*2); ctx.lineTo(3.2,-17); ctx.lineTo(-3.2,-17); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#52a0aa'; ctx.fillRect(.3,-19,3,-1.4)
  for (const side of [-1,1]) {
    const arm = signalling ? -20 + Math.sin(cycle * .4) * 1.5 : -10 + side * stride * .7
    const handX = side * (signalling ? 6 : 5)
    ctx.strokeStyle = suit; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(side * 3,-15); ctx.lineTo(handX,arm); ctx.stroke()
    ctx.fillStyle = '#c7d4d1'; ctx.fillRect(handX-1,arm-1,2,2)
    if (wands) {
      ctx.strokeStyle = '#11202b'; ctx.lineWidth = 2.7; ctx.beginPath(); ctx.moveTo(handX,arm); ctx.lineTo(handX + side * 1.7,arm-6.7); ctx.stroke()
      ctx.save(); ctx.shadowColor = '#98ffbe'; ctx.shadowBlur = 6; ctx.strokeStyle = '#b5ffbc'; ctx.lineWidth = 1.7
      ctx.beginPath(); ctx.moveTo(handX+side*.4,arm-1.5); ctx.lineTo(handX+side*1.7,arm-6.7); ctx.stroke(); ctx.restore()
    }
  }
  ctx.restore()
}

/** Replaces only the dark rotor disc; the photographed housing/rim stays intact. */
function fan(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number) {
  ctx.save(); ctx.translate(x,y)
  ctx.fillStyle = '#0b1720'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle = '#55727e'; ctx.lineWidth = 1.3; ctx.stroke()
  ctx.rotate(angle)
  for(let i=0;i<6;i++) {
    ctx.rotate(Math.PI/3)
    ctx.fillStyle = i%2 ? '#304753' : '#3c5661'
    ctx.beginPath(); ctx.moveTo(r*.12,-r*.1); ctx.quadraticCurveTo(r*.7,-r*.7,r*.88,-r*.1); ctx.quadraticCurveTo(r*.66,r*.22,r*.2,r*.15); ctx.closePath(); ctx.fill()
  }
  ctx.fillStyle='#182c38'; ctx.beginPath(); ctx.arc(0,0,r*.23,0,Math.PI*2); ctx.fill()
  ctx.strokeStyle='#66818c'; ctx.stroke(); ctx.restore()
}

function lamp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, power: number, vertical = false) {
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=power
  ctx.shadowColor=color; ctx.shadowBlur=13; ctx.fillStyle=color; if(vertical)ctx.fillRect(x-1.5,y-w/2,3,w);else ctx.fillRect(x-w/2,y-1.5,w,3)
  ctx.globalAlpha=power*.16; ctx.shadowBlur=24; if(vertical)ctx.fillRect(x-5,y-w*.7,10,w*1.4);else ctx.fillRect(x-w*.7,y+2,w*1.4,7); ctx.restore()
}

export type CarrierDeckFrame = {
  width: number; height: number; dpr: number; landscape: boolean; ambientAge: number
  launchAge: number; briefing: boolean; reducedMotion: boolean; decorative: boolean
  /** Physical-screen pilot/cockpit position, using the very same hull renderer scale. */
  shipX: number; shipY: number; hullSize: number
}

export function drawCarrierDeck(canvas: HTMLCanvasElement, frame: CarrierDeckFrame) {
  const {width,height,landscape,launchAge,briefing,reducedMotion,ambientAge,decorative}=frame
  const dpr=Math.min(1.5,frame.dpr), cover=carrierCover(width,height,landscape)
  const pw=Math.round(width*dpr),ph=Math.round(height*dpr)
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph}
  const ctx=canvas.getContext('2d');if(!ctx)return
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height)
  ctx.translate(cover.x,cover.y);ctx.scale(cover.scale,cover.scale)
  const time=reducedMotion?0:ambientAge
  const crew=sampleCarrierCrew(launchAge,briefing,reducedMotion)
  canvas.dataset.pilotState=crew.pilotState;canvas.dataset.marshalState=crew.marshalState
  canvas.dataset.crewCount=String(decorative?6:2)
  canvas.dataset.fanAngle=String(decorative?time*.85:0)
  const fanSites=landscape?[[260,135,51],[395,135,51]]:[[126,383,30],[898,383,30],[126,885,31],[898,885,31]]
  for(let i=0;i<fanSites.length;i++){const [x,y,r]=fanSites[i];fan(ctx,x,y,r,decorative?time*(i%2?-.8:.85):0)}
  const lights=landscape?[[407,316,31],[802,318,30],[1192,318,29],[1340,402,22],[1340,487,20],[1474,267,26],[287,604,23],[505,604,24],[709,604,23],[912,604,23],[1158,604,24]]
    :[[370,286,15],[657,287,15],[370,512,14],[659,511,14],[370,659,14],[659,659,14],[356,808,14],[670,808,14],[370,1126,15],[658,1126,15],[128,335,21],[897,335,21],[125,840,21],[897,841,21]]
  for(let i=0;i<lights.length;i++){
    const [x,y,w]=lights[i], cycle=reducedMotion?0:Math.sin(time*1.4+i*.65)
    lamp(ctx,x,y,w,landscape&&i>=6?'#ffc469':'#68e5f4',.42+cycle*.06,landscape?(i===3||i===4):i<10)
  }
  if(decorative){
    const patrols=landscape?[[500,850,239,19],[1080,1260,239,18],[550,730,791,18],[1170,1400,791,17]]:[[210,282,449,22],[752,814,449,22],[198,270,810,21],[760,820,810,21]]
    for(let i=0;i<patrols.length;i++){
      const [a,b,y,h]=patrols[i],phase=(time*.035+i*.23)%2,forward=phase<1
      const p=forward?phase:2-phase
      person(ctx,a+(b-a)*p,y,h,time*7+i*2,i%2?'#3f8292':'#c38d4d',forward?1:-1,!reducedMotion)
    }
  }
  const shipX=(frame.shipX-cover.x)/cover.scale, shipY=(frame.shipY-cover.y)/cover.scale
  const hull=frame.hullSize/cover.scale
  const boardX=landscape?shipX+hull*.09:shipX+hull*.06
  const boardY=landscape?shipY-hull*.04:shipY-hull*.18
  const floorY=landscape?608:boardY+110
  const startX=boardX-(landscape?150:170), walkEndX=boardX-25
  if(crew.pilotVisible){
    const x=startX+(walkEndX-startX)*crew.walk+(boardX-walkEndX)*crew.climb
    const y=floorY+(boardY-floorY)*crew.climb
    ctx.save();ctx.globalAlpha=1-crew.climb*.8
    person(ctx,x,y,landscape?21:23,time*10,'#d3dbe0',1,!briefing&&!reducedMotion)
    ctx.restore()
  }
  const marshalX=landscape?shipX+190:shipX+145,marshalY=landscape?608:boardY+85
  const safeX=marshalX+95
  // Once the lane is clear, stay behind the service equipment until the carrier leaves.
  if(crew.retreat<1){
    ctx.save();ctx.globalAlpha=1-Math.max(0,(crew.retreat-.8)*5)
    person(ctx,marshalX+(safeX-marshalX)*crew.retreat,marshalY,landscape?23:24,time*13,'#dba349',1,crew.retreat>0&&!reducedMotion,true,crew.marshalState==='signal')
    ctx.restore()
  }
}
