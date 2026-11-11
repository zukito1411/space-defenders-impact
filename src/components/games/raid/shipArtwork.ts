// Cosmetic art keys retain the original gameplay ship key in saves and co-op.
export const RAID_ELITE_FRAME_PATHS = {
  rocketElite: 'assets/ships/black-comet-elite-remaster-v1.webp',
  fastElite: 'assets/ships/red-wraith-elite-remaster-v1.webp',
  gatlingElite: 'assets/ships/crimson-saw-elite-remaster-v1.webp',
  laserElite: 'assets/ships/night-lance-elite-remaster-v1.webp',
  dreadnoughtElite: 'assets/ships/obsidian-ark-elite-remaster-v1.webp',
  xwingElite: 'assets/ships/crosswing-nova-elite-remaster-v1.webp',
  spaceEtElite: 'assets/ships/space-jet-elite-remaster-v1.webp',
  mesiahBlackElite: 'assets/ships/mesiah-black-elite-remaster-v1.webp',
  mesiahWhiteElite: 'assets/ships/mesiah-white-elite-remaster-v1.webp',
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

// Each tuple gives the center and open width of one outlet in the 288px sprite.
type ShipNozzle = readonly [offsetX: number, offsetY: number, aperture: number]
const nozzle = (x: number, y: number, width: number): ShipNozzle => [(x - 144) / 288, (y - 144) / 288, width / 288]
const mesiahNozzles = [nozzle(118, 264, 10), nozzle(144, 266, 23), nozzle(169, 264, 10)]
const mesiahEliteNozzles = [nozzle(118, 267, 11), nozzle(144, 268, 24), nozzle(170, 267, 11)]

const RAID_SHIP_NOZZLES: Partial<Record<string, readonly ShipNozzle[]>> = {
  rocket: [nozzle(115, 266, 18), nozzle(172, 266, 18)],
  fast: [nozzle(114, 266, 21), nozzle(143, 260, 11), nozzle(173, 266, 21)],
  gatling: [nozzle(117, 266, 19), nozzle(144, 256, 10), nozzle(171, 266, 19)],
  laser: [nozzle(96, 267, 23), nozzle(192, 267, 23)],
  dreadnought: [nozzle(144, 268, 23)],
  xwing: [nozzle(119, 255, 15), nozzle(143, 255, 12), nozzle(168, 255, 15)],
  spaceEt: [nozzle(114, 267, 22), nozzle(174, 267, 22)],
  mesiah: mesiahNozzles,
  mesiahBlack: mesiahNozzles,
  mesiahWhite: mesiahNozzles,
  rocketElite: [nozzle(115, 266, 19), nozzle(172, 266, 19)],
  fastElite: [nozzle(114, 266, 22), nozzle(173, 266, 22)],
  gatlingElite: [nozzle(116, 266, 21), nozzle(172, 266, 21)],
  laserElite: [nozzle(94, 267, 24), nozzle(193, 267, 24)],
  dreadnoughtElite: [nozzle(144, 268, 25)],
  xwingElite: [nozzle(119, 253, 16), nozzle(144, 252, 12), nozzle(170, 253, 16)],
  spaceEtElite: [nozzle(113, 267, 23), nozzle(176, 267, 23)],
  mesiahBlackElite: mesiahEliteNozzles,
  mesiahWhiteElite: mesiahEliteNozzles,
}

export function getRaidShipNozzles(key: string) {
  return RAID_SHIP_NOZZLES[key]
}

const CORE_LANDER_ELITE_NOZZLE_Y = .309
const CORE_LANDER_BURNING_ELITE_NOZZLE_Y = .285

export function getRaidShipNozzleY(key: string) {
  if (key === 'coreLanderElite') return CORE_LANDER_ELITE_NOZZLE_Y
  if (key === 'coreLanderBurningElite') return CORE_LANDER_BURNING_ELITE_NOZZLE_Y
  return getRaidShipNozzles(key)?.[0][1]
}

export function getEliteCoreLanderNozzleY(burningBlend: number) {
  const burning = CORE_LANDER_BURNING_ELITE_NOZZLE_Y * 1.06
  return CORE_LANDER_ELITE_NOZZLE_Y + (burning - CORE_LANDER_ELITE_NOZZLE_Y) * burningBlend
}
