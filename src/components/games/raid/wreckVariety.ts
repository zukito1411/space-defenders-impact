/** IDs 0..7 are atlas frames; 8 preserves the original station and wire format. */
export const WRECK_DESIGNS = [
  'fractured-carrier', 'cargo-hauler', 'exploration-cruiser', 'alien-husk',
  'broken-habitat', 'solar-research', 'orbital-refinery', 'communications-hub', 'legacy-station',
] as const
export const WRECK_ATLAS_PATHS = ['assets/raid-fx/wreck-ships-v1.webp', 'assets/raid-fx/wreck-stations-v1.webp'] as const
export const WRECK_ATLAS_FRAME = 464
const mod = (value: number, count: number) => ((Math.trunc(value) % count) + count) % count
/** Quantize only on run change, never use a changing random number in rendering. */
export const wreckRunSeed = (token: number) => Number.isFinite(token) ? (Math.floor(token * 997) >>> 0) : 0
/** Each pass walks a permutation; nearby slots use distinct offsets. */
export function sceneryWreckDesign(seed: number, slot: number, pass: number, family: 'all' | 'ship' | 'station' = 'all') {
  if (family === 'ship') return mod(seed + slot + pass, 4)
  if (family === 'station') return 4 + mod(seed + slot + pass * 2, 5)
  return mod(seed + slot * 2 + pass * 4, WRECK_DESIGNS.length)
}
/** Host chooses once on spawn; variant is already serialized for co-op clients. */
export function pickGameplayWreckVariant(random: number, previous: number) {
  const count = WRECK_DESIGNS.length
  const unit = Math.max(0, Math.min(1 - Number.EPSILON, random))
  if (previous < 0 || previous >= count) return Math.floor(unit * count)
  const choice = Math.floor(unit * (count - 1))
  return choice >= previous ? choice + 1 : choice
}
