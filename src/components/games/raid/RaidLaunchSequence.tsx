import type { RefObject } from 'react'
import { getPublicAssetUrl } from '../sound'
import { CARRIER_ASSET_PATHS, CARRIER_DOOR_MASK_PATHS } from './carrierAssets'

/** Backdrop only. The one gameplay ship is launched by the simulation entry state. */
export function RaidLaunchSequence({ landscape, deckRef }: { landscape: boolean; deckRef: RefObject<HTMLCanvasElement | null> }) {
  const view = landscape ? 'landscape' : 'portrait'
  return <div className="raid__launch-sequence" aria-hidden="true">
    <div className="raid__carrier-camera">
      <div className="raid__carrier-plate" style={{
        backgroundImage: `url("${getPublicAssetUrl(CARRIER_ASSET_PATHS[view])}")`,
        maskImage: `url("${getPublicAssetUrl(CARRIER_DOOR_MASK_PATHS[view])}")`,
      }}><canvas ref={deckRef} className="raid__carrier-deck" /></div>
    </div>
  </div>
}
