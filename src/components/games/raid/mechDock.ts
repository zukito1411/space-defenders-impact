import type { CoreLanderCombatModel } from './types'
import { getPublicAssetUrl } from '../sound'
import { getCanvasSpriteDimensions, makeImageCanvasSprite } from './assets'
import { MECH_FLIGHT_ANCHORS } from './mechFlight'
import { CARRIER_IGNITION_START, CARRIER_DEPARTURE_START } from './carrierLaunch'

export const MECH_DOCK_PATHS={godGundam:'assets/ships/sideview/god-gundam-launch-v1.webp',spiegel:'assets/ships/sideview/spiegel-launch-v1.webp'} as const
export function getMechDockAtlas(model:CoreLanderCombatModel){const path=MECH_DOCK_PATHS[model];return makeImageCanvasSprite('mech-dock:'+path,getPublicAssetUrl(path))}
export function sampleMechDock(age:number,landscape:boolean,reduced=false){
  if(age>=6.2||(reduced&&age>=CARRIER_DEPARTURE_START))return null
  const frame=reduced||age<CARRIER_IGNITION_START?0:age<4.45?1:age<5.1?2:3
  return{frame,offsetY:frame<2?-.025:frame===2?-.08:0,angle:landscape||frame===3?-Math.PI/2:frame===2?-Math.PI/6:0}
}
export function getMechDockNozzles(model:CoreLanderCombatModel,frame:number){
  if(frame===3)return {roots:MECH_FLIGHT_ANCHORS[model].nozzles,angle:Math.PI/2}
  const roots:readonly(readonly[number,number,number])[]=frame<2
    ?model==='godGundam'?[[-.17,.29,.018],[.20,.29,.018]]:[[-.20,.29,.018],[.18,.29,.018]]
    :model==='godGundam'?[[-.20,.23,.018],[-.045,.26,.018]]:[[-.23,.22,.018],[-.10,.25,.018]]
  return{roots,angle:frame===2?Math.PI/6:0}
}
export function drawMechDockPose(ctx:CanvasRenderingContext2D,model:CoreLanderCombatModel,pose:NonNullable<ReturnType<typeof sampleMechDock>>,x:number,y:number,size:number,alpha:number){
  const atlas=getMechDockAtlas(model);if(!atlas.loaded)return false
  const {source,width,height}=getCanvasSpriteDimensions(atlas),w=width/2,h=height/2
  ctx.save();ctx.translate(x,y);ctx.rotate(pose.angle);ctx.translate(0,pose.offsetY*size);ctx.globalAlpha*=alpha
  if(pose.frame<2){ctx.save();ctx.globalAlpha*=.32;ctx.fillStyle='#020a10';ctx.beginPath();ctx.ellipse(0,size*.30,size*.21,size*.018,0,0,Math.PI*2);ctx.fill();ctx.restore()}
  ctx.drawImage(source,pose.frame%2*w,Math.floor(pose.frame/2)*h,w,h,-size/2,-size*h/w/2,size,size*h/w)
  if(ctx.canvas?.dataset)ctx.canvas.dataset.mechDockFrame=String(pose.frame)
  ctx.restore();return true
}
