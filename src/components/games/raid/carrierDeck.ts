import { drawDockClamps, getDockClampAtlas, type DockMount } from './carrierClamps'
import { CARRIER_IGNITION_START } from './carrierLaunch'
import { drawDeckPerson as person } from './crewPeople'
import { sampleCrewPatrol } from './crewMotion'
import { CARRIER_BOARDING_SECONDS, CARRIER_CLEAR_SECONDS } from './carrierLaunch'
import { drawBoardingLadder, drawCarrierCockpit, getCarrierBoardingGeometry, sampleCarrierBoarding } from './carrierBoarding'

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
  const retreat = briefing ? 0 : unit((t - CARRIER_BOARDING_SECONDS) / CARRIER_CLEAR_SECONDS)
  return {
    walk: reducedMotion ? 0 : walk,
    climb: reducedMotion ? 0 : climb,
    retreat: reducedMotion ? Number(retreat > 0) : retreat,
    pilotVisible: t < CARRIER_BOARDING_SECONDS,
    pilotState: briefing ? 'waiting' : t < CARRIER_BOARDING_SECONDS * .76 ? 'walking' : t < CARRIER_BOARDING_SECONDS ? 'boarding' : 'aboard',
    marshalState: t < CARRIER_BOARDING_SECONDS ? 'signal' : retreat < 1 ? 'clearing' : 'safe',
    clear: t >= CARRIER_BOARDING_SECONDS + CARRIER_CLEAR_SECONDS,
  } as const
}

const fanRotors = new Map<number, HTMLCanvasElement>()
function fanRotor(r: number) {
  const old=fanRotors.get(r);if(old)return old
  const bitmap=document.createElement('canvas');bitmap.width=bitmap.height=Math.ceil(r*2+4)
  const bake=bitmap.getContext('2d')!;bake.translate(bitmap.width/2,bitmap.height/2)
  bake.fillStyle='#0b1720';bake.beginPath();bake.arc(0,0,r,0,Math.PI*2);bake.fill()
  bake.strokeStyle='#55727e';bake.lineWidth=1.3;bake.stroke()
  for(let i=0;i<6;i++){
    bake.rotate(Math.PI/3);bake.fillStyle=i%2?'#304753':'#3c5661'
    bake.beginPath();bake.moveTo(r*.12,-r*.1);bake.quadraticCurveTo(r*.7,-r*.7,r*.88,-r*.1);bake.quadraticCurveTo(r*.66,r*.22,r*.2,r*.15);bake.closePath();bake.fill()
  }
  bake.fillStyle='#182c38';bake.beginPath();bake.arc(0,0,r*.23,0,Math.PI*2);bake.fill();bake.strokeStyle='#66818c';bake.stroke()
  if(fanRotors.size>=8)fanRotors.delete(fanRotors.keys().next().value!)
  fanRotors.set(r,bitmap);return bitmap
}
/** Only the rotor bitmap turns; housings and the static background retain their own layer. */
function fan(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, service = false) {
  ctx.save();ctx.translate(x,y)
  if(service){
    ctx.fillStyle='#172e38';ctx.strokeStyle='#526b73';ctx.lineWidth=2
    ctx.fillRect(-r-5,-r-5,(r+5)*2,(r+5)*2);ctx.strokeRect(-r-5,-r-5,(r+5)*2,(r+5)*2)
    ctx.fillStyle='#9ca78c';for(const a of[-1,1])for(const b of[-1,1])ctx.fillRect(a*(r+2)-1,b*(r+2)-1,2,2)
  }
  const rotor=fanRotor(r);ctx.rotate(angle);ctx.drawImage(rotor,-rotor.width/2,-rotor.height/2);ctx.restore()
}

const lampTextures = new Map<string, HTMLCanvasElement>()
function lampTexture(color: string, width: number) {
  const key = color + ':' + width
  const old = lampTextures.get(key)
  if (old) return old
  const bitmap = document.createElement('canvas')
  bitmap.width = Math.ceil(width + 40); bitmap.height = 40
  const bake = bitmap.getContext('2d')!
  const x=bitmap.width/2,y=20,r=(width+34)/2
  bake.save();bake.translate(x,y);bake.scale(1,.43)
  const gradient=bake.createRadialGradient(0,0,0,0,0,r)
  gradient.addColorStop(0,color+'b0');gradient.addColorStop(.35,color+'38');gradient.addColorStop(1,color+'00')
  bake.fillStyle=gradient;bake.fillRect(-r,-r,r*2,r*2);bake.restore()
  bake.fillStyle=color;bake.fillRect(x-width/2,y-1.5,width,3)
  if(lampTextures.size>=24)lampTextures.delete(lampTextures.keys().next().value!)
  lampTextures.set(key,bitmap)
  return bitmap
}
function lamp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, power: number, vertical = false) {
  const texture=lampTexture(color,w)
  ctx.save();ctx.translate(x,y);if(vertical)ctx.rotate(Math.PI/2)
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=power
  ctx.drawImage(texture,-texture.width/2,-texture.height/2)
  ctx.restore()
}

