import { getPublicAssetUrl } from '../sound'
import { makeImageCanvasSprite } from './assets'
import { sampleCrewPatrol } from './crewMotion'

const DECK_ATLASES = {
  props: 'assets/carrier/deck-props-v1.webp',
  cockpit: 'assets/carrier/deck-cockpit-v1.webp',
  crew: 'assets/carrier/deck-crew-motion-v1.webp',
  workers: 'assets/carrier/deck-workers-v1.webp',
  repair: 'assets/carrier/deck-repair-v1.webp',
} as const
type Atlas = keyof typeof DECK_ATLASES
type Point = readonly [number, number]
const PROPS = [[120,66],[93,120],[117,120]] as const
const COCKPITS = [[58,120],[120,58],[118,120],[120,92]] as const

export function getDeckAtlas(key: Atlas) {
  return makeImageCanvasSprite('carrier-deck:' + key, getPublicAssetUrl(DECK_ATLASES[key]))
}

export function drawDeckCockpitInterior(ctx: CanvasRenderingContext2D, index: number, x: number, y: number, width: number, height: number) {
  const atlas = getDeckAtlas('cockpit')
  const [w, h] = COCKPITS[index]
  if (!atlas.loaded) return
  ctx.drawImage(atlas.image, (index % 2) * 128 + Math.floor((128 - w) / 2),
    Math.floor(index / 2) * 128 + Math.floor((128 - h) / 2), w, h,
    x - width / 2, y - height / 2, width, height)
}

function drawDeckProp(ctx: CanvasRenderingContext2D, index: number, at: Point, height: number, facing = 1) {
  const atlas = getDeckAtlas('props')
  if (!atlas.loaded) return
  const [w, h] = PROPS[index]
  const width = height * w / h
  ctx.save()
  ctx.translate(at[0], at[1])
  ctx.scale(facing, 1)
  ctx.drawImage(atlas.image, index * 128 + Math.floor((128 - w) / 2), Math.floor((128 - h) / 2), w, h,
    -width / 2, -height, width, height)
  ctx.restore()
}

function drawDeckPose(ctx: CanvasRenderingContext2D, key: 'crew' | 'workers' | 'repair', frame: number,
  x: number, y: number, height: number, facing = 1, anchor = 64) {
  const atlas = getDeckAtlas(key)
  if (!atlas.loaded) return
  const scale = height / 107
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(facing, 1)
  ctx.drawImage(atlas.image, (frame % 4) * 128, Math.floor(frame / 4) * 128, 128, 128,
    -anchor * scale, -124 * scale, 128 * scale, 128 * scale)
  ctx.restore()
}

export function drawDeckCrew(ctx: CanvasRenderingContext2D, frame: number, x: number, y: number, height: number, facing = 1) {
  drawDeckPose(ctx, 'crew', frame, x, y, height, facing)
}

export function sampleDeckPatrolPose(distance: number, moving: boolean, blue: boolean) {
  const row = blue ? 0 : 4
  if (!moving) return row
  const step = Math.floor(distance / 6) % 4
  return row + (step === 3 ? 2 : step + 1)
}

export function drawDeckPatroller(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, facing: number,
  blue: boolean, distance: number, moving: boolean) {
  drawDeckPose(ctx, 'workers', sampleDeckPatrolPose(distance, moving, blue), x, y, height, facing)
}

type View = {
  cart: Point
  welder: Point
  bot: Point
  cargo: Point
  inspector: Point
  tug: readonly [number, number, number]
}
const serviceSites: Record<'side' | 'top', View> = {
  side: { cart:[495,791], welder:[536,791], bot:[1136,791], cargo:[1233,791], inspector:[1261,791], tug:[590,870,791] },
  top: { cart:[330,1112], welder:[366,1112], bot:[647,1095], cargo:[695,1110], inspector:[718,1110], tug:[652,689,1202] },
}

export function sampleDeckServicePoses(time: number) {
  const weld = time % 5.2
  const reach = (time + .9) % 5.9
  const inspect = (time + 1.7) % 7.3
  return {
    welder: weld < .65 || weld >= 4.65 ? null : weld < 1.1 || weld >= 4.25 ? 4
      : weld < 1.7 ? 5 : weld < 3.3 ? (Math.floor(weld * 11) % 3 === 0 ? 5 : 6) : 7,
    bot: reach < 1.4 || reach >= 5.3 ? 0 : reach < 1.85 || reach >= 4.8 ? 1 : reach < 3.65 ? 2 : 3,
    inspector: inspect < 2.35 || inspect >= 6.6 ? 8 : inspect < 3.45 || inspect >= 6.05 ? 9 : inspect < 4.55 ? 10 : 11,
  }
}

/** Crew jobs stay on service platforms as the launch lane clears. */
export function drawDeckServices(ctx: CanvasRenderingContext2D, time: number, landscape: boolean, reducedMotion: boolean) {
  const { cart, welder, bot, cargo, inspector, tug } = serviceSites[landscape ? 'side' : 'top']
  const pose = sampleDeckServicePoses(time)
  drawDeckProp(ctx, 2, cart, 33)
  if (reducedMotion || pose.welder === null) drawDeckPose(ctx, 'workers', 4, welder[0], welder[1], 24, -1)
  else drawDeckPose(ctx, 'repair', pose.welder, welder[0], welder[1], 24, -1)
  drawDeckProp(ctx, 1, cargo, 38)
  drawDeckPose(ctx, 'repair', reducedMotion ? 0 : pose.bot, bot[0], bot[1], 25, 1, 8)
  drawDeckPose(ctx, 'workers', reducedMotion ? 8 : pose.inspector, inspector[0], inspector[1], 22, -1)
  const run = sampleCrewPatrol(time, tug[0], tug[1], landscape ? 20 : 7)
  drawDeckProp(ctx, 0, [run.x, tug[2]], 20, run.facing)
}
