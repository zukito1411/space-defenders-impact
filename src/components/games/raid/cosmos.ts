/** Finite art direction shared by scenery, arrival UI and ship rim light. */
export const COSMIC_REGIONS = [
  { name: 'Stellar Nursery', detail: 'Blue clouds · inner frontier', tint: 0xb6eaff, rim: 'rgba(125,211,252,0.09)', accent: '#7dd3fc', rate: 1, landmark: 0 },
  { name: 'Amber Ringway', detail: 'Orbital dust · outer passage', tint: 0xffe0b0, rim: 'rgba(253,211,133,0.09)', accent: '#fcd38d', rate: 0.88, landmark: 1 },
  { name: 'Silent Fleet', detail: 'Derelict corridor · lost signals', tint: 0xb9d6d6, rim: 'rgba(153,203,202,0.09)', accent: '#99cbca', rate: 0.8, landmark: 2 },
  { name: 'Violet Deepfield', detail: 'Ancient wreckage · hostile frontier', tint: 0xe2c5ff, rim: 'rgba(196,164,255,0.09)', accent: '#c4a4ff', rate: 1.08, landmark: 3 },
] as const
export function cosmicRegionIndex(stage: number): number {
  if (!Number.isFinite(stage)) return 0
  if (stage >= 9103) return 3
  // Special arenas retain their surface rendering and matching arrival labels.
  if (stage === 9101) return 1
  if (stage === 9102) return 2
  return Math.min(3, Math.floor((Math.max(1, Math.floor(stage)) - 1) / 4))
}
export function cosmicArrival(stage: number, surfaceArenas: boolean) {
  if (stage === 9101 || (surfaceArenas && stage === 5)) return { name: 'Pelagic Expanse', detail: 'Ocean arena · Leviathan contact', accent: '#7dd3fc' }
  if (stage === 9102 || (surfaceArenas && stage === 10)) return { name: 'Cinder Rift', detail: 'Volcanic arena · Cobra contact', accent: '#fdba74' }
  const region = COSMIC_REGIONS[cosmicRegionIndex(stage)]
  if (!surfaceArenas) return region
  const detail = stage <= 1 ? 'Pelagic vector · distant violet world'
    : stage < 4 ? 'Pelagic Expanse ahead · orbital approach'
    : stage === 4 ? 'Pelagic high orbit · atmospheric insertion ahead'
    : stage === 6 ? 'Leaving Pelagic orbit · Cinder vector'
    : stage < 9 ? 'Cinder Rift ahead · volcanic world approach'
    : stage === 9 ? 'Cinder high orbit · atmospheric insertion ahead'
    : stage === 11 ? 'Leaving Cinder orbit · fleet sector vector'
    : stage < 14 ? 'Final sector ahead · deepfield debris corridor'
    : stage === 14 ? 'Final battle perimeter · fleet approach'
    : 'Final battle sector · fleet contact'
  return { ...region, detail }
}
/** Rare edge passes use existing asteroid slots. x stays outside the central 80%. */
export function edgeFlyby(seconds: number, slot: number) {
  const period = 26
  const age = ((Math.max(0, seconds) + slot * 13 + period - 8) % period)
  return age < 3.2 ? age / 3.2 : -1
}
// A full 512px RGBA terrain mip chain uses 1,398,100 bytes.
export const COSMOS_TEXTURE_BYTES = 3 * 1024 * 1024 * 4 + 512 * 512 * 4 + 512 * 256 * 4 + 2 * 1398100
