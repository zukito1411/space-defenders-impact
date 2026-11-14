import { useEffect, useRef, useState } from 'react'
import type { LanguageCode } from '../../../i18n'
import type { BossKind, RaidMode } from './types'
import { getCarrierMission } from './carrierMission'
import { getCarrierSectorIntel } from './carrierIntel'
import { playHostileChannel } from './carrierAudio'
import { COMMANDER_HOLOGRAM_URL, COMMS_COPY, getCarrierConversation, HOSTILE_HOLOGRAM_URL } from './hostileBriefing'
import './carrier.css'

export function RaidCarrierBriefing({ language, mode, stage, recoveryBoss, shipName, underway, canLaunch, onLaunch, onBack }: {
  language: LanguageCode; mode: RaidMode; stage: number; shipName: string
  recoveryBoss?: BossKind; underway: boolean; canLaunch: boolean; onLaunch: () => void; onBack?: () => void
}) {
  const mission = getCarrierMission(language, mode)
  const intel = getCarrierSectorIntel(language, mode, stage, recoveryBoss)
  const labels = COMMS_COPY[language]
  const beats = getCarrierConversation(language, mode, stage, underway, recoveryBoss)
  const [beat, setBeat] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const launched = useRef(false)
  const onLaunchRef = useRef(onLaunch)
  onLaunchRef.current = onLaunch
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [speaker, body] = beats[beat]
  const hostile = speaker === 'enemy'
  const portrait = hostile ? HOSTILE_HOLOGRAM_URL : COMMANDER_HOLOGRAM_URL
  useEffect(() => {
    if (hostile) return playHostileChannel()
  }, [hostile])
  const revealSeconds = reduced ? 0 : Array.from(body).length / (language === 'en' ? 48 : 23)
  const visible = elapsed >= revealSeconds ? body : Array.from(body).slice(0, Math.floor(elapsed * (language === 'en' ? 48 : 23))).join('')
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
    if (reduced) return
    let frame = 0, previous = 0, seconds = 0
    const tick = (time: number) => {
      const delta = previous && !document.hidden ? Math.min(.05, (time - previous) / 1000) : 0
      previous = time
      seconds += delta
      setElapsed(value => Math.max(value, seconds))
      if (seconds < revealSeconds) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [beat, reduced, revealSeconds])
  return <section className="raid__carrier-briefing" data-hostile={hostile || undefined} role="dialog" aria-modal="true" aria-labelledby="carrier-mission-title">
    <header className="raid__carrier-masthead">
      <span><i />Mesiah · {mission.channel}</span><span>{hostile ? labels.override : mission.secure}</span>
    </header>
    <div className="raid__carrier-mission">
      <small>OPERATION // {mission.operation} <span>SECTOR {String(stage).padStart(2, '0')}</span></small>
      <h2 id="carrier-mission-title">{intel.objective ?? mission.objective}</h2>
      <div className="raid__carrier-goals">{(intel.goals ?? mission.goals).map((goal, index) => <span key={goal}><b>0{index + 1}</b>{goal}</span>)}</div>
    </div>
    <div key={portrait} className="raid__carrier-hologram" data-channel={hostile ? 'enemy' : 'command'}
      data-listening={speaker === 'pilot' || undefined} aria-hidden="true">
      <img src={portrait} alt="" />
    </div>
    <div className="raid__carrier-comms">
      <div className="raid__carrier-speaker"><div aria-hidden="true" className="raid__carrier-signal">{[0,1,2,3,4].map(i=><i key={i} style={{animationDelay:`${i * -.13}s`}} />)}</div><span>{labels[speaker]}</span><small>{underway ? mission.bridgeHold : mission.docked} · {shipName}</small></div>
      <p className="raid__briefing-copy" aria-label={body}><span aria-hidden="true">{visible}<i className="raid__carrier-cursor" /></span></p>
      <div className="raid__carrier-actions">
        {onBack && <button className="raid__carrier-back" onClick={onBack} type="button">{mission.back}</button>}
        {canLaunch && <button className="raid__carrier-skip" onClick={launch} type="button">{mission.skip}</button>}
        {(canLaunch || beat < beats.length - 1 || elapsed < revealSeconds) ?
          <button className="raid__carrier-advance" onClick={advance} type="button">{beat < beats.length - 1 || !canLaunch ? mission.next : mission.launch}<span aria-hidden="true">›</span></button>
          : <span className="raid__carrier-wait">{mission.standby}</span>}
      </div>
    </div>
  </section>
}
