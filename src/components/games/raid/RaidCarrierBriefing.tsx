import { useEffect, useRef, useState } from 'react'
import type { LanguageCode } from '../../../i18n'
import type { BossKind, RaidMode } from './types'
import { getCarrierMission } from './carrierMission'
import { getCarrierSectorIntel } from './carrierIntel'
import './carrier.css'

export function RaidCarrierBriefing({ language, mode, stage, recoveryBoss, shipName, underway, canLaunch, onLaunch, onBack }: {
  language: LanguageCode; mode: RaidMode; stage: number; shipName: string
  recoveryBoss?: BossKind; underway: boolean; canLaunch: boolean; onLaunch: () => void; onBack?: () => void
}) {
  const mission = getCarrierMission(language, mode)
  const intel = getCarrierSectorIntel(language, mode, stage, recoveryBoss, underway)
  const beats = [
    recoveryBoss ? intel.recoveryBeat : mission.beats[0],
    intel.tacticalBeat,
    recoveryBoss ? intel.departureBeat : underway ? mission.underwayBeat : mission.beats[2],
  ]
  const [beat, setBeat] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [auto, setAuto] = useState(!recoveryBoss)
  const launched = useRef(false)
  const onLaunchRef = useRef(onLaunch)
  onLaunchRef.current = onLaunch
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [speaker, title, body] = beats[beat]
  const revealSeconds = reduced ? 0 : Array.from(body).length / (language === 'en' ? 48 : 23)
  const visible = reduced ? body : Array.from(body).slice(0, Math.floor(elapsed * (language === 'en' ? 48 : 23))).join('')
  const launch = () => {
    if (launched.current || !canLaunch) return
    launched.current = true
    onLaunchRef.current()
  }
  const advance = () => {
    if (elapsed < revealSeconds) { setElapsed(revealSeconds); return }
    if (beat < beats.length - 1) { setBeat(beat + 1); setElapsed(0) }
    else launch()
  }
  useEffect(() => {
    let frame = 0, previous = 0
    const tick = (time: number) => {
      const delta = previous && !document.hidden ? Math.min(.05, (time - previous) / 1000) : 0
      previous = time
      setElapsed(value => value + delta)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  useEffect(() => {
    if (!auto || reduced || elapsed < revealSeconds + 2.4) return
    if (beat < beats.length - 1) { setBeat(value => value + 1); setElapsed(0) }
    else if (canLaunch && !launched.current) { launched.current = true; onLaunchRef.current() }
  }, [auto, reduced, elapsed, revealSeconds, beat, canLaunch, beats.length])
  return <section className="raid__carrier-briefing" role="dialog" aria-modal="true" aria-labelledby="carrier-mission-title">
    <header className="raid__carrier-masthead">
      <span><i />Mesiah · {mission.channel}</span><span>{mission.secure}</span>
    </header>
    <div className="raid__carrier-mission">
      <small>OPERATION // {mission.operation} <span>SECTOR {String(stage).padStart(2, '0')}</span></small>
      <h2 id="carrier-mission-title">{intel.objective ?? mission.objective}</h2>
      <div className="raid__carrier-goals">{(intel.goals ?? mission.goals).map((goal, index) => <span key={goal}><b>0{index + 1}</b>{goal}</span>)}</div>
    </div>
    <div className="raid__carrier-vessel"><span>{underway && !recoveryBoss ? mission.underway : underway ? mission.bridgeHold : mission.docked}</span><strong>{shipName}</strong><i /></div>
    <div className="raid__carrier-comms">
      <div className="raid__carrier-speaker"><div aria-hidden="true" className="raid__carrier-signal">{[0,1,2,3,4].map(i=><i key={i} style={{animationDelay:`${i * -.13}s`}} />)}</div><span>{speaker}</span><small>0{beat + 1} / 03</small></div>
      <h3>{title}</h3>
      <p className="raid__briefing-copy" aria-label={body}><span aria-hidden="true">{visible}<i className="raid__carrier-cursor" /></span></p>
      <div className="raid__carrier-actions">
        {onBack && <button className="raid__carrier-back" onClick={onBack} type="button">{mission.back}</button>}
        {canLaunch ? <>
          <button className="raid__carrier-skip" onClick={launch} type="button">{mission.skip}</button>
          <button className="raid__carrier-advance" onClick={() => { setAuto(false); advance() }} type="button">{beat < 2 ? mission.next : mission.launch}<span aria-hidden="true">›</span></button>
        </> : <span className="raid__carrier-wait">{mission.standby}</span>}
      </div>
    </div>
  </section>
}
