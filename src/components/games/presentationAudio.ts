import { getGameAudioMixSettings, getGameSoundEnabled } from './sound'
import type { AudioMixSettings } from './sound'
import { IMMERSION_CLIPS, SCORE_STEMS } from './presentationAssets'
import type { ImmersionClip } from './presentationAssets'

type Bus = Exclude<keyof AudioMixSettings, 'master'>
let context: AudioContext | null = null
let master: DynamicsCompressorNode | null = null
const buffers = new Map<ImmersionClip, AudioBuffer>()
const pending = new Map<ImmersionClip, Promise<AudioBuffer | null>>()
let bytes = 0
const BUFFER_BUDGET = 16 * 1024 * 1024
const voices = new Set<{ source: AudioBufferSourceNode; gain: GainNode; priority: number; owner: SampleScene }>()
const levels = new Map<GainNode, { bus: Bus; gain: number }>()

function audioContext() {
  if (context || typeof window === 'undefined') return context
  const Constructor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Constructor) return null
  context = new Constructor()
  master = context.createDynamicsCompressor()
  master.threshold.value = -12
  master.knee.value = 12
  master.ratio.value = 4
  master.attack.value = .003
  master.release.value = .18
  master.connect(context.destination)
  const unlock = () => { if (context?.state === 'suspended') void context.resume().catch(() => {}) }
  window.addEventListener('pointerup', unlock)
  window.addEventListener('keydown', unlock)
  const refresh = () => {
    for (const [node, settings] of levels) node.gain.setTargetAtTime(level(settings.bus, settings.gain), context!.currentTime, .015)
  }
  window.addEventListener('game-audio-settings', refresh)
  document.addEventListener('visibilitychange', refresh)
  return context
}

async function load(clip: ImmersionClip): Promise<AudioBuffer | null> {
  const cached = buffers.get(clip)
  if (cached) return cached
  const waiting = pending.get(clip)
  if (waiting) return waiting
  const ctx = audioContext()
  if (!ctx) return null
  const task = fetch(IMMERSION_CLIPS[clip]).then(response => {
    if (!response.ok) throw new Error('Optional immersion sample unavailable')
    return response.arrayBuffer()
  }).then(data => ctx.decodeAudioData(data)).then(buffer => {
    const size = buffer.length * buffer.numberOfChannels * 4
    while (bytes + size > BUFFER_BUDGET && buffers.size) {
      const oldest = buffers.keys().next().value!
      const old = buffers.get(oldest)!
      bytes -= old.length * old.numberOfChannels * 4
      buffers.delete(oldest)
    }
    buffers.set(clip, buffer)
    bytes += size
    return buffer
  }).catch(() => null).finally(() => pending.delete(clip))
  pending.set(clip, task)
  return task
}

export function warmImmersionAudio() {
  return Promise.all((['field-hit', 'shield-hit', 'combined-hit', 'field-break', 'shield-break', 'hull-hit', 'repair',
    'fighter-death', 'armored-death', 'capital-death', 'deploy', 'synergy', 'hq-warning'] as ImmersionClip[]).map(load)).then(() => {})
}

function level(bus: Bus, gain: number) {
  if (!getGameSoundEnabled() || (typeof document !== 'undefined' && document.hidden)) return 0
  const mix = getGameAudioMixSettings()
  return Math.max(0, Math.min(.8, gain * mix.master * mix[bus]))
}

type Loop = { clip: ImmersionClip; source: AudioBufferSourceNode; gain: GainNode; pan: StereoPannerNode | null }
/** Shared decoded recordings, bounded one-shots and owner-scoped loop teardown. */
export class SampleScene {
  private loops = new Map<string, Loop>()
  private requests = new Map<string, ImmersionClip>()
  private lastCue = new Map<string, number>()
  private generation = 0
  private loopSources = new Set<AudioBufferSourceNode>()

  play(clip: ImmersionClip, gain = .45, pan = 0, bus: Bus = 'impact', priority = 2, delay = 0, cooldown = 90) {
    const ctx = audioContext()
    const volume = level(bus, gain)
    if (!ctx || ctx.state !== 'running' || volume <= .0001) return
    const now = performance.now()
    if (now - (this.lastCue.get(clip) ?? -Infinity) < cooldown) return
    this.lastCue.set(clip, now)
    const generation = this.generation
    void load(clip).then(buffer => {
      if (!buffer || generation !== this.generation || ctx.state !== 'running' || level(bus, gain) <= 0) return
      if (voices.size >= 12) {
        const candidate = [...voices].find(voice => voice.priority < priority)
        if (!candidate) return
        candidate.source.stop()
        voices.delete(candidate)
      }
      const source = ctx.createBufferSource(), envelope = ctx.createGain()
      source.buffer = buffer
      envelope.gain.value = level(bus, gain)
      levels.set(envelope, { bus, gain })
      source.connect(envelope)
      const stereo = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null
      if (stereo) { stereo.pan.value = Math.max(-1, Math.min(1, pan)); envelope.connect(stereo); stereo.connect(master!) }
      else envelope.connect(master!)
      const voice = { source, gain: envelope, priority, owner: this }
      voices.add(voice)
      source.onended = () => { voices.delete(voice); levels.delete(envelope); source.disconnect(); envelope.disconnect(); stereo?.disconnect() }
      source.start(ctx.currentTime + Math.max(0, delay))
    })
  }

