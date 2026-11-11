import { drawRaidContactArt, RAID_CONTACT_TILE } from './combatArt'
import type { Player, Vec } from './types'

export type PilotContactKind = 'shield' | 'hull' | 'salvage'
export type PilotContact = { kind: PilotContactKind; at: number; angle: number }

export function makePilotContact(kind: PilotContactKind, pilot: Player, source?: Vec): PilotContact {
  return { kind, at: performance.now(), angle: source ? Math.atan2(source.y - pilot.y, source.x - pilot.x) : -Math.PI / 2 }
}

export function drawPilotContact(ctx: CanvasRenderingContext2D, event: PilotContact, x: number, y: number,
  size: number, time: number, reducedMotion: boolean) {
  const age = Math.max(0, time - event.at)
  const life = event.kind === 'salvage' ? 580 : 280
  if (age >= life) return false
  const progress = age / life
  const alpha = .86 * (1 - progress) ** 1.3
  const push = reducedMotion ? 0 : progress
  if (event.kind === 'salvage') {
    const width = size * (1.12 - push * .46)
    drawRaidContactArt(ctx, RAID_CONTACT_TILE.salvage, x, y, width, width, alpha, push * .65, true)
  } else {
    const shield = event.kind === 'shield'
    const offset = size * (shield ? .37 : .27)
    const dx = Math.cos(event.angle) * offset
    const dy = Math.sin(event.angle) * offset
    const width = size * ((shield ? .38 : .53) + push * .22)
    drawRaidContactArt(ctx, shield ? RAID_CONTACT_TILE.deflect : RAID_CONTACT_TILE.hull,
      x + dx, y + dy, width, width * (shield ? 1.45 : .94), alpha, event.angle, true)
  }
  return true
}
