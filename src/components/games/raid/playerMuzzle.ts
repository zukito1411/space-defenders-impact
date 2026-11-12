import { HEIGHT, WIDTH } from './constants'
import type { Shot, Vec } from './types'

type PlayerShot = Omit<Shot, 'id'>

export function getRaidPlayerHullSize(shipKey: string, viewportWidth: number, landscape = false, sizeScale = 1) {
  const scale = Number.isFinite(sizeScale) ? Math.max(1, Math.min(1.5, sizeScale)) : 1
  const size = (viewportWidth < 860 ? 62 : viewportWidth > 1100 ? 86 : 76) * (landscape ? 1.15 : 1) * scale
  if (shipKey === 'mesiah') return size * 1.78
  if (shipKey === 'coreLander') return size * 1.38
  return size * 1.16
}

/** Match the same square sprite and bank rotation used to paint the ship. */
export function createRaidMainShotEmitter(
  emit: (shot: PlayerShot) => void,
  ship: Vec,
  shipKey: string,
  combatModel: boolean,
  viewportWidth: number,
  viewportHeight: number,
  bank: number,
  landscape = false,
  sizeScale = 1,
) {
  const size = getRaidPlayerHullSize(shipKey, viewportWidth, landscape, sizeScale) * (combatModel ? 1.08 : 1)
  const sx = size * WIDTH / viewportWidth
  const sy = size * HEIGHT / viewportHeight
  const sin = Math.sin(bank)
  const cos = Math.cos(bank)
  const nose = combatModel ? -.13 : shipKey === 'coreLander' ? -.40 : -.448

  return (shot: PlayerShot, wingCannon = false) => {
    const spread = shot.x - ship.x
    const side = Math.sign(spread)
    let x = Math.max(-.055, Math.min(.055, spread * .016))
    let y = nose

    if (wingCannon && shipKey === 'xwing') {
      x = side * .28
      y = -.335
    } else if ((shot.kind === 'rocket' || shot.kind === 'homing') && side !== 0) {
      // Multi-missile launches stay on the hull's paired hardpoints.
      x = side * Math.min(.18, .07 + Math.abs(spread) * .015)
      y = shot.y > ship.y ? .015 : -.12
    }

    shot.x = ship.x + (x * cos - y * sin) * sx
    shot.y = ship.y + (x * sin + y * cos) * sy
    emit(shot)
  }
}