  loop(slot: string, clip: ImmersionClip | null, gain: number, rate = 1, pan = 0, bus: Bus = 'bgm') {
    const ctx = audioContext()
    const volume = level(bus, gain)
    let current = this.loops.get(slot)
    if (!clip || volume <= .0001 || !ctx || ctx.state !== 'running') {
      this.requests.delete(slot)
      if (current) { current.source.stop(); this.loops.delete(slot) }
      return
    }
    if (current?.clip === clip) {
      levels.set(current.gain, { bus, gain })
      current.gain.gain.setTargetAtTime(volume, ctx.currentTime, .12)
      current.source.playbackRate.setTargetAtTime(Math.max(.5, Math.min(1.8, rate)), ctx.currentTime, .13)
      current.pan?.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), ctx.currentTime, .13)
      return
    }
    if (this.requests.get(slot) === clip) return
    this.requests.set(slot, clip)
    const generation = this.generation
    void load(clip).then(buffer => {
      if (!buffer || generation !== this.generation || this.requests.get(slot) !== clip || ctx.state !== 'running' || level(bus, gain) <= 0) {
        if (this.requests.get(slot) === clip) this.requests.delete(slot)
        return
      }
      current = this.loops.get(slot)
      if (current) { levels.delete(current.gain); current.gain.gain.setTargetAtTime(.0001, ctx.currentTime, .06); current.source.stop(ctx.currentTime + .3) }
      const source = ctx.createBufferSource(), envelope = ctx.createGain()
      source.buffer = buffer
      source.loop = true
      source.playbackRate.value = Math.max(.5, Math.min(1.8, rate))
      envelope.gain.value = 0
      envelope.gain.setTargetAtTime(level(bus, gain), ctx.currentTime, .15)
      levels.set(envelope, { bus, gain })
      source.connect(envelope)
      const stereo = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null
      if (stereo) { stereo.pan.value = pan; envelope.connect(stereo); stereo.connect(master!) }
      else envelope.connect(master!)
      this.loopSources.add(source)
      source.onended = () => { this.loopSources.delete(source); levels.delete(envelope); source.disconnect(); envelope.disconnect(); stereo?.disconnect() }
      source.start()
      this.loops.set(slot, { clip, source, gain: envelope, pan: stereo })
      this.requests.delete(slot)
    })
  }

  stop() {
    this.generation++
    this.stopLoops()
    for (const voice of voices) if (voice.owner === this) { voice.source.stop(); voices.delete(voice) }
  }

  stopLoops() {
    this.requests.clear()
    for (const loop of this.loops.values()) loop.gain.gain.value = 0
    for (const source of this.loopSources) { try { source.stop() } catch { /* Already ended during a scene transition. */ } }
    this.loopSources.clear()
    this.loops.clear()
  }
}

/** Stream the score's own percussion stem, locked to the existing BGM transport. */
export class AdaptiveScore {
  private audio: HTMLAudioElement | null = null
  private url = ''
  private pending = false
  private epoch = 0
  private nextAttempt = 0
  private active = false
  private original: HTMLAudioElement | null = null
  private silence = () => {
    if (this.audio) { this.audio.volume = 0; if (!getGameSoundEnabled() || document.hidden) this.audio.pause() }
  }

  update(original: HTMLAudioElement | null, track: string, pressure: number, active: boolean) {
    const url = SCORE_STEMS[track]
    const mix = getGameAudioMixSettings()
    const target = active && original && !original.paused && url && getGameSoundEnabled() && !document.hidden
      ? Math.max(0, Math.min(.21, pressure * pressure * .21)) * mix.master * mix.bgm : 0
    this.active = !!target
    this.original = original
    if (!target) { if (this.audio) { this.audio.pause(); this.audio.volume = 0 } return }
    if (!this.audio) {
      this.audio = new Audio(); this.audio.loop = true; this.audio.preload = 'auto'; this.audio.volume = 0
      this.audio.onloadedmetadata = () => { if (this.original && this.audio) this.audio.currentTime = this.original.currentTime }
      window.addEventListener('game-audio-settings', this.silence)
      document.addEventListener('visibilitychange', this.silence)
    }
    const audio = this.audio
    if (this.url !== url) { this.url = url; this.epoch++; this.pending = false; audio.pause(); audio.src = url; audio.volume = 0 }
    if (original) {
      audio.playbackRate = original.playbackRate
      if (audio.readyState >= 1 && Math.abs(audio.currentTime - original.currentTime) > .045) {
        try { audio.currentTime = original.currentTime } catch { /* Retry after the media metadata arrives. */ }
      }
    }
    audio.volume += (target - audio.volume) * .17
    if (audio.paused && !this.pending && performance.now() >= this.nextAttempt) {
      this.nextAttempt = performance.now() + 1500
      this.pending = true
      const epoch = this.epoch
      void audio.play().then(() => { if (epoch !== this.epoch || !this.active || document.hidden || !getGameSoundEnabled()) audio.pause() })
        .catch(() => {}).finally(() => { if (epoch === this.epoch) this.pending = false })
    }
  }

  stop() {
    this.epoch++
    this.active = false
    this.original = null
    window.removeEventListener('game-audio-settings', this.silence)
    document.removeEventListener('visibilitychange', this.silence)
    this.pending = false
    this.audio?.pause()
    if (this.audio) { this.audio.removeAttribute('src'); this.audio.load() }
    this.audio = null
    this.url = ''
  }
}
