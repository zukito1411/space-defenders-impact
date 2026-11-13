import { getPublicAssetUrl } from '../sound'
import { makeImageCanvasSprite } from './assets'
import { sampleCrewPatrol } from './crewMotion'

const DECK_ATLASES = {
  service: 'assets/carrier/deck-service-v1.webp',
  cockpit: 'assets/carrier/deck-cockpit-v1.webp',
  crew: 'assets/carrier/deck-crew-motion-v1.webp',
} as const
type Atlas = keyof typeof DECK_ATLASES
const TILES = {
  service: [[50,120],[120,108],[34,120],[69,70],[120,68],[120,66],[93,120],[117,120],[46,120]],
  cockpit: [[58,120],[120,58],[118,120],[120,92]],
} as const

export function getDeckAtlas(key: Atlas) {
  return makeImageCanvasSprite('carrier-deck:' + key, getPublicAssetUrl(DECK_ATLASES[key]))
}

export function drawDeckAtlasTile(ctx: CanvasRenderingContext2D, key: Exclude<Atlas, 'crew'>, index: number,
  x: number, y: number, sizeX: number, sizeY: number, fitted = false) {
  const atlas = getDeckAtlas(key)
  const tile = TILES[key][index]
  if (!atlas.loaded || !tile) return
  const columns = key === 'service' ? 3 : 2
  const [w, h] = tile
  const robot = key === 'service' && (index === 3 || index === 4)
  const sx = (index % columns) * 128 + (robot ? 4 : Math.floor((128 - w) / 2))
  const sy = Math.floor(index / columns) * 128 + (robot ? 124 - h : Math.floor((128 - h) / 2))
  ctx.drawImage(atlas.image, sx, sy, w, h, fitted ? x - sizeX / 2 : x, y - sizeY * (fitted ? .5 : 1), sizeX, sizeY)
}

type View = {
  cart: readonly [number, number]
  welder: readonly [number, number]
  bot: readonly [number, number]
  cargo: readonly [number, number]
  engineer: readonly [number, number]
  tug: readonly [number, number, number]
}
const serviceSites: Record<'side' | 'top', View> = {
  side: { cart:[495,791], welder:[539,791], bot:[1190,791], cargo:[1233,791], engineer:[1270,791], tug:[590,870,791] },
  top: { cart:[330,1112], welder:[365,1112], bot:[665,1095], cargo:[695,1110], engineer:[675,1140], tug:[652,689,1202] },
}

function serviceSprite(ctx: CanvasRenderingContext2D, tile: number, at: readonly [number, number], height: number, facing = 1) {
  const [w, h] = TILES.service[tile]
  ctx.save()
  ctx.translate(at[0], at[1])
  ctx.scale(facing, 1)
  drawDeckAtlasTile(ctx, 'service', tile, -height * w / h / 2, 0, height * w / h, height)
  ctx.restore()
}

/** Crew jobs stay on the service platforms as the center lane clears. */
export function drawDeckServices(ctx: CanvasRenderingContext2D, time: number, landscape: boolean) {
  const { cart, welder, bot, cargo, engineer, tug } = serviceSites[landscape ? 'side' : 'top']
  const repair = time > 0 && time % 3.1 > 1.65 && time % 3.1 < 2.5
  serviceSprite(ctx, 7, cart, 33)
  serviceSprite(ctx, repair ? 1 : 0, welder, repair ? 17 : 24, -1)
  serviceSprite(ctx, 6, cargo, 38)
  serviceSprite(ctx, time % 4 < 1.25 ? 4 : 3, bot, 23)
  serviceSprite(ctx, 8, engineer, 22)
  const run = sampleCrewPatrol(time, tug[0], tug[1], landscape ? 20 : 7)
  serviceSprite(ctx, 5, [run.x, tug[2]], 20, run.facing)
}

export function drawDeckCrew(ctx: CanvasRenderingContext2D, frame: number, x: number, y: number, height: number, facing = 1) {
  const atlas = getDeckAtlas('crew')
  if (!atlas.loaded) return
  const size = height * 128 / 107
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(facing, 1)
  ctx.drawImage(atlas.image, (frame % 4) * 128, Math.floor(frame / 4) * 128, 128, 128,
    -size / 2, -size * 124 / 128, size, size)
  ctx.restore()
}

export function drawDeckTechnician(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, facing: number, blue: boolean) {
  serviceSprite(ctx, blue ? 8 : 0, [x, y], height, facing)
}
