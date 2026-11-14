import { getPublicAssetUrl } from '../sound'
import {
  RAID_BOSS_FINAL_BGM_TRACK, RAID_BOSS_SNAKE_BGM_TRACK, RAID_BOSS_SQUID_BGM_TRACK,
  RAID_DEFAULT_BGM_TRACK, RAID_ENDING_BGM_TRACK,
} from './constants'
import { cosmicRegionIndex } from './cosmos'
import type { BossKind, RaidBgmMode } from './types'

const audio = (name: string) => getPublicAssetUrl(`audio/mesiah/${name}.ogg`)

const regionTracks = [
  RAID_DEFAULT_BGM_TRACK, audio('amber-ringway'), audio('silent-fleet'), audio('violet-deepfield'),
] as const
const flightDeck = audio('flight-deck')
const commandFleet = audio('command-fleet')
const industrialCommand = audio('industrial-command')
const devilGundam = audio('devil-gundam')

export const CARRIER_AUDIO = {
  ambience: audio('hangar-bed'),
  ignition: audio('thruster-heat'),
  departure: audio('thruster-release'),
  interruption: audio('hostile-channel'),
} as const

export const RAID_SOUNDTRACK_URLS = [
  ...regionTracks, flightDeck, commandFleet, industrialCommand, devilGundam,
  RAID_BOSS_SQUID_BGM_TRACK, RAID_BOSS_SNAKE_BGM_TRACK, RAID_BOSS_FINAL_BGM_TRACK,
  RAID_ENDING_BGM_TRACK, ...Object.values(CARRIER_AUDIO),
]

export function getRaidBgmTrack(stage: number, mode: RaidBgmMode, boss: BossKind | null) {
  if (mode === 'ending') return RAID_ENDING_BGM_TRACK
  if (mode === 'hangar') return flightDeck
  if (mode !== 'boss') return regionTracks[cosmicRegionIndex(stage)] ?? RAID_DEFAULT_BGM_TRACK
  switch (boss) {
    case 'squid': return RAID_BOSS_SQUID_BGM_TRACK
    case 'snake': return RAID_BOSS_SNAKE_BGM_TRACK
    case 'final': return RAID_BOSS_FINAL_BGM_TRACK
    case 'devil': return devilGundam
    case 'gate':
    case 'hydra':
    case 'super': return industrialCommand
    default: return commandFleet
  }
}

export const RAID_BGM_LEVEL: Record<RaidBgmMode, number> = {
  cruise: .22, combat: .34, boss: .52, ending: .42, hangar: .18,
}
