import type { CoreLanderCombatModel } from './types'
import { getPublicAssetUrl } from '../sound'
import { getCanvasSpriteDimensions, makeImageCanvasSprite } from './assets'

export const MECH_ACTION_PATHS = {
  godGundam: 'assets/ships/sideview/god-gundam-two-palm-v1.webp',
  godGundamBurning: 'assets/ships/sideview/god-gundam-burning-two-palm-v1.webp',
  spiegel: 'assets/ships/sideview/spiegel-actions-v1.webp',
} as const

/** The cooldown is authoritative simulation time: no wall-clock loop or added shot delay. */
export function sampleMechAttack(model: CoreLanderCombatModel, cooldown: number, interval: number, reduced: boolean) {
  if (reduced) return { frame: model === 'godGundam' ? 3 : 2, stage: 'idle' } as const
  const remaining = Math.max(0, Math.min(1, cooldown / Math.max(.001, interval)))
  if (model === 'godGundam') {
    // Atlas order: ready, charge, thrust, release, recoil, reset.
    if (remaining > .83) return { frame: 3, stage: 'release' } as const
    if (remaining > .66) return { frame: 4, stage: 'recover' } as const
    if (remaining > .50) return { frame: 5, stage: 'recover' } as const
    if (remaining > .34) return { frame: 0, stage: 'windup' } as const
    if (remaining > .17) return { frame: 1, stage: 'charge' } as const
    return { frame: 2, stage: 'thrust' } as const
  }
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
  const columns = model === 'godGundam' ? 3 : 2
  const cellWidth = width / columns
  const cellHeight = height / 2
  const cell = Math.max(0, Math.min(columns * 2 - 1, Math.trunc(frame)))
  const drawHeight = size * cellHeight / cellWidth
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation - Math.PI / 2)
  ctx.scale(scale, scale)
  ctx.globalAlpha *= alpha
  ctx.drawImage(source, cell % columns * cellWidth, Math.floor(cell / columns) * cellHeight,
    cellWidth, cellHeight, -size / 2, -drawHeight / 2, size, drawHeight)
  ctx.restore()
  return true
}
