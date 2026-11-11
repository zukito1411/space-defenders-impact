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

// Each tuple gives the outlet lip and open width in the square drawn by Canvas.
const nozzle = (x: number, y: number, width: number): readonly [number, number, number] => [(x - 144) / 288, (y - 144) / 288, width / 288]
const mesiahBlackNozzles = [nozzle(119, 269, 10), nozzle(144, 272, 23), nozzle(169, 269, 10)]

const RAID_SHIP_NOZZLES: Partial<Record<string, readonly ReturnType<typeof nozzle>[]>> = {
  rocket: [nozzle(115, 274, 18), nozzle(172, 274, 18)],
  fast: [nozzle(113, 273, 21), nozzle(143, 264, 10), nozzle(174, 273, 21)],
  gatling: [nozzle(117, 273, 19), nozzle(144, 261, 10), nozzle(171, 273, 19)],
  laser: [nozzle(95, 273, 22), nozzle(193, 273, 22)],
  dreadnought: [nozzle(144, 274, 23)],
  xwing: [nozzle(119, 261, 15), nozzle(143, 261, 12), nozzle(168, 261, 15)],
  spaceEt: [nozzle(114, 273, 22), nozzle(174, 273, 22)],
  mesiah: mesiahBlackNozzles,
  mesiahBlack: mesiahBlackNozzles,
  mesiahWhite: [nozzle(118, 271, 10), nozzle(144, 274, 23), nozzle(169, 271, 10)],
  rocketElite: [nozzle(115, 274, 19), nozzle(172, 274, 19)],
  fastElite: [nozzle(114, 273, 22), nozzle(173, 273, 22)],
  gatlingElite: [nozzle(116, 273, 21), nozzle(172, 273, 21)],
  laserElite: [nozzle(95, 274, 24), nozzle(193, 274, 24)],
  dreadnoughtElite: [nozzle(144, 274, 25)],
  xwingElite: [nozzle(118, 261, 16), nozzle(144, 261, 12), nozzle(169, 261, 16)],
  spaceEtElite: [nozzle(113, 273, 23), nozzle(176, 273, 23)],
  mesiahBlackElite: [nozzle(118, 272, 11), nozzle(144, 273, 24), nozzle(170, 272, 11)],
  mesiahWhiteElite: [nozzle(118, 273, 11), nozzle(144, 273, 24), nozzle(169, 273, 11)],
  mesiahRaptorBlack: [nozzle(143, 263, 21)],
  mesiahRaptorWhite: [nozzle(144, 263, 21)],
  coreLander: [nozzle(131, 188, 6), nozzle(143, 191, 7), nozzle(155, 188, 6)],
  coreLanderBurning: [nozzle(132, 198, 6), nozzle(143, 203, 7), nozzle(155, 198, 6)],
  coreLanderElite: [nozzle(144, 235, 21)],
  coreLanderBurningElite: [nozzle(144, 228, 21)],
  godGundam: [nozzle(139, 94, 7), nozzle(149, 94, 7)],
  godGundamBurning: [nozzle(139, 111, 7), nozzle(149, 111, 7)],
  spiegel: [nozzle(128, 85, 6), nozzle(159, 85, 6)],
}

export function getRaidShipNozzles(key: string) {
  return RAID_SHIP_NOZZLES[key]
}

export function usesRaidRemasteredHullArt(key: string) {
  // Keep the original sprite filters for the legacy Core Lander and Gundam PNGs.
  return key !== 'coreLander' && key !== 'coreLanderBurning' &&
    key !== 'godGundam' && key !== 'godGundamBurning' && key !== 'spiegel' && !!getRaidShipNozzles(key)
}

export function getRaidExhaustScale(key: string, outletCount: number) {
  if (key === 'godGundam' || key === 'godGundamBurning' || key === 'spiegel') return .28
  const base = getRaidShipBaseVisualKey(key)
  if (base === 'coreLander') return .74
  if (base === 'coreLanderBurning') return .62
  return outletCount === 1 ? .94 : .67
}