export type CarrierDeckFrame = {
  width: number; height: number; dpr: number; landscape: boolean; ambientAge: number
  launchAge: number; briefing: boolean; reducedMotion: boolean; decorative: boolean
  /** Physical-screen pilot/cockpit position, using the very same hull renderer scale. */
  shipX: number; shipY: number; hullSize: number; visualKey: string; groundedMech?: boolean; landingRelease?: number
}

/** Shared ladder/pilot/cockpit mount; source coordinates retain cover/crop alignment. */
function boardingGeometry(frame: CarrierDeckFrame) {
  const cover=carrierCover(frame.width,frame.height,frame.landscape)
  const shipX=(frame.shipX-cover.x)/cover.scale,shipY=(frame.shipY-cover.y)/cover.scale,hull=frame.hullSize/cover.scale
  return {cover,shipX,shipY,hull,...getCarrierBoardingGeometry(shipX,shipY,hull,frame.visualKey,frame.landscape,1,frame.groundedMech)}
}

/** Foreground pass after the one gameplay hull: pilot climbs visible rungs into the well. */
export function drawCarrierBoardingForeground(ctx: CanvasRenderingContext2D, frame: CarrierDeckFrame) {
  const g=boardingGeometry(frame),crew=sampleCarrierCrew(frame.launchAge,frame.briefing,frame.reducedMotion)
  const kit=sampleCarrierBoarding(frame.launchAge,frame.briefing,frame.reducedMotion,frame.ambientAge)
  ctx.save();ctx.translate(g.cover.x,g.cover.y);ctx.scale(g.cover.scale,g.cover.scale)
  drawBoardingLadder(ctx,g.footX,g.floorY,g.topX,g.topY,kit.ladder)
  drawCarrierCockpit(ctx,g.shipX,g.shipY,g.hull,frame.visualKey,frame.landscape,kit.canopy,frame.groundedMech)
  if(crew.pilotVisible){
    const x=g.startX+(g.footX-g.startX)*crew.walk+(g.topX-g.footX)*crew.climb
    const y=g.floorY+(g.topY-g.floorY)*crew.climb
    ctx.globalAlpha*=1-Math.max(0,(crew.climb-.72)/.28)
    const h=frame.landscape?21:23,walkDistance=(g.footX-g.startX)*crew.walk+Math.hypot(g.topX-g.footX,g.topY-g.floorY)*crew.climb
    person(ctx,x,y,h,walkDistance*22/h,'#d3dbe0',1,!frame.briefing&&!frame.reducedMotion,false,false,false,crew.climb>0)
  }
  ctx.restore()
}

