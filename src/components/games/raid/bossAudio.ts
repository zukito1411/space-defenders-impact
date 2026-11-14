import { getGameAudioMixSettings, getGameSoundEnabled, getPublicAssetUrl } from '../sound'
import { isCommandBeam } from './commandBoss'
import type { BossAttackCue, Enemy } from './types'

const asset = (name: string) => getPublicAssetUrl(`audio/boss/${name}.ogg`)
const cues = {
  charge: { url: asset('beam-charge'), volume: .48, bus: 'beam' },
  beam: { url: asset('beam-fire'), volume: .76, bus: 'beam' },
  cannon: { url: asset('cannon'), volume: .46, bus: 'impact' },
  strike: { url: asset('creature-strike'), volume: .44, bus: 'impact' },
  venom: { url: asset('venom'), volume: .56, bus: 'impact' },
} as const
export const BOSS_AUDIO_URLS = Object.values(cues).map(({ url }) => url)

// One player per sample keeps multibarrel beams and crowded fights bounded.
const players = new Map<BossAttackCue, HTMLAudioElement>()

function playAttack(cue: BossAttackCue, seconds?: number) {
  if (typeof Audio === 'undefined' || !getGameSoundEnabled() || document.hidden) return
  const { url, volume, bus } = cues[cue]
  const mix = getGameAudioMixSettings()
  const gain = volume * mix.master * mix[bus]
  if (gain <= 0) return
  let audio = players.get(cue)
  if (!audio) {
    audio = new Audio(url)
    players.set(cue, audio)
  }
  if (cue === 'beam' || cue === 'strike' || cue === 'venom') players.get('charge')?.pause()
  if (cue !== 'charge' && !audio.paused && audio.currentTime < .15) return
  audio.currentTime = 0
  audio.volume = gain
  audio.playbackRate = cue === 'charge' && seconds ? Math.max(.75, Math.min(2.4, 1.21 / seconds)) : 1
  audio.preservesPitch = false
  void audio.play().catch(() => {})
}

export function stopBossAttackAudio() {
  for (const audio of players.values()) audio.pause()
}

export function markBossAttack(enemy: Enemy, cue: BossAttackCue, seconds?: number) {
  enemy.attackAudio = { serial: (enemy.attackAudio?.serial ?? 0) + 1, cue, seconds }
  playAttack(cue, seconds)
}

export function playGuestBossAttack(enemy: Enemy, previous?: Enemy) {
  const event = enemy.attackAudio
  if (previous && event && event.serial !== previous.attackAudio?.serial && Object.prototype.hasOwnProperty.call(cues, event.cue)) {
    playAttack(event.cue, event.seconds)
  }
}

export function commandBossReleaseCue(enemy: Enemy): BossAttackCue {
  return isCommandBeam(enemy.bossAttackPattern) ? 'beam' : 'cannon'
}
