import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import { getPublicAssetUrl } from '../games/sound'
import { DoorSequence, type DoorAction, type DoorPhase } from './doorSequence'
import './SpaceDoor.css'

const DoorContext = createContext<DoorSequence | null>(null)
const artwork = getPublicAssetUrl('assets/ui/space-door-v1.webp')

export function SpaceDoorProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<DoorPhase>('idle')
  const [sequence] = useState(() => new DoorSequence(setPhase))
  const previousFocus = useRef<HTMLElement | null>(null)
  const wasBusy = useRef(false)
  useEffect(() => {
    if (phase === 'closing') {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      wasBusy.current = true
    } else if (phase === 'idle' && wasBusy.current) {
      wasBusy.current = false
      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')
      const dialog = dialogs[dialogs.length - 1]
      const previous = previousFocus.current
      const target = dialog?.querySelector<HTMLElement>('button:not(:disabled), input, select')
        ?? (previous?.isConnected && previous.getClientRects().length ? previous : null)
        ?? document.querySelector<HTMLElement>('#root [data-menu-default], #root button:not(:disabled)')
      target?.focus({ preventScroll: true })
    }
  }, [phase])
  useEffect(() => {
    const image = new Image()
    image.src = artwork
    // Capture controls during the short transition, including Escape/Enter.
    const block = (event: KeyboardEvent) => {
      if (!sequence.busy) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    window.addEventListener('keydown', block, true)
    window.addEventListener('keyup', block, true)
    return () => {
      sequence.cancel()
      window.removeEventListener('keydown', block, true)
      window.removeEventListener('keyup', block, true)
    }
  }, [sequence])
  return <DoorContext.Provider value={sequence}>
    <div className="space-door-content" inert={phase !== 'idle'}>{children}</div>
    {createPortal(<div className={`space-door space-door--${phase}`} aria-hidden="true">
      <div className="space-door__leaf space-door__leaf--left" style={{ backgroundImage: `url("${artwork}")` }} />
      <div className="space-door__leaf space-door__leaf--right" style={{ backgroundImage: `url("${artwork}")` }} />
    </div>, document.body)}
  </DoorContext.Provider>
}

export function useSpaceDoor() {
  const sequence = useContext(DoorContext)
  const run = useCallback((action: DoorAction) => {
    if (!sequence) { void action(); return }
    sequence.run(action, window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [sequence])
  return { run, sequence }
}

export function useDoorState<T>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initial)
  const current = useRef(value)
  current.current = value
  const { run } = useSpaceDoor()
  const set: Dispatch<SetStateAction<T>> = useCallback((next) => {
    if (typeof next !== 'function' && Object.is(next, current.current)) return
    run(() => {
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(current.current) : next
      current.current = resolved
      setValue(resolved)
    })
  }, [run])
  return [value, set]
}

export function useDoorCallback<T extends unknown[]>(action: (...args: T) => void | Promise<unknown>) {
  const latest = useRef(action)
  latest.current = action
  const { run } = useSpaceDoor()
  return useCallback((...args: T) => run(() => latest.current(...args)), [run])
}
