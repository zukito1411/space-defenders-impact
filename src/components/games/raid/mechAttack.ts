import type { CoreLanderCombatModel } from './types'
import { getPublicAssetUrl } from '../sound'
import { getCanvasSpriteDimensions, makeImageCanvasSprite } from './assets'

export const MECH_ACTION_PATHS = {
  godGundam: 'assets/ships/sideview/god-gundam-actions-v1.webp',
  godGundamBurning: 'assets/ships/sideview/god-gundam-burning-actions-v2.webp',
  spiegel: 'assets/ships/sideview/spiegel-actions-v1.webp',
} as const

/** The cooldown is authoritative simulation time: no wall-clock loop or added shot delay. */
export function sampleMechAttack(cooldown: number, interval: number, active: boolean, reduced: boolean) {
  if (!active || reduced) return { frame: 3, stage: 'idle' } as const
  const remaining = Math.max(0, Math.min(1, cooldown / Math.max(.001, interval)))
  if (remaining > .80) return { frame: 2, stage: 'release' } as const
  if (remaining > .47) return { frame: 3, stage: 'recover' } as const
  if (remaining > .20) return { frame: 0, stage: 'windup' } as const
  return { frame: 1, stage: 'charge' } as const
}

export function getMechActionAtlas(model: CoreLanderCombatModel, burning = false) {
  const path = MECH_ACTION_PATHS[model === 'godGundam' && burning ? 'godGundamBurning' : model]
  return makeImageCanvasSprite('mech-action:' + path, getPublicAssetUrl(path))
}

/** One registered atlas cell replaces the hull; consecutive poses never overlap as ghosts. */
export function drawMechAction(ctx: CanvasRenderingContext2D, model: CoreLanderCombatModel, burning: boolean, frame: number, x: number, y: number, size: number, alpha: number, rotation: number, scale: number) {
  const atlas = getMechActionAtlas(model, burning)
  if (!atlas.loaded) return false
  const { source, width, height } = getCanvasSpriteDimensions(atlas)
  const w=width/2,h=height/2,cell=Math.max(0,Math.min(3,Math.trunc(frame)))
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation-Math.PI/2);ctx.scale(scale,scale);ctx.globalAlpha*=alpha
  ctx.drawImage(source,(cell%2)*w,Math.floor(cell/2)*h,w,h,-size/2,-size*h/w/2,size,size*h/w)
  if(model==='godGundam'&&cell===1){
    const px=size*.305,py=size*.065,r=size*.042
    const glow=ctx.createRadialGradient(px,py,0,px,py,r)
    glow.addColorStop(0,'#fffde9');glow.addColorStop(.25,'#ffe494dd');glow.addColorStop(1,'#ff9b2400')
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill()
  }
  ctx.restore();return true
}
