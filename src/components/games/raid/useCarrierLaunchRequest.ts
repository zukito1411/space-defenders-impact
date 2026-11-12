import { useCallback, useRef, type RefObject } from 'react'
import { useSpaceDoor } from '../../ui/SpaceDoor'
import type { GamePhase } from './types'

/** Menu entry gets a wipe; authorizing a docked ship must stay in the same shot. */
export function useCarrierLaunchRequest<T extends unknown[]>(phase: RefObject<GamePhase>, action: (...args: T) => void | Promise<unknown>) {
  const latest = useRef(action)
  latest.current = action
  const { run } = useSpaceDoor()
  return useCallback((...args: T) => {
    if (phase.current === 'briefing') { void latest.current(...args); return }
    run(() => latest.current(...args))
  }, [phase, run])
}
