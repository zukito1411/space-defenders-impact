import { getPublicAssetUrl } from '../sound'
import { CARRIER_ASSET_PATHS } from './carrierAssets'

/** Backdrop only. The one gameplay ship is launched by the simulation entry state. */
export function RaidLaunchSequence({ landscape }: { landscape: boolean }) {
  return <div className="raid__launch-sequence" aria-hidden="true">
    <div className="raid__carrier-camera">
      <div className="raid__carrier-plate" style={{ backgroundImage: `url("${getPublicAssetUrl(landscape ? CARRIER_ASSET_PATHS.landscape : CARRIER_ASSET_PATHS.portrait)}")` }} />
    </div>
  </div>
}