const dockMounts = new WeakMap<HTMLCanvasElement, DockMount & { viewport: string }>()
const staticDeckFrames = new WeakMap<HTMLCanvasElement, string>()
export function drawCarrierDeck(canvas: HTMLCanvasElement, frame: CarrierDeckFrame) {
  const {width,height,landscape,launchAge,briefing,reducedMotion,ambientAge,decorative}=frame
  const dpr=Math.min(1.5,frame.dpr), cover=carrierCover(width,height,landscape)
  const pw=Math.round(width*dpr),ph=Math.round(height*dpr)
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph}
  const crew=sampleCarrierCrew(launchAge,briefing,reducedMotion)
  const kit=sampleCarrierBoarding(launchAge,briefing,reducedMotion,ambientAge)
  const release=frame.landingRelease ?? (briefing?0:unit((launchAge-CARRIER_IGNITION_START-.8)/.8))
  const clampRelease=reducedMotion?Number(release>.5):release
  const clampLoaded=getDockClampAtlas().loaded
  // Static accessibility frames only change on a boarding/clearance cut or resize.
  // Avoid repeatedly rasterizing and uploading a full-screen unchanged canvas.
  const staticKey=reducedMotion?[width,height,dpr,landscape,decorative,frame.shipX,frame.shipY,frame.hullSize,frame.visualKey,crew.pilotState,crew.marshalState,crew.retreat,kit.ladder,kit.canopy,clampRelease,clampLoaded].join(':'):null
  if(staticKey&&staticDeckFrames.get(canvas)===staticKey)return
  const ctx=canvas.getContext('2d');if(!ctx)return
  if(staticKey)staticDeckFrames.set(canvas,staticKey);else staticDeckFrames.delete(canvas)
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height)
  ctx.translate(cover.x,cover.y);ctx.scale(cover.scale,cover.scale)
  let dock=dockMounts.get(canvas)
  if(!dock||dock.viewport!==`${width}:${height}:${landscape}`||briefing||launchAge<CARRIER_IGNITION_START){
    dock={viewport:`${width}:${height}:${landscape}`,x:(frame.shipX-cover.x)/cover.scale,y:(frame.shipY-cover.y)/cover.scale,hull:frame.hullSize/cover.scale,
      floor:landscape?608:1126,ceiling:landscape?270:808,mech:frame.groundedMech??false}
    dockMounts.set(canvas,dock)
  }
  drawDockClamps(ctx,dock,clampRelease)
  canvas.dataset.dockClampRenderer='atlas'
  canvas.dataset.dockClampLoaded=String(clampLoaded)
  canvas.dataset.dockClampRelease=String(clampRelease)
  const time=reducedMotion?0:ambientAge
  canvas.dataset.pilotState=crew.pilotState;canvas.dataset.marshalState=crew.marshalState
  canvas.dataset.crewCount=String(decorative?6:2)
  canvas.dataset.fanAngle=String(decorative?time*.85:0)
  canvas.dataset.canopyOpen=String(kit.canopy);canvas.dataset.ladderExtension=String(kit.ladder)
  canvas.dataset.cockpitSealed=String(kit.sealed)
  const fanSites=landscape?[[260,135,51],[395,135,51]]:[[126,383,30],[898,383,30],[126,885,31],[898,885,31],[286,569,20],[738,569,20]]
  for(let i=0;i<fanSites.length;i++){const [x,y,r]=fanSites[i];fan(ctx,x,y,r,decorative?time*(i%2?-.8:.85):0,!landscape&&i>=4)}
  const lights=landscape?[[407,316,31],[802,318,30],[1192,318,29],[1340,402,22],[1340,487,20],[1474,267,26],[287,604,23],[505,604,24],[709,604,23],[912,604,23],[1158,604,24]]
    :[[370,286,15],[657,287,15],[370,512,14],[659,511,14],[370,659,14],[659,659,14],[356,808,14],[670,808,14],[370,1126,15],[658,1126,15],[128,335,21],[897,335,21],[125,840,21],[897,841,21]]
  for(let i=0;i<lights.length;i++){
    const [x,y,w]=lights[i], cycle=reducedMotion?0:Math.sin(time*1.4+i*.65)
    lamp(ctx,x,y,w,landscape&&i>=6?'#ffc469':'#68e5f4',.42+cycle*.06,landscape?(i===3||i===4):i<10)
  }
  if(decorative){
    const patrols=landscape?[[500,850,239,19],[1080,1260,239,18],[550,730,791,18],[1170,1400,791,17]]:[[210,282,449,22],[752,814,449,22],[198,270,810,21],[760,820,810,21]]
    for(let i=0;i<patrols.length;i++){
      const [a,b,y,h]=patrols[i],p=sampleCrewPatrol(time,a,b,22,i*3.7)
      person(ctx,p.x,y,h,p.distance*22/h,i%2?'#3f8292':'#c38d4d',p.facing,p.moving&&!reducedMotion)
    }
  }
  const g=boardingGeometry(frame)
  const marshalX=landscape?g.shipX+190:g.shipX+145,marshalY=landscape?608:g.topY+70
  const safeX=marshalX+65
  // Once the lane is clear, stay behind the service equipment until the carrier leaves.
  if(crew.retreat<1){
    ctx.save();ctx.globalAlpha=1-Math.max(0,(crew.retreat-.8)*5)
    const h=landscape?23:24,distance=crew.retreat>0?(safeX-marshalX)*crew.retreat*22/h:time
    person(ctx,marshalX+(safeX-marshalX)*crew.retreat,marshalY,h,distance,'#dba349',1,crew.retreat>0&&!reducedMotion,true,crew.marshalState==='signal',true)
    ctx.restore()
  }
}
