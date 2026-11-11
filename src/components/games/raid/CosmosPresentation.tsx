import { useEffect, useRef, useState } from 'react'
import { getGameAudioMixSettings, getGameSoundEnabled, getPublicAssetUrl } from '../sound'
import { cosmicArrival, cosmicRegionIndex, COSMIC_REGIONS } from './cosmos'
import type { CSSProperties } from 'react'
import type { GamePhase } from './types'
export const COSMOS_AMBIENCE_URL = getPublicAssetUrl('audio/cosmos-hull-v1.ogg')

/** One decoder, three baked sound layers; no AudioContext graph or rAF audio work. */
export function CosmosPresentation({ stage, phase, surfaceArenas, bossActive, stageClear = 0, encounterDetail }: {
  stage: number; phase: GamePhase; surfaceArenas: boolean; bossActive: boolean; stageClear?: number; encounterDetail?: string
}) {
  const [arrivalSerial, setArrivalSerial] = useState(0)
  const lastArrival = useRef(-1)
  useEffect(() => {
    if (phase === 'select' || phase === 'gameover' || phase === 'victory') lastArrival.current = -1
    if (phase === 'playing' && lastArrival.current !== stage) {
      lastArrival.current = stage
      setArrivalSerial((value) => value + 1)
    }
  }, [stage, phase])
  const state = useRef({ stage, phase, bossActive })
  state.current = { stage, phase, bossActive }
  useEffect(() => {
    const audio = new Audio(COSMOS_AMBIENCE_URL)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0
    audio.preservesPitch = false
    let nextAttempt = 0
    let pendingPlay = false
    let disposed = false
    const tick = () => {
      const current = state.current
      const mix = getGameAudioMixSettings()
      const active = current.phase === 'playing' && !document.hidden && getGameSoundEnabled()
      const target = active ? mix.master * mix.bgm * (current.bossActive ? 0.045 : 0.09) : 0
      // Fade in only; inactive control ticks silence and stop the decoder.
      if (target === 0) { audio.volume = 0; audio.pause(); return }
      audio.playbackRate = COSMIC_REGIONS[cosmicRegionIndex(current.stage)].rate
      audio.volume += (target - audio.volume) * 0.16
      if (audio.paused && !pendingPlay && performance.now() >= nextAttempt) {
        nextAttempt = performance.now() + 2000
        pendingPlay = true
        void audio.play().then(() => {
          if (disposed || state.current.phase !== 'playing' || document.hidden || !getGameSoundEnabled()) audio.pause()
        }).catch(() => {}).finally(() => { pendingPlay = false })
      }
    }
    const timer = window.setInterval(tick, 200)
    document.addEventListener('visibilitychange', tick)
    tick()
    return () => {
      disposed = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }, [])
  const arrival = cosmicArrival(stage, surfaceArenas)
  const flight = stageClear > 0 && surfaceArenas
    ? stage === 4 ? 'DESCENDING · PELAGIC EXPANSE'
      : stage === 9 ? 'DESCENDING · CINDER RIFT'
        : stage === 5 || stage === 10 ? 'ASCENDING · ORBITAL DEPARTURE'
          : stage === 14 ? 'APPROACHING · FINAL BATTLE SECTOR' : ''
    : ''
  // Keep mounted through pause so the arrival animation cannot restart on resume.
  return <div key={`${stage}-${arrivalSerial}-${flight}`} className="raid__sector-arrival" style={{ '--sector-accent': arrival.accent, animationPlayState: phase === 'paused' ? 'paused' : 'running', visibility: phase === 'playing' ? 'visible' : 'hidden' } as CSSProperties} aria-hidden="true">
    <small>{flight || `SECTOR ${String(stage).padStart(2, '0')}`}</small><strong>{arrival.name}</strong><span>{arrival.detail}</span>
    {!flight && encounterDetail && <span>{encounterDetail}</span>}
  </div>
}
