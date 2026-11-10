/** Campaign route uses game-time inputs: pausing never advances an approach. */
const unit = (n: number) => Math.max(0, Math.min(1, n))
const ease = (n: number) => { const t = unit(n); return t * t * (3 - 2 * t) }
export const JOURNEY_CLEAR_SECONDS = 3.15
export function getRaidStageEntrySeconds(stage: number, mode: string) {
  return mode !== 'endless' && (stage === 5 || stage === 10) ? 2.4 : 1.18
}
export type RaidJourneyInput = {
  stageTheme: number; stageNumber?: number; raidMode?: string; stageAge?: number
  clearRemaining?: number; entryRemaining?: number; arenaAge?: number; departureArena?: number
}
export type RaidJourneyView = {
  enabled: boolean; phase: 'cruise'|'approach'|'descent'|'surface'|'ascent'|'fleet'
  destination: number; planet: number; size: number; x: number; y: number
  departing: number; departureSize: number; departureX: number; departureY: number
  worldTheme: number; worldAlpha: number; worldZoom: number; skyTheme: number
  approach: number; fleetSize: number
}
export function createRaidJourneyView(): RaidJourneyView {
  return { enabled:false,phase:'cruise',destination:0,planet:-1,size:0,x:0.7,y:0.2,
    departing:-1,departureSize:0,departureX:0.82,departureY:0.38,worldTheme:0,
    worldAlpha:0,worldZoom:1,skyTheme:1,approach:0,fleetSize:0 }
}
export function sampleRaidJourney(input: RaidJourneyInput, out: RaidJourneyView, previousStage = 0) {
  out.enabled = input.stageNumber !== undefined
  out.phase = 'cruise'; out.planet = -1; out.departing = -1; out.worldTheme = 0
  out.worldAlpha = 0; out.worldZoom = 1; out.size = 0; out.fleetSize = 0; out.approach = 0
  out.destination = 0; out.skyTheme = input.stageTheme
  if (!out.enabled) return out
  const stage = Math.max(1, Math.floor(input.stageNumber!))
  const age = Math.max(0, input.stageAge ?? 0)
  const mode = input.raidMode ?? 'campaign'
  const clear = (input.clearRemaining ?? 0) > 0
  const clearProgress = clear ? unit(1 - input.clearRemaining! / JOURNEY_CLEAR_SECONDS) : 0
  const entering = (input.entryRemaining ?? 0) > 0
  const entryProgress = entering ? unit(1 - input.entryRemaining! / getRaidStageEntrySeconds(stage, mode)) : 1
  const surface = input.stageTheme === 9101 || input.stageTheme === 9102 ? input.stageTheme
    : clear ? (input.departureArena ?? 0) : 0
  if (surface) {
    const planet = surface === 9101 ? 0 : 1
    out.destination = planet === 0 ? 5 : 10; out.planet = planet; out.worldTheme = surface
    out.skyTheme = mode === 'endless' ? stage : planet === 0 ? 4 : 9
    if (clear) {
      out.phase = 'ascent'
      out.skyTheme = mode === 'endless' ? stage + 1 : planet === 0 ? 6 : 11
      out.worldAlpha = 1 - ease(clearProgress / 0.66)
      out.worldZoom = 1 - clearProgress * 0.22
      out.departing = planet
      out.departureSize = 5.4 * Math.pow(0.38 / 5.4, ease(clearProgress))
      out.departureX = 0.5 + 0.32 * ease(clearProgress); out.departureY = 0.5 - 0.12 * ease(clearProgress)
      out.destination = mode === 'endless' ? 0 : planet === 0 ? 10 : 15
      out.planet = mode !== 'endless' && planet === 0 ? 1 : -1
      out.size = out.planet >= 0 ? 0.12 * ease((clearProgress - 0.35) / 0.65) : 0
      out.x = 0.24; out.y = 0.17
      if (mode !== 'endless' && planet === 1) out.fleetSize = 0.2 * ease((clearProgress - 0.35) / 0.65)
    } else {
      // A normal stage handoff continues the descent started in the clear flight.
      const linked = previousStage === out.destination - 1
      const automatic = mode === 'endless' ? unit((input.arenaAge ?? 0) / 2.4) : 1
      const d = entering ? (linked ? 0.6 + entryProgress * 0.4 : entryProgress) : automatic
      out.phase = d < 1 ? 'descent' : 'surface'
      out.worldAlpha = ease((d - 0.2) / 0.55)
      out.worldZoom = 1.45 - d * 0.45
      const rushTransfer = mode === 'bossRush' && previousStage === 5 && planet === 1 && entering
      const initialSize = rushTransfer ? 0.12 : 1.05
      const initialX = rushTransfer ? 0.24 : 0.7
      const initialY = rushTransfer ? 0.17 : 0.18
      out.size = initialSize + (5.4 - initialSize) * ease(d)
      out.x = initialX + (0.5 - initialX) * ease(d); out.y = initialY + (0.5 - initialY) * ease(d)
      if (rushTransfer) {
        out.departing = 0
        const retreat = ease(entryProgress)
        out.departureSize = 0.38 - retreat * 0.28
        out.departureX = 0.82 + retreat * 0.5; out.departureY = 0.38 - retreat * 0.5
      }
    }
    return out
  }
  // Random endless encounters cannot advertise an unknown future boss/planet.
  if (mode === 'endless') {
    out.enabled = Boolean(input.departureArena && age < 14)
    if (input.departureArena && age < 14) {
      const retreat = ease(age / 14)
      out.departing = input.departureArena === 9101 ? 0 : 1
      out.departureSize = 0.38 - retreat * 0.28
      out.departureX = 0.82 + retreat * 0.5; out.departureY = 0.38 - retreat * 0.5
    }
    return out
  }
  if (stage < 5 || (stage > 5 && stage < 10)) {
    const first = stage < 5
    const arcStart = first ? 1 : 6
    let p = unit((stage - arcStart + unit(age / 50) * 0.9) / 4)
    if (clear && stage !== (first ? 4 : 9)) p += (unit((stage + 1 - arcStart) / 4) - p) * ease(clearProgress)
    out.phase = 'approach'; out.destination = first ? 5 : 10; out.planet = first ? 0 : 1
    out.approach = p; out.size = 0.12 + p * p * 0.94
    out.x = (first ? 0.78 : 0.24) + (0.5 - (first ? 0.78 : 0.24)) * p * 0.7
    out.y = 0.17 + p * 0.12
    if (stage === out.destination - 1 && clear) {
      // End exactly at d=.6; the destination's entry begins at the same sample.
      const d = clearProgress * 0.6
      out.phase = 'descent'; out.worldTheme = first ? 9101 : 9102
      out.worldAlpha = ease((d - 0.2) / 0.55); out.worldZoom = 1.45 - d * 0.45
      const blend = ease(clearProgress)
      out.size += (1.05 + 4.35 * ease(0.6) - out.size) * blend
      out.x += (0.7 - 0.2 * ease(0.6) - out.x) * blend
      out.y += (0.18 + 0.32 * ease(0.6) - out.y) * blend
    }
  } else if (stage >= 11) {
    out.phase = 'fleet'; out.destination = 15
    out.approach = unit((stage - 11 + unit(age / 50) * 0.9) / 4)
    if (clear && stage < 14) out.approach += (unit((stage + 1 - 11) / 4) - out.approach) * ease(clearProgress)
    out.fleetSize = 0.2 + 0.95 * out.approach * out.approach
    if (stage === 14 && clear) {
      out.fleetSize += (1.45 - out.fleetSize) * ease(clearProgress)
      out.approach += (1 - out.approach) * ease(clearProgress)
    }
    if (stage >= 15) {
      const direct = stage === 15 && entering && previousStage !== 14
      out.fleetSize = direct ? 0.2 + 1.25 * ease(entryProgress) : 1.45
      out.approach = direct ? ease(entryProgress) : 1
      if (direct && previousStage === 10) {
        out.departing = 1
        const retreat = ease(entryProgress)
        out.departureSize = 0.38 - retreat * 0.28
        out.departureX = 0.82 + retreat * 0.5; out.departureY = 0.38 - retreat * 0.5
      }
    }
  }
  // After a surface clear, keep the departure planet visible as it recedes.
  if (stage === 6 || stage === 11) {
    const retreat = ease(age / 14)
    out.departing = stage === 6 ? 0 : 1
    out.departureSize = 0.38 - retreat * 0.28
    out.departureX = 0.82 + retreat * 0.5; out.departureY = 0.38 - retreat * 0.5
    if (retreat >= 1) out.departing = -1
  }
  return out
}
