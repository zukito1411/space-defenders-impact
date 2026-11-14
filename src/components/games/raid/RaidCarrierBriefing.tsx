import { useEffect, useRef, useState } from 'react'
import type { LanguageCode } from '../../../i18n'
import type { BossKind, RaidMode } from './types'
import { getCarrierMission } from './carrierMission'
import { getCarrierSectorIntel } from './carrierIntel'
import { playHostileChannel } from './carrierAudio'
import { CAMPAIGN_COMMS_UI } from './campaignComms'
import { COMMANDER_HOLOGRAM_URL, COMMS_COPY, GENERAL_HOLOGRAM_URL, getCarrierConversation, HOSTILE_HOLOGRAM_URL } from './hostileBriefing'
import './carrier.css'

function FactionEmblem({ red }: { red: boolean }) {
  return <svg className="raid__carrier-emblem" viewBox="0 0 64 64" aria-hidden="true">
    {red
      ? <path fill="currentColor" d="M32 4 59 24 52 31 32 16 12 31 5 24ZM32 23 49 36 32 58 15 36ZM32 33 25 39 32 48 39 39Z" fillRule="evenodd" />
      : <g stroke="currentColor" strokeWidth="2.5" fill="none">
        <path d="M32 5 54 13v18c0 13-8 21-22 28C18 52 10 44 10 31V13Z" />
        <circle cx="32" cy="30" r="13" />
        <ellipse cx="32" cy="30" rx="5" ry="13" />
        <path d="M19 30h26M22 23h20M22 37h20" />
      </g>}
  </svg>
}

export function RaidCarrierBriefing({ language, mode, stage, recoveryBoss, firstInterception, shipName, underway, canLaunch, debrief = false, onInterception, onLaunch, onBack }: {
  language: LanguageCode; mode: RaidMode; stage: number; shipName: string
  recoveryBoss?: BossKind; underway: boolean; canLaunch: boolean; onLaunch: () => void; onBack?: () => void
  firstInterception?: boolean; debrief?: boolean
  onInterception: () => void
}) {
  const mission = getCarrierMission(language, mode)
  const intel = getCarrierSectorIntel(language, mode, stage, recoveryBoss)
  const campaign = mode === 'campaign'
  const story = CAMPAIGN_COMMS_UI[language]
  const labels = { ...COMMS_COPY[language], general: story.general, reptilior: story.reptilior }
  const beats = getCarrierConversation(language, mode, stage, underway, recoveryBoss, firstInterception, debrief)
  const [beat, setBeat] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const launched = useRef(false)
  const onLaunchRef = useRef(onLaunch)
  onLaunchRef.current = onLaunch
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [speaker, body, channel, cue] = beats[beat]
  const hostile = channel === 'enemy'
  const general = channel === 'general'
  const red = hostile || general
  const faction = campaign && !hostile
  const portrait = hostile ? HOSTILE_HOLOGRAM_URL : general ? GENERAL_HOLOGRAM_URL : COMMANDER_HOLOGRAM_URL
  const speakerLabel = campaign && speaker === 'commander' ? story.commander : labels[speaker]
  useEffect(() => {
    if (hostile) return playHostileChannel(Boolean(cue))
  }, [hostile, cue])
  useEffect(() => {
    if (hostile && canLaunch) onInterception()
  }, [hostile, canLaunch, onInterception])
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
  return <section className="raid__carrier-briefing" data-hostile={red || undefined} role="dialog" aria-modal="true" aria-labelledby="carrier-mission-title">
    <header className="raid__carrier-masthead">
      <span><i />Mesiah · {debrief ? story.debrief : campaign ? <abbr title="Space Protection Federation Operative">S.P.F.O.</abbr> : mission.channel}</span>
      <span>{general ? <abbr title="Celestial Force Obliteration Command">C.F.O.C.</abbr> : hostile ? labels.override : mission.secure}</span>
    </header>
    <div className="raid__carrier-mission">
      <small>OPERATION // {mission.operation} <span>SECTOR {String(stage).padStart(2, '0')}</span></small>
      <h2 id="carrier-mission-title">{debrief ? story.ending : intel.objective ?? mission.objective}</h2>
      {!debrief && <div className="raid__carrier-goals">{(intel.goals ?? mission.goals).map((goal, index) => <span key={goal}><b>0{index + 1}</b>{goal}</span>)}</div>}
    </div>
    <div key={portrait} className="raid__carrier-hologram" data-channel={hostile ? 'enemy' : general ? 'cfoc' : 'command'}
      data-faction={faction || undefined} data-listening={(hostile ? speaker !== 'enemy' && speaker !== 'reptilior' : speaker === 'pilot') || undefined} aria-hidden="true">
      {faction && <FactionEmblem red={general} />}
      <img src={portrait} alt="" />
    </div>
    <div className="raid__carrier-comms">
      <div className="raid__carrier-speaker"><div aria-hidden="true" className="raid__carrier-signal">{[0,1,2,3,4].map(i=><i key={i} style={{animationDelay:`${i * -.13}s`}} />)}</div><span>{speakerLabel}</span><small>{underway ? mission.bridgeHold : mission.docked} · {shipName}</small></div>
      {cue && <div className="raid__carrier-stage-direction">{cue}</div>}
      <p className="raid__briefing-copy" aria-label={body}><span aria-hidden="true">{visible}<i className="raid__carrier-cursor" /></span></p>
      <div className="raid__carrier-actions">
        {onBack && <button className="raid__carrier-back" onClick={onBack} type="button">{mission.back}</button>}
        {canLaunch && <button className="raid__carrier-skip" onClick={launch} type="button">{debrief ? story.skip : mission.skip}</button>}
        {(canLaunch || beat < beats.length - 1 || elapsed < revealSeconds) ?
          <button className="raid__carrier-advance" onClick={advance} type="button">{beat < beats.length - 1 || !canLaunch ? mission.next : debrief ? story.finish : mission.launch}<span aria-hidden="true">›</span></button>
          : <span className="raid__carrier-wait">{mission.standby}</span>}
      </div>
    </div>
  </section>
}
