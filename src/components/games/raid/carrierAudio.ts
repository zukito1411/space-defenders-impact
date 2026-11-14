import { getGameAudioMixSettings, getGameSoundEnabled } from '../sound'
import { CARRIER_DEPARTURE_START, CARRIER_IGNITION_START } from './carrierLaunch'
import { CARRIER_AUDIO } from './raidSoundtrack'

const cueWindows = [
  { start: CARRIER_IGNITION_START, end: CARRIER_DEPARTURE_START, url: CARRIER_AUDIO.ignition, gain: .66 },
  { start: CARRIER_DEPARTURE_START, end: CARRIER_DEPARTURE_START + 3.2, url: CARRIER_AUDIO.departure, gain: .56 },
] as const
const pending = new WeakSet<HTMLAudioElement>()
const nextAttempt = new WeakMap<HTMLAudioElement, number>()

function resumeSample(audio: HTMLAudioElement) {
  const now = performance.now()
  if (!audio.paused || audio.ended || audio.error || pending.has(audio) || now < (nextAttempt.get(audio) ?? 0)) return
  nextAttempt.set(audio, now + 800)
  pending.add(audio)
  void audio.play().catch(() => {}).finally(() => pending.delete(audio))
}

export function playHostileChannel(laugh = false) {
  const { master, ui } = getGameAudioMixSettings()
  if (!getGameSoundEnabled() || master * ui === 0) return
  const audio = new Audio(laugh ? CARRIER_AUDIO.reptiliorLaugh : CARRIER_AUDIO.interruption)
  audio.volume = (laugh ? .72 : .55) * master * ui
  void audio.play().catch(() => {})
  return () => audio.pause()
}

/** Sample the same launch clock on the host and on a guest. */
export class CarrierAudio {
  private bed: HTMLAudioElement | null = null
  private cue: HTMLAudioElement | null = null
  private activeCue: typeof cueWindows[number] | undefined

  update(insideBay: boolean, launchAge: number | null, paused: boolean) {
    const { master, ui } = getGameAudioMixSettings()
    const gain = getGameSoundEnabled() ? master * ui : 0
    const cue = launchAge === null ? undefined : cueWindows.find(({ start, end }) => launchAge >= start && launchAge < end)
    if (cue !== this.activeCue) {
      this.cue?.pause()
      this.cue = null
      this.activeCue = cue
    }
    if (!insideBay && this.bed) {
      this.bed.pause()
      this.bed = null
    }
    if (paused || gain === 0) {
      this.bed?.pause()
      this.cue?.pause()
      return
    }
    if (insideBay && !this.bed) {
      this.bed = new Audio(CARRIER_AUDIO.ambience)
      this.bed.loop = true
    }
    if (this.bed) {
      this.bed.volume = (cue ? .10 : .19) * gain
      resumeSample(this.bed)
    }
    if (cue && launchAge !== null) {
      if (!this.cue) {
        this.cue = new Audio(cue.url)
        this.cue.currentTime = launchAge - cue.start
      }
      this.cue.volume = cue.gain * gain
      resumeSample(this.cue)
    }
  }

  stop() {
    this.bed?.pause()
    this.cue?.pause()
    this.bed = null
    this.cue = null
    this.activeCue = undefined
  }
}
