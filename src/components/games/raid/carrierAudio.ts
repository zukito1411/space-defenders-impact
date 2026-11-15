import { useEffect } from 'react'
import { getGameAudioMixSettings, getGameSoundEnabled } from '../sound'
import { CARRIER_DEPARTURE_START, CARRIER_IGNITION_START } from './carrierLaunch'
import { CARRIER_AUDIO } from './raidSoundtrack'
import { SampleScene } from '../presentationAudio'

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

const transmission = {
  link: { url: CARRIER_AUDIO.link, gain: .42 },
  static: { url: CARRIER_AUDIO.interruption, gain: .55 },
  laugh: { url: CARRIER_AUDIO.reptiliorLaugh, gain: .72 },
} as const

export function useTransmission(cue: keyof typeof transmission | null, signal: string | number = '') {
  useEffect(() => {
    if (!cue || document.hidden) return
    return playTransmission(cue)
  }, [cue, signal])
}

function playTransmission(cue: keyof typeof transmission) {
  const { master, ui } = getGameAudioMixSettings()
  if (!getGameSoundEnabled() || master * ui === 0) return
  const { url, gain } = transmission[cue]
  const audio = new Audio(url)
  audio.volume = gain * master * ui
  const retry = () => {
    if (getGameSoundEnabled() && !document.hidden && audio.paused && !audio.ended) {
      void audio.play().catch(() => {})
    }
  }
  const pausedWhenHidden = () => { if (document.hidden) audio.pause() }
  window.addEventListener('click', retry, { once: true })
  document.addEventListener('visibilitychange', pausedWhenHidden)
  retry()
  return () => {
    window.removeEventListener('click', retry)
    document.removeEventListener('visibilitychange', pausedWhenHidden)
    audio.pause()
  }
}

const hangarLayers = [
  { url: CARRIER_AUDIO.ambience, gain: .19 },
  { url: CARRIER_AUDIO.ventilation, gain: .20 },
] as const

/** Sample the same launch clock on the host and on a guest. */
export class CarrierAudio {
  private beds: HTMLAudioElement[] = []
  private cue: HTMLAudioElement | null = null
  private activeCue: typeof cueWindows[number] | undefined
  private foley = new SampleScene()
  private wasInside = false
  private nextFoley = 0
  private nextAnnouncement = 0
  private foleyStep = 0

  update(insideBay: boolean, launchAge: number | null, paused: boolean, language = 'en') {
    const { master, ui } = getGameAudioMixSettings()
    const gain = getGameSoundEnabled() ? master * ui : 0
    const cue = launchAge === null ? undefined : cueWindows.find(({ start, end }) => launchAge >= start && launchAge < end)
    if (cue !== this.activeCue) {
      this.cue?.pause()
      this.cue = null
      this.activeCue = cue
    }
    if (!insideBay && this.beds.length) {
      this.beds.forEach(audio => audio.pause())
      this.beds = []
    }
    if (paused || gain === 0) {
      this.beds.forEach(audio => audio.pause())
      this.cue?.pause()
      this.foley.stop()
      return
    }
    const now = performance.now()
    if (insideBay && !this.wasInside) {
      this.nextFoley = now + 5500
      this.nextAnnouncement = now + 38000
    }
    if (insideBay && launchAge === null) {
      if (now >= this.nextFoley) {
        this.foleyStep++
        this.nextFoley = now + 9000 + this.foleyStep % 3 * 2300
        this.foley.play(this.foleyStep % 3 ? 'crew-tools' : 'cargo', .13,
          this.foleyStep % 2 ? -.48 : .45, 'ui', 0, 0, 6000)
      }
      if (language === 'en' && now >= this.nextAnnouncement) {
        this.nextAnnouncement = now + 48000
        this.foley.play(this.foleyStep % 2 ? 'pa-clear-lane' : 'pa-maintenance', .14, -.12, 'ui', 0, 0, 40000)
      }
    }
    if (!insideBay && this.wasInside) {
      this.foley.stop()
      if (launchAge !== null) this.foley.play('deploy', .18, 0, 'ui', 1, 0, 4000)
    }
    this.wasInside = insideBay
    if (insideBay && !this.beds.length) {
      this.beds = hangarLayers.map(({ url }) => {
        const audio = new Audio(url)
        audio.loop = true
        return audio
      })
    }
    this.beds.forEach((audio, index) => {
      audio.volume = hangarLayers[index].gain * (cue ? .48 : 1) * gain
      resumeSample(audio)
    })
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
    this.beds.forEach(audio => audio.pause())
    this.cue?.pause()
    this.beds = []
    this.cue = null
    this.activeCue = undefined
    this.foley.stop()
    this.wasInside = false
  }
}

export function useHangarAmbience(active: boolean, language = 'en') {
  useEffect(() => {
    if (!active) return
    const audio = new CarrierAudio()
    const sync = () => audio.update(true, null, document.hidden, language)
    sync()
    const timer = window.setInterval(sync, 300)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', sync)
      audio.stop()
    }
  }, [active, language])
}
