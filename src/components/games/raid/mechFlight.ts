import type { CoreLanderCombatModel, Shot } from './types'

type Point = readonly [number, number]
/** Measured on the 1536x1024 v2 art, in physical right-facing hull-size units. */
export const MECH_FLIGHT_ANCHORS = {
  godGundam: {
    head: [.335, -.105], hand: [.468, -.04],
    shoulders: [[.176, -.144], [.376, -.074]],
    nozzles: [[.078, -.094, .018], [-.370, .068, .016], [-.279, .167, .016]],
  },
  spiegel: {
    head: [.215, -.09], hand: [.467, -.045],
    shoulders: [[.02, -.145], [.255, -.04]],
    nozzles: [[-.128, -.147, .018], [-.128, -.092, .018]],
  },
} as const

/** Shoulder ballistics, head pickups and hand techniques have separate origins. */
export function getMechShotAnchor(model: CoreLanderCombatModel, kind: Shot['kind'], lane: number, landscape: boolean): Point {
  const side = lane < 0 ? 0 : 1
  if (!landscape) {
    if (kind === 'coreBlast') return [.23, -.04]
    if (kind === 'spiegelKunai') return [.23, -.03]
    if (kind === 'laser' || kind === 'needle') return [side ? .035 : -.035, -.34]
    return [side ? .16 : -.16, -.24]
  }
  const map = MECH_FLIGHT_ANCHORS[model]
  const point = kind === 'coreBlast' || kind === 'spiegelKunai' ? map.hand
    : kind === 'laser' || kind === 'needle' ? map.head : map.shoulders[side]
  // The physical camera turns clockwise; undo it before emitting into logical space.
  return [point[1], -point[0]]
}

export function getMechFlightNozzles(model: CoreLanderCombatModel) {
  return MECH_FLIGHT_ANCHORS[model].nozzles.map(([x, y, aperture]) => [y, -x, aperture] as const)
}
