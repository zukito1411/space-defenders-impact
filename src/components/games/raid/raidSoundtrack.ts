import { getPublicAssetUrl } from '../sound'
import { RAID_DEFAULT_BGM_TRACK, RAID_ENDING_BGM_TRACK } from './constants'
import { cosmicRegionIndex } from './cosmos'
import type { BossKind, RaidBgmMode } from './types'

const audio = (name: string) => getPublicAssetUrl(`audio/mesiah/${name}.ogg`)

const regionTracks = [
  RAID_DEFAULT_BGM_TRACK, audio('amber-ringway'), audio('silent-fleet'), audio('violet-deepfield'),
] as const
const flightDeck = audio('flight-deck')
const bossAudio = (name: string) => getPublicAssetUrl(`audio/boss/${name}.ogg`)
const bossTracks = {
  command: bossAudio('command-assault'), industrial: bossAudio('heavy-ordnance'),
  squid: bossAudio('pelagic-pursuit'), snake: bossAudio('cinder-showdown'),
  final: bossAudio('fortress-siege'), devil: bossAudio('devil-breakout'),
} as const

export const CARRIER_AUDIO = {
  ambience: audio('hangar-bed'),
  ignition: audio('thruster-heat'),
  departure: audio('thruster-release'),
  interruption: audio('hostile-channel'),
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
    case 'final':
    case 'devil': return bossTracks[boss]
    case 'gate':
    case 'hydra':
    case 'super': return bossTracks.industrial
    default: return bossTracks.command
  }
}

export const RAID_BGM_LEVEL: Record<RaidBgmMode, number> = {
  cruise: .22, combat: .34, boss: .52, ending: .42, hangar: .18,
}
