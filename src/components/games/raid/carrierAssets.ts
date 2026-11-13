import { getPublicAssetUrl } from '../sound'
export const CARRIER_ASSET_PATHS = {
  landscape: 'assets/carrier/carrier-bay-landscape-v1.webp',
  portrait: 'assets/carrier/carrier-bay-portrait-v1.webp',
} as const
export const CARRIER_DOOR_MASK_PATHS = {
  landscape: 'assets/carrier/carrier-door-landscape.svg',
  portrait: 'assets/carrier/carrier-door-portrait.svg',
} as const
let ready: Promise<void> | undefined
export function preloadCarrierAssets() {
  return ready ??= Promise.all([...Object.values(CARRIER_ASSET_PATHS), ...Object.values(CARRIER_DOOR_MASK_PATHS)].map(path => new Promise<void>(resolve => {
    const image = new Image()
    image.onload = () => { void image.decode().catch(() => {}).then(resolve) }
    image.onerror = () => resolve() // The steel CSS backing remains usable offline on a failed asset.
    image.src = getPublicAssetUrl(path)
  }))).then(() => {})
}
