import { getPublicAssetUrl } from '../sound'
import { getCanvasSpriteSource, makeImageCanvasSprite, releaseCanvasSprite } from './assets'
import type { CanvasSpriteEntry } from './assets'
import type { ProtectionHull } from './shipProtection'
import anchors from './bankingAnchors.json'

export const BANKING_COLUMNS = 7
export const BANKING_ROWS = 2
export const BANKING_CELL = 224
const LEVEL_FRAME = 3
const BANKING_CACHE_LIMIT = 6
const atlases = new Map<string, CanvasSpriteEntry>()

type ExhaustOutlet = readonly [x: number, y: number, width: number]
export type BankingPoint = readonly [x: number, y: number]
type BankingRegistration = { nozzles: ExhaustOutlet[][]; wing?: BankingPoint[][] }

const registrations = anchors as unknown as Readonly<Record<string, BankingRegistration>>

export type RaidBankingFrame = {
  sprite: CanvasSpriteEntry
  frame: number
  nozzles: readonly ExhaustOutlet[]
  wing?: readonly BankingPoint[]
}

function bankingKey(shipKey: string) {
  return shipKey === 'mesiah' ? 'mesiahBlack' : shipKey
}

export function getRaidBankingAtlasUrl(shipKey: string) {
  const key = bankingKey(shipKey)
  return Object.prototype.hasOwnProperty.call(registrations, key) ? getPublicAssetUrl(`assets/ships/banking/${key}-v1.webp`) : null
}

export function getRaidBankingAtlas(shipKey: string) {
  const url = getRaidBankingAtlasUrl(shipKey)
  if (!url) return null
  const cached = atlases.get(url)
  if (cached) return cached
  if (atlases.size >= BANKING_CACHE_LIMIT) {
    const [oldUrl, oldAtlas] = atlases.entries().next().value!
    atlases.delete(oldUrl)
    releaseCanvasSprite(oldAtlas)
  }
  const sprite = makeImageCanvasSprite(`ship-banking:${url}`, url)
  atlases.set(url, sprite)
  return sprite
}

export function raidBankingFrameIndex(bank: number, landscape: boolean, reducedMotion: boolean) {
  const amount = reducedMotion ? 0 : Math.max(-1, Math.min(1, bank / .14))
  return (landscape ? BANKING_COLUMNS : 0) + Math.round(LEVEL_FRAME + amount * LEVEL_FRAME)
}

export function getRaidBankingFrame(shipKey: string, bank: number, landscape: boolean, reducedMotion: boolean): RaidBankingFrame | null {
  const sprite = getRaidBankingAtlas(shipKey)
  if (!sprite?.loaded) return null
  const frame = raidBankingFrameIndex(bank, landscape, reducedMotion)
  const { nozzles, wing } = registrations[bankingKey(shipKey)]
  return { sprite, frame, nozzles: nozzles[frame], wing: wing?.[frame] }
}

export function getBankingProtectionHull(sprite: CanvasSpriteEntry, landscape: boolean): ProtectionHull {
  // Keep the energy shield stable during shallow banks. Computing a fresh
  // distance field every time the hull changes frame would stall flight.
  return { sprite, columns: BANKING_COLUMNS, rows: BANKING_ROWS, frame: raidBankingFrameIndex(0, landscape, false) }
}

export function drawRaidBankingCell(ctx: CanvasRenderingContext2D, sprite: CanvasSpriteEntry, frame: number,
  x: number, y: number, size: number) {
  ctx.drawImage(getCanvasSpriteSource(sprite),
    frame % BANKING_COLUMNS * BANKING_CELL, Math.floor(frame / BANKING_COLUMNS) * BANKING_CELL,
    BANKING_CELL, BANKING_CELL, x - size / 2, y - size / 2, size, size)
}
