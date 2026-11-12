import { getPublicAssetUrl } from '../sound'

/** Backdrop only. The one gameplay ship is launched by the simulation entry state. */
export function RaidLaunchSequence() {
  return <div className="raid__launch-sequence" aria-hidden="true">
    <div style={{ backgroundImage: `url("${getPublicAssetUrl('assets/ui/orbital-hangar-v1.png')}")` }} />
  </div>
}
