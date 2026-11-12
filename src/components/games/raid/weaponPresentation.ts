import type { Shot } from './types'

/** Cached atlas materials: distinct ignition profiles, no live image filters. */
export function getWeaponIgnition(kind: Shot['kind']) {
  if (kind === 'laser' || kind === 'needle') return { tile: 5, width: 26, height: 16, duration: 90 }
  if (kind === 'rocket' || kind === 'homing') return { tile: 15, width: 24, height: 30, duration: 100 }
  if (kind === 'scatter' || kind === 'spread') return { tile: 6, width: 23, height: 20, duration: 75 }
  if (kind === 'coreBlast' || kind === 'spiegelKunai') return { tile: 9, width: 25, height: 25, duration: 110 }
  return { tile: 15, width: 17, height: 19, duration: 65 }
}
