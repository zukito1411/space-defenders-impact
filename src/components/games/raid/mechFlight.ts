import type { CoreLanderCombatModel, Shot } from './types'

type Point = readonly [number, number]
const palmPoint = (x: number, y: number): Point => [(x - 384) / 768, (y - 256) / 768]

// The gap between the two palms in each 768×512 release cell, expressed in
// right-facing hull-width units around the center of the sprite.
export const GOD_GUNDAM_PALMS = {
  folded: { release: palmPoint(631, 216) },
  burning: { release: palmPoint(625, 219) },
} as const

/** Measured on the landscape artwork in physical right-facing hull-size units. */
export const MECH_FLIGHT_ANCHORS = {
  godGundam: {
    head: [.274, -.145], hand: GOD_GUNDAM_PALMS.folded.release,
    shoulders: [[.025, -.145], [.286, -.14]],
    nozzles: [[.018, -.11, .018], [-.386, .173, .016], [-.005, .186, .016]],
  },
  spiegel: {
    head: [.215, -.09], hand: [.467, -.045],
    shoulders: [[.02, -.145], [.255, -.04]],
    nozzles: [[-.128, -.147, .018], [-.128, -.092, .018]],
  },
} as const

/** Shoulder ballistics, head pickups and hand techniques have separate origins. */
export function getMechShotAnchor(model: CoreLanderCombatModel, kind: Shot['kind'], lane: number, landscape: boolean, burning = false): Point {
  const side = lane < 0 ? 0 : 1
  if (!landscape) {
    if (kind === 'coreBlast') return [.23, -.04]
    if (kind === 'spiegelKunai') return [.23, -.03]
    if (kind === 'laser' || kind === 'needle') return [side ? .035 : -.035, -.34]
    return [side ? .16 : -.16, -.24]
  }
  const map = MECH_FLIGHT_ANCHORS[model]
  const hand = model === 'godGundam' && burning ? GOD_GUNDAM_PALMS.burning.release : map.hand
  const point = kind === 'coreBlast' || kind === 'spiegelKunai' ? hand
    : kind === 'laser' || kind === 'needle' ? map.head : map.shoulders[side]
  // The physical camera turns clockwise; undo it before emitting into logical space.
  return [point[1], -point[0]]
}

export function getMechFlightNozzles(model: CoreLanderCombatModel) {
  return MECH_FLIGHT_ANCHORS[model].nozzles.map(([x, y, aperture]) => [y, -x, aperture] as const)
}
