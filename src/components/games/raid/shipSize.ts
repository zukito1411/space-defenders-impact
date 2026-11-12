import { useSyncExternalStore } from 'react'
import { PLAYER_RADIUS } from './constants'
import type { Player } from './types'

const KEY = 'raid-ship-size'
const CHANGE = 'raid-ship-size-change'
export const DEFAULT_RAID_SHIP_SIZE = 1.2

/** Legacy and invalid network values fall back to the original 100% size. */
export function clampRaidShipSize(value: unknown, fallback = 1): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(1.5, value)) : fallback
}

export function getRaidPlayerHitRadius(player: Pick<Player, 'sizeScale'>): number {
  return PLAYER_RADIUS * clampRaidShipSize(player.sizeScale)
}

let cached: number | null = null
export function getRaidShipSize() {
  if (cached !== null) return cached
  if (typeof window === 'undefined') return DEFAULT_RAID_SHIP_SIZE
  try {
    const raw = window.localStorage.getItem(KEY)
    cached = raw === null ? DEFAULT_RAID_SHIP_SIZE : clampRaidShipSize(Number(raw), DEFAULT_RAID_SHIP_SIZE)
  } catch { cached = DEFAULT_RAID_SHIP_SIZE }
  return cached
}

export function setRaidShipSize(value: number) {
  cached = clampRaidShipSize(value, DEFAULT_RAID_SHIP_SIZE)
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(KEY, String(cached)) } catch { /* optional storage */ }
  window.dispatchEvent(new Event(CHANGE))
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) { cached = null; listener() } }
  window.addEventListener(CHANGE, listener)
  window.addEventListener('storage', onStorage)
  return () => { window.removeEventListener(CHANGE, listener); window.removeEventListener('storage', onStorage) }
}

export function useRaidShipSize() {
  return useSyncExternalStore(subscribe, getRaidShipSize, () => DEFAULT_RAID_SHIP_SIZE)
}
