import { FORCE_FIELD_ARMOR, SPACE_ET_PASSIVE_FORCE_FIELD_CHARGES, WEAPON_STACK_CAPS } from './constants'
import type { Player, PowerKind, PowerUp } from './types'

export function getRaidForceFieldCap(pilot: Player) {
  return FORCE_FIELD_ARMOR + (pilot.ship.key === 'spaceEt' ? SPACE_ET_PASSIVE_FORCE_FIELD_CHARGES : 0)
}

export function canUseRaidPickup(pilot: Player, type: PowerKind, meleeOnly: boolean) {
  if (pilot.hp <= 0) return false
  switch (type) {
    case 'levelup': return true
    case 'repair': return pilot.hp < pilot.maxHp
    case 'shield': return pilot.shield < 8
    case 'forcefield': return pilot.forceField < getRaidForceFieldCap(pilot)
    case 'option': return !meleeOnly && (pilot.ship.key === 'mesiah' ? pilot.optionStacks < 2 : pilot.optionTimer <= 0)
    default: return !meleeOnly && pilot.weapons[type] < WEAPON_STACK_CAPS[type]
  }
}

function pickupDistance(power: PowerUp, pilot: Player, meleeOnly: boolean, rangeSq: number) {
  const dx = pilot.x - power.x
  const dy = pilot.y - power.y
  const distance = dx * dx + dy * dy
  return distance <= rangeSq && canUseRaidPickup(pilot, power.type, meleeOnly) ? distance : Infinity
}

/** Use the same recipient rules for the tractor pull and physical collection. */
export function pickRaidPickupPilot(power: PowerUp, pilot: Player, ally: Player | null,
  range: number, meleeOnly: boolean, allyMeleeOnly: boolean) {
  const rangeSq = range * range
  const distance = pickupDistance(power, pilot, meleeOnly, rangeSq)
  const allyDistance = ally ? pickupDistance(power, ally, allyMeleeOnly, rangeSq) : Infinity
  if (allyDistance < distance) return ally
  return distance < Infinity ? pilot : null
}
