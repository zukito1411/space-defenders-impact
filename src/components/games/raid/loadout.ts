import { EMPTY_WEAPONS, EMPTY_WEAPON_TIMERS, WEAPON_KEYS } from './constants'
import { restorePassiveForceField } from './mechanics'
import type { Player } from './types'

export function getPowerScore(player: Player) {
  let score = 0
  for (const key of WEAPON_KEYS) score += player.weapons[key]
  return score
}

export function clearPickupLoadout(player: Player) {
  player.optionTimer = 0
  player.optionStacks = 0
  for (const key of WEAPON_KEYS) {
    player.weapons[key] = 0
    player.weaponTimers[key] = 0
    player.weaponCooldowns[key] = 0
  }
}

export function resetStageLoadout(player: Player) {
  player.weapons = { ...EMPTY_WEAPONS }
  player.weaponTimers = { ...EMPTY_WEAPON_TIMERS }
  player.optionTimer = 0
  player.optionStacks = 0
  player.shield = 0
  player.forceField = 0
  restorePassiveForceField(player)
  player.weaponCooldowns = { ...EMPTY_WEAPON_TIMERS }
}

export function extendLoadoutForSuperBoss(player: Player) {
  if (player.shield > 0) {
    player.shield = Math.min(8, player.shield + 3)
  }
}
