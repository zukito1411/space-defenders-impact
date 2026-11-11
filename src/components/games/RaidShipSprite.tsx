import { RAID_ELITE_FRAME_PATHS } from './raid/shipArtwork'
import { getPublicAssetUrl } from './sound'
import { LEGACY_FIGHTER_COUNT, RAID_FIGHTER_ASSETS } from './raid/stageEncounters'

export const RAID_SHIP_SPRITE_PATHS: Record<string, string> = {
  rocket: 'assets/ships/black-comet-v2.webp',
  fast: 'assets/ships/red-wraith-v2.webp',
  gatling: 'assets/ships/crimson-saw-v2.webp',
  laser: 'assets/ships/night-lance.png',
  dreadnought: 'assets/ships/obsidian-ark-v2.webp',
  xwing: 'assets/ships/x-wing.png',
  spaceEt: 'assets/ships/space-jet.png',
  mesiah: 'assets/ships/mesiah-black.png',
  mesiahBlack: 'assets/ships/mesiah-black.png',
  mesiahWhite: 'assets/ships/mesiah-white.png',
  mesiahRaptorBlack: 'assets/ships/mesiah-raptor-black.png',
  mesiahRaptorWhite: 'assets/ships/mesiah-raptor-white.png',
  coreLander: 'assets/ships/core-lander.png',
  coreLanderBurning: 'assets/ships/core-lander-burning.png',
  godGundam: 'assets/ships/god-gundam.png',
  godGundamBurning: 'assets/ships/god-gundam-burning.png',
  spiegel: 'assets/ships/spiegel.png',
  ...RAID_ELITE_FRAME_PATHS,
}

const RAID_ALIEN_SPRITE_PATHS = [
  ...Array.from({ length: LEGACY_FIGHTER_COUNT }, (_, index) => `assets/aliens/alien_v${index}.png`),
  ...RAID_FIGHTER_ASSETS,
]
export const RAID_ALIEN_SPRITE_COUNT = RAID_ALIEN_SPRITE_PATHS.length
const RAID_ELITE_ASSET_PATHS = [
  'assets/aliens/elite_0.png',
  'assets/aliens/elite_1.png',
  'assets/aliens/elite_2.png',
  'assets/aliens/elite_3.png',
  'assets/aliens/elite_4.png',
] as const
export const RAID_ELITE_SPRITE_COUNT = RAID_ELITE_ASSET_PATHS.length

export function getRaidShipSpriteUrl(shipKey: string) {
  return getPublicAssetUrl(RAID_SHIP_SPRITE_PATHS[shipKey] ?? RAID_SHIP_SPRITE_PATHS.rocket)
}

export function getRaidAlienSpriteUrl(variant: number) {
  const normalizedVariant = Number.isFinite(variant) ? Math.abs(Math.trunc(variant)) : 0
  const index = normalizedVariant % RAID_ALIEN_SPRITE_COUNT
  return getPublicAssetUrl(RAID_ALIEN_SPRITE_PATHS[index])
}

export function getRaidEliteSpriteUrl(variant: number) {
  const normalizedVariant = Number.isFinite(variant) ? Math.abs(Math.trunc(variant)) : 0
  const index = normalizedVariant % RAID_ELITE_SPRITE_COUNT
  return getPublicAssetUrl(RAID_ELITE_ASSET_PATHS[index])
}

export function RaidShipSprite({ shipKey, size, className = 'raid__ship-sprite' }: { shipKey: string; size: number; className?: string }) {
  return (
    <img
      className={className}
      src={getRaidShipSpriteUrl(shipKey)}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ width: size, height: size }}
    />
  )
}
