import { sampleCarrierLaunch } from './carrierLaunch'
import type { BossKind, RaidMode, Vec } from './types'

export type CarrierStop = {
  sourceStage: number
  targetStage: number
  boss: BossKind
  remaining: number
  hostStart: Vec
  guestStart?: Vec
}

export const CARRIER_RECOVERY_SECONDS = 6.2
const unit = (value: number) => Math.max(0, Math.min(1, value))
const ease = (value: number) => { const t = unit(value); return t * t * (3 - 2 * t) }

export function shouldRecoverAfterStage(mode: RaidMode, clearedStage: number, targetStage: number) {
  return mode === 'campaign' && (
    (targetStage === clearedStage + 1 && (clearedStage === 4 || clearedStage === 9 || clearedStage === 14))
    || (clearedStage === 15 && targetStage === 16)
  )
}

export function shouldRecoverBeforeEndlessBoss(kind: BossKind) {
  return kind === 'super' || kind === 'squid' || kind === 'snake' || kind === 'final' || kind === 'devil'
}

export function sampleCarrierRecovery(age: number, landscape: boolean, reducedMotion: boolean, compact: boolean, underway: boolean) {
  const dock = sampleCarrierLaunch(0, landscape, reducedMotion, compact, underway)
  const closing = ease(age / 4.9)
  const hatch = ease((age - 2.9) / 2)
  return {
    ...dock,
    closing: reducedMotion ? 1 : closing,
    backdrop: underway ? 0 : reducedMotion ? 1 : hatch,
    scale: reducedMotion ? dock.scale : 1 + (dock.scale - 1) * closing,
    engine: reducedMotion ? 0 : (1 - ease((age - 3.6) / 1.5)) * .86,
    release: reducedMotion ? 0 : 1 - ease((age - 4.9) / 1.05),
    exteriorAlpha: underway || reducedMotion ? 0 : ease(age / .85) * (1 - hatch),
    exteriorSize: .36 + 1.2 * ease(age / 4.9),
    exteriorLead: ease(age / 4.9),
    phase: 'approach',
  } as const
}
