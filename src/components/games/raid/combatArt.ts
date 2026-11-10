import { Assets, Color, Rectangle, Texture } from 'pixi.js'
import { getPublicAssetUrl } from '../sound'
import type { Shot } from './types'

export const RAID_COMBAT_ATLAS_URL = getPublicAssetUrl('assets/raid-fx/combat-atlas-v2.png')
export const RAID_EXPLOSION_ATLAS_URL = getPublicAssetUrl('assets/raid-fx/explosion-atlas-v2.png')
export const RAID_COMBAT_ART_URLS = [RAID_COMBAT_ATLAS_URL, RAID_EXPLOSION_ATLAS_URL]

export const COMBAT_TILE = {
  plasma: 0, hotBolt: 1, ionNeedle: 2, alienOrb: 3,
  fireImpact: 4, ionImpact: 5, spark: 6, shock: 7,
  missile: 8, charge: 9, ink: 10, smoke: 11,
  exhaust: 12, fragment: 13, venom: 14, muzzle: 15,
} as const

export type CombatProjectileMaterial = {
  texture: Texture
  width: number
  height: number
  directional: boolean
  solid: boolean
}

type MaterialSpec = readonly [tile: number, width: number, height: number, directional: boolean, solid: boolean]
const PLAYER_MATERIALS: Partial<Record<Shot['kind'], MaterialSpec>> = {
  pulse: [COMBAT_TILE.plasma, 48, 36, true, false],
  laser: [COMBAT_TILE.plasma, 126, 38, true, false],
  spread: [COMBAT_TILE.hotBolt, 62, 38, true, false],
  scatter: [COMBAT_TILE.ionNeedle, 48, 36, true, false],
  needle: [COMBAT_TILE.plasma, 70, 32, true, false],
  rocket: [COMBAT_TILE.missile, 70, 48, true, true],
  homing: [COMBAT_TILE.missile, 58, 42, true, true],
}
const ENEMY_MATERIALS: Partial<Record<Shot['kind'], MaterialSpec>> = {
  enemy: [COMBAT_TILE.alienOrb, 34, 34, false, false],
  boss: [COMBAT_TILE.alienOrb, 40, 40, false, false],
  plasma: [COMBAT_TILE.alienOrb, 40, 40, false, false],
  orbShot: [COMBAT_TILE.alienOrb, 44, 44, false, false],
  voidShot: [COMBAT_TILE.alienOrb, 52, 52, false, false],
  blade: [COMBAT_TILE.plasma, 76, 38, true, false],
  needle: [COMBAT_TILE.ionNeedle, 72, 32, true, false],
  scatterBoss: [COMBAT_TILE.hotBolt, 62, 38, true, false],
  superShot: [COMBAT_TILE.fireImpact, 50, 50, false, false],
}

let combatFrames: Texture[] = []
let explosionFrames: Texture[] = []
const rootTextures: Texture[] = []
const playerMaterials: Partial<Record<Shot['kind'], CombatProjectileMaterial>> = {}
const enemyMaterials: Partial<Record<Shot['kind'], CombatProjectileMaterial>> = {}
let warmPromise: Promise<void> | null = null
const warmColorCache = new Map<string, boolean>()

export function isWarmRaidEffectColor(color: string) {
  const cached = warmColorCache.get(color)
  if (cached !== undefined) return cached
  const tint = new Color(color).toNumber()
  const red = (tint >>> 16) & 255
  const green = (tint >>> 8) & 255
  const blue = tint & 255
  const warm = red > green * 0.95 && red > blue * 1.1
  warmColorCache.set(color, warm)
  return warm
}

function splitAtlas(texture: Texture): Texture[] {
  // Generated sheets may be NPOT. WebGL 1 cannot mipmap those sources.
  const powerOfTwo = (value: number) => value > 0 && (value & (value - 1)) === 0
  texture.source.autoGenerateMipmaps = powerOfTwo(texture.source.pixelWidth) && powerOfTwo(texture.source.pixelHeight)
  texture.source.scaleMode = 'linear'
  const width = texture.width / 4
  const height = texture.height / 4
  return Array.from({ length: 16 }, (_, index) => new Texture({
    source: texture.source,
    // A small inset plus the artwork's gutters prevent neighboring tile bleed.
    frame: new Rectangle((index % 4) * width + 2, Math.floor(index / 4) * height + 2, width - 4, height - 4),
  }))
}

function buildMaterials(specs: Partial<Record<Shot['kind'], MaterialSpec>>, target: typeof playerMaterials) {
  for (const [kind, spec] of Object.entries(specs)) {
    const [tile, width, height, directional, solid] = spec
    target[kind as Shot['kind']] = { texture: combatFrames[tile], width, height, directional, solid }
  }
}

/** Decode once in the loading screen. Frames share two GPU texture sources. */
export function preloadRaidCombatArt(): Promise<void> {
  if (!warmPromise) {
    warmPromise = Promise.all([
      (combatFrames.length ? Promise.resolve() : Assets.load<Texture>(RAID_COMBAT_ATLAS_URL).then((texture) => {
        combatFrames = splitAtlas(texture)
        rootTextures.push(texture)
        buildMaterials(PLAYER_MATERIALS, playerMaterials)
        buildMaterials(ENEMY_MATERIALS, enemyMaterials)
      }).catch((error: unknown) => { console.warn('Raid projectile artwork failed to load:', RAID_COMBAT_ATLAS_URL, error) })),
      (explosionFrames.length ? Promise.resolve() : Assets.load<Texture>(RAID_EXPLOSION_ATLAS_URL).then((texture) => {
        explosionFrames = splitAtlas(texture)
        rootTextures.push(texture)
      }).catch((error: unknown) => { console.warn('Raid explosion artwork failed to load:', RAID_EXPLOSION_ATLAS_URL, error) })),
    ]).then(() => {
      // Retry missing art on the next preparation instead of caching failure.
      if (!combatFrames.length || !explosionFrames.length) warmPromise = null
    })
  }
  return warmPromise
}

export function getRaidProjectileMaterial(kind: Shot['kind'], enemy = false) {
  return (enemy ? enemyMaterials : playerMaterials)[kind]
}

export function getRaidCombatFrame(tile: number): Texture | undefined { return combatFrames[tile] }

export function getRaidExplosionFrame(progress: number): Texture | undefined {
  return explosionFrames[Math.min(15, Math.max(0, Math.floor(progress * 16)))]
}

export function getRaidCombatRootTextures(): readonly Texture[] { return rootTextures }

/** Use the decoded atlas on the Canvas fallback as well as the Pixi path. */
export function drawRaidCombatTexture(
  ctx: CanvasRenderingContext2D, texture: Texture, x: number, y: number,
  width: number, height: number, rotation: number, additive: boolean,
) {
  const source = texture.source.resource
  if (!source) return false
  const frame = texture.frame
  const resolution = texture.source.resolution
  ctx.save()
  ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over'
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.drawImage(source as CanvasImageSource, frame.x * resolution, frame.y * resolution,
    frame.width * resolution, frame.height * resolution, -width / 2, -height / 2, width, height)
  ctx.restore()
  return true
}
