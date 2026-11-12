import type { GamePhase } from './types'

/** Launch art is only for a new run, never for resume or stage transitions. */
export function shouldPlayRaidLaunch(before: GamePhase, after: GamePhase, reducedMotion: boolean) {
  return !reducedMotion && after === 'playing' && before !== 'playing' && before !== 'paused'
}
