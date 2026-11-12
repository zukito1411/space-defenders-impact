import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { RaidShipSprite } from '../RaidShipSprite'
import { getPublicAssetUrl } from '../sound'
import type { GamePhase } from './types'
import { shouldPlayRaidLaunch } from './raidLaunch'

/** Cosmetic launch only: it never blocks controls or modifies the simulation. */
export function RaidLaunchSequence({ phase, shipKey, landscape }: { phase: GamePhase; shipKey: string; landscape: boolean }) {
  const previous = useRef(phase)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const before = previous.current
    previous.current = phase
    if (phase !== 'playing') { setVisible(false); return }
    if (!shouldPlayRaidLaunch(before, phase, window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return
    setVisible(true)
    const timer = window.setTimeout(() => setVisible(false), 1100)
    return () => window.clearTimeout(timer)
  }, [phase])
  if (!visible) return null
  return <div className={`raid__launch-sequence${landscape ? ' raid__launch-sequence--landscape' : ''}`} aria-hidden="true"
    style={{ '--launch-hangar': `url("${getPublicAssetUrl('assets/ui/orbital-hangar-v1.png')}")` } as CSSProperties}>
    <div className="raid__launch-wake" />
    <div className="raid__launch-ship"><RaidShipSprite shipKey={shipKey} size={180} sideView={landscape} /></div>
  </div>
}
