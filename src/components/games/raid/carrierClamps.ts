import { getPublicAssetUrl } from '../sound'
import { makeImageCanvasSprite, getCanvasSpriteDimensions } from './assets'

export const DOCK_CLAMP_PATH = 'assets/carrier/dock-clamp-atlas-v2.png'
export const getDockClampAtlas = () => makeImageCanvasSprite('dock-clamps-v2', getPublicAssetUrl(DOCK_CLAMP_PATH))
export type DockMount = { x: number; y: number; hull: number; floor: number; ceiling: number; mech: boolean }
const ease = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t*t*(3-2*t) }
/** All points are in carrier artwork space, so mounts travel with the carrier. */
export function sampleDockClamps(dock: DockMount, release: number) {
  const r=ease(release)
  return [-1,1].flatMap(side=>[-1,1].map(level=>{
    const bx=dock.x+side*dock.hull*.66
    const by=level<0?dock.ceiling+30:dock.floor-30
    const contactX=dock.x+side*dock.hull*(dock.mech?.23:.25)
    const contactY=dock.y+dock.hull*(dock.mech?(level<0?-.02:.16):level<0?-.035:.14)
    const tx=contactX+(bx-side*dock.hull*.10-contactX)*r
    const ty=contactY+(by-level*dock.hull*.04-contactY)*r
    const dx=tx-bx,dy=ty-by,d=Math.max(.001,Math.hypot(dx,dy))
    // Equal-length links remain rigid through the complete release stroke.
    const length=Math.max(Math.hypot(contactX-bx,contactY-by)*.60,dock.hull*.20)
    const h=Math.sqrt(Math.max(0,length*length-d*d/4))
    const ex=(bx+tx)/2-side*level*dy/d*h,ey=(by+ty)/2+side*level*dx/d*h
    return {bx,by,ex,ey,tx,ty,side,level,length}
  }))
}
/** Atlas pieces rotate around their painted pivots; never stretch image axes. */
export function drawDockClamps(ctx:CanvasRenderingContext2D,dock:DockMount,release:number, source?:CanvasImageSource){
  const sprite=source?null:getDockClampAtlas()
  if(!source&&!sprite?.loaded)return
  const bitmap=source??getCanvasSpriteDimensions(sprite!).source
  const piece=(rect:number[],pivot:number[],x:number,y:number,scale:number,angle=0,flip=1)=>{
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale*flip)
    ctx.drawImage(bitmap,rect[0],rect[1],rect[2],rect[3],rect[0]-pivot[0],rect[1]-pivot[1],rect[2],rect[3]);ctx.restore()
  }
  for(const a of sampleDockClamps(dock,release)){
    const upperAngle=Math.atan2(a.ey-a.by,a.ex-a.bx),lowerAngle=Math.atan2(a.ty-a.ey,a.tx-a.ex)
    // Bolted plinths stay flush against the ceiling beam and floor service rail.
    piece([40,120,620,365],[350,230],a.bx,a.by,.125,0,a.level<0?-1:1)
    piece([680,160,850,260],[750,310],a.bx,a.by,a.length/700,upperAngle)
    piece([70,680,665,220],[160,800],a.ex,a.ey,a.length/515,lowerAngle)
    piece([860,640,575,295],[945,800],a.tx,a.ty,dock.hull*.00013,a.side<0?0:Math.PI)
  }
}
