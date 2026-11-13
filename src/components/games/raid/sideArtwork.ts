import { getMechFlightNozzles } from './mechFlight'
import { getPublicAssetUrl } from '../sound'
import { getRaidShipBaseVisualKey } from './shipArtwork'

// Stable v1 names with content fingerprints for the image service-worker cache.
const SIDE_PATHS: Record<string, string> = {
  rocket: 'black-comet-v1.png?art=b943e461c527',
  fast: 'red-wraith-v1.png?art=b9e31eec9df7',
  gatling: 'crimson-saw-v1.png?art=894ef200ddf0',
  laser: 'night-lance-v1.png?art=9bd7cccb61c7',
  dreadnought: 'obsidian-ark-v1.png?art=1fd6c9ce3a1d',
  xwing: 'crosswing-nova-v1.png?art=744fefdf417a',
  spaceEt: 'space-jet-v1.png',
  mesiah: 'mesiah-v1.png?art=1a6b99f7f1de',
  mesiahWhite: 'mesiah-white-v1.png?art=d59a75ff125d',
  mesiahRaptorBlack: 'mesiah-raptor-black-v1.png?art=eb641ff455b5',
  mesiahRaptorWhite: 'mesiah-raptor-white-v1.png?art=8dae3f321d42',
  godGundam: 'god-gundam-flight-v3.webp',
  godGundamBurning: 'god-gundam-burning-flight-v4.webp',
  spiegel: 'spiegel-flight-v3.webp',
  rocketElite: 'black-comet-elite-v1.png?art=ef5def01b05d',
  fastElite: 'red-wraith-elite-v1.png?art=59dd2a6cb3a7',
  gatlingElite: 'crimson-saw-elite-v1.png?art=012984b9c016',
  laserElite: 'night-lance-elite-v1.png?art=5e25da05d1b2',
  dreadnoughtElite: 'obsidian-ark-elite-v1.png?art=a4bf9fc7ffb7',
  xwingElite: 'crosswing-nova-elite-v1.png?art=1e0e076189a9',
  spaceEtElite: 'space-jet-elite-v1.png?art=8d2d1702f93e',
  mesiahBlackElite: 'mesiah-elite-v1.png?art=eeb846760888',
  mesiahWhiteElite: 'mesiah-white-elite-v1.png?art=256938ba06ea',
}

function sideKey(shipKey: string) {
  const key = getRaidShipBaseVisualKey(shipKey)
  return key === 'mesiahBlack' ? 'mesiah' : key
}

export function getRaidSideShipSpriteUrl(shipKey: string) {
  const path = SIDE_PATHS[shipKey] ?? SIDE_PATHS[sideKey(shipKey)]
  return path ? getPublicAssetUrl(`assets/ships/sideview/${path}`) : null
}

// Convert outlets measured in the right-facing artwork to logical flight space.
const outlet = (x: number, y: number, width: number): readonly [number, number, number] => [y, -x, width]
const SIDE_NOZZLES: Record<string, readonly (readonly [number, number, number])[]> = {
  rocket: [outlet(-.415, -.015, .05), outlet(-.415, .055, .05)],
  fast: [outlet(-.46, -.018, .05), outlet(-.46, .055, .05)],
  gatling: [outlet(-.44, -.03, .05), outlet(-.44, .065, .05)],
  laser: [outlet(-.44, -.022, .05), outlet(-.44, .055, .05)],
  dreadnought: [outlet(-.405, -.068, .033), outlet(-.46, .02, .074)],
  xwing: [outlet(-.435, -.065, .045), outlet(-.435, .065, .045)],
  spaceEt: [outlet(-.46, -.02, .05), outlet(-.46, .055, .05)],
  mesiah: [outlet(-.46, -.068, .044), outlet(-.48, .005, .055), outlet(-.46, .073, .044)],
  mesiahRaptorBlack: [outlet(-.43, .005, .055)],
  mesiahRaptorWhite: [outlet(-.455, .005, .055)],
  godGundam: getMechFlightNozzles('godGundam'),
  godGundamBurning: getMechFlightNozzles('godGundam'),
  spiegel: getMechFlightNozzles('spiegel'),
}
SIDE_NOZZLES.mesiahWhite = SIDE_NOZZLES.mesiah

export function getRaidSideShipNozzles(shipKey: string) {
  return SIDE_NOZZLES[sideKey(shipKey)]
}

