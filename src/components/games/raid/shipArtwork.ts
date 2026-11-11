// Cosmetic art keys retain the original gameplay ship key in saves and co-op.
export const RAID_ELITE_FRAME_PATHS = {
  rocketElite: 'assets/ships/black-comet-elite.webp',
  fastElite: 'assets/ships/red-wraith-elite.webp',
  gatlingElite: 'assets/ships/crimson-saw-elite.webp',
  laserElite: 'assets/ships/night-lance-elite.webp',
  dreadnoughtElite: 'assets/ships/obsidian-ark-elite.webp',
  xwingElite: 'assets/ships/crosswing-nova-elite.webp',
  spaceEtElite: 'assets/ships/space-jet-elite.webp',
  mesiahBlackElite: 'assets/ships/mesiah-elite-black.webp',
  mesiahWhiteElite: 'assets/ships/mesiah-elite-white.webp',
  coreLanderElite: 'assets/ships/core-lander-elite.webp',
  coreLanderBurningElite: 'assets/ships/core-lander-burning-elite.webp',
} as const

export const RAID_ELITE_FRAME_KEYS = Object.keys(RAID_ELITE_FRAME_PATHS)
const eliteFrameKeys = new Set(RAID_ELITE_FRAME_KEYS)

export function isRaidEliteFrameKey(key: string) {
  return eliteFrameKeys.has(key)
}

export function getRaidShipFrameKey(key: string, equipped: boolean) {
  const eliteKey = `${key}Elite`
  return equipped && isRaidEliteFrameKey(eliteKey) ? eliteKey : key
}

export function getRaidShipBaseVisualKey(key: string) {
  return isRaidEliteFrameKey(key) ? key.slice(0, -'Elite'.length) : key
}

// Nozzle positions are measured from the center of each square sprite.
const RAID_SHIP_NOZZLE_Y: Partial<Record<string, number>> = {
  rocket: .444,
  fast: .399,
  gatling: .365,
  dreadnought: .444,
  rocketElite: .444,
  fastElite: .444,
  gatlingElite: .392,
  laserElite: .444,
  dreadnoughtElite: .444,
  xwingElite: .319,
  spaceEtElite: .333,
  mesiahBlackElite: .444,
  mesiahWhiteElite: .444,
  coreLanderElite: .309,
  coreLanderBurningElite: .285,
}

export function getRaidShipNozzleY(key: string) {
  return RAID_SHIP_NOZZLE_Y[key]
}

export function getEliteCoreLanderNozzleY(burningBlend: number) {
  const flight = RAID_SHIP_NOZZLE_Y.coreLanderElite!
  const burning = RAID_SHIP_NOZZLE_Y.coreLanderBurningElite! * 1.06
  return flight + (burning - flight) * burningBlend
}
