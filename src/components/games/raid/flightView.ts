import { useSyncExternalStore } from 'react'
import { requestDisplayOrientation } from '../../../native/displayOrientation'

const STORAGE_KEY = 'raid-flight-view'
const CHANGE_EVENT = 'raid-flight-view-change'
let cachedLandscape: boolean | null = null

function getLandscape() {
  if (cachedLandscape !== null) return cachedLandscape
  try { cachedLandscape = window.localStorage.getItem(STORAGE_KEY) === 'landscape' }
  catch { cachedLandscape = false }
  return cachedLandscape
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      cachedLandscape = null
      listener()
    }
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

function setLandscape(landscape: boolean) {
  cachedLandscape = landscape
  try { window.localStorage.setItem(STORAGE_KEY, landscape ? 'landscape' : 'vertical') } catch { /* optional storage */ }
  window.dispatchEvent(new Event(CHANGE_EVENT))
  void requestDisplayOrientation(landscape)
}

export function useRaidFlightView() {
  const landscape = useSyncExternalStore(subscribe, getLandscape, () => false)
  return [landscape, setLandscape] as const
}

export function restoreDisplayOrientation() {
  try {
    if (window.localStorage.getItem(STORAGE_KEY) !== null) void requestDisplayOrientation(getLandscape())
  } catch { /* keep the device's current orientation if storage is unavailable */ }
}
