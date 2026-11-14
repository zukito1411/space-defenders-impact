import { getPublicAssetUrl } from '../sound'
import { RAID_DEFAULT_BGM_TRACK, RAID_ENDING_BGM_TRACK } from './constants'
import { cosmicRegionIndex } from './cosmos'
import type { BossKind, RaidBgmMode } from './types'

const audio = (name: string) => getPublicAssetUrl(`audio/mesiah/${name}.ogg`)

const regionTracks = [
  RAID_DEFAULT_BGM_TRACK, audio('amber-ringway'), audio('silent-fleet'), audio('violet-deepfield'),
] as const
const flightDeck = audio('flight-deck')
const bossTracks = {
  command: getPublicAssetUrl('audio/sfx_boss_battle.mp3'),
  squid: getPublicAssetUrl('audio/bgm_boss_squid.mp3'),
  snake: getPublicAssetUrl('audio/bgm_boss_snake.mp3'),
  final: getPublicAssetUrl('audio/bgm_boss_final.wav'),
} as const

export const CARRIER_AUDIO = {
  ambience: audio('hangar-bed'),
  ignition: audio('thruster-heat'),
  departure: audio('thruster-release'),
  interruption: audio('hostile-channel'),
  reptiliorLaugh: audio('reptilior-laugh'),
} as const

export const RAID_SOUNDTRACK_URLS = [
  ...regionTracks, flightDeck, ...Object.values(bossTracks),
  RAID_ENDING_BGM_TRACK, ...Object.values(CARRIER_AUDIO),
]

export function getRaidBgmTrack(stage: number, mode: RaidBgmMode, boss: BossKind | null) {
  if (mode === 'ending') return RAID_ENDING_BGM_TRACK
  if (mode === 'hangar') return flightDeck
  if (mode !== 'boss') return regionTracks[cosmicRegionIndex(stage)] ?? RAID_DEFAULT_BGM_TRACK
  switch (boss) {
    case 'squid':
    case 'snake':
      return bossTracks[boss]
    case 'final':
    case 'devil': return bossTracks.final
    default: return bossTracks.command
  }
}

export const RAID_BGM_LEVEL: Record<RaidBgmMode, number> = {
  cruise: .22, combat: .34, boss: .58, ending: .42, hangar: .18,
}
