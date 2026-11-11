import { Assets, Color, Rectangle, Texture } from 'pixi.js'
import { getPublicAssetUrl } from '../sound'
import type { Shot } from './types'
import type { GpuBossProjectileSpec } from './gpuBossProjectiles'

export const RAID_COMBAT_ATLAS_URL = getPublicAssetUrl('assets/raid-fx/combat-atlas-v2.png')
export const RAID_EXPLOSION_ATLAS_URL = getPublicAssetUrl('assets/raid-fx/explosion-atlas-v2.png')
export const RAID_BOSS_ATLAS_URL = getPublicAssetUrl('assets/raid-fx/boss-atlas-v1.png')
export const RAID_MISSILE_ATLAS_URL = getPublicAssetUrl('assets/raid-fx/player-missiles-v1.webp')
export const RAID_VFX_ATLAS_URL = getPublicAssetUrl('assets/raid-fx/raid-effects-v1.webp')
export const RAID_COMBAT_ART_URLS = [RAID_COMBAT_ATLAS_URL, RAID_EXPLOSION_ATLAS_URL, RAID_BOSS_ATLAS_URL, RAID_MISSILE_ATLAS_URL, RAID_VFX_ATLAS_URL]

export const COMBAT_TILE = {
  plasma: 0, hotBolt: 1, ionNeedle: 2, alienOrb: 3,
  fireImpact: 4, ionImpact: 5, spark: 6, shock: 7,
  missile: 8, charge: 9, ink: 10, smoke: 11,
  exhaust: 12, fragment: 13, venom: 14, muzzle: 15,
} as const

export const RAID_VFX_TILE = {
  ionWake: 0, muzzle: 1, shockwave: 2, shield: 3,
  debris: 4, precision: 5, hullDamage: 6, hazard: 7,
  repair: 8, aim: 9, dangerLane: 10, travel: 11, lock: 12, charredPlate: 13,
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
  pulse: [COMBAT_TILE.plasma, 58, 54, true, false],
  laser: [COMBAT_TILE.plasma, 126, 62, true, false],
  spread: [COMBAT_TILE.hotBolt, 72, 58, true, false],
  scatter: [COMBAT_TILE.ionNeedle, 58, 54, true, false],
  needle: [COMBAT_TILE.plasma, 78, 52, true, false],
  rocket: [COMBAT_TILE.missile, 70, 48, true, true],
  homing: [COMBAT_TILE.missile, 58, 42, true, true],
}
const ENEMY_MATERIALS: Partial<Record<Shot['kind'], MaterialSpec>> = {
  enemy: [COMBAT_TILE.alienOrb, 34, 34, false, false],
  boss: [COMBAT_TILE.alienOrb, 40, 40, false, false],
  plasma: [COMBAT_TILE.alienOrb, 40, 40, false, false],
  orbShot: [COMBAT_TILE.alienOrb, 44, 44, false, false],
  voidShot: [COMBAT_TILE.alienOrb, 52, 52, false, false],
  blade: [COMBAT_TILE.plasma, 96, 56, true, false],
  needle: [COMBAT_TILE.ionNeedle, 88, 48, true, false],
  scatterBoss: [COMBAT_TILE.hotBolt, 80, 56, true, false],
  superShot: [COMBAT_TILE.fireImpact, 50, 50, false, false],
}

let combatFrames: Texture[] = []
let vfxFrames: Texture[] = []
let explosionFrames: Texture[] = []
let bossFrames: Texture[] = []
let missileLoaded = false
const bossMaterials: Partial<Record<Shot['kind'], CombatProjectileMaterial>> = {}
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

function splitAtlas(texture: Texture, trimBossProjectiles = false, trimExplosion = false): Texture[] {
  // Generated sheets may be NPOT. WebGL 1 cannot mipmap those sources.
  const powerOfTwo = (value: number) => value > 0 && (value & (value - 1)) === 0
  texture.source.autoGenerateMipmaps = powerOfTwo(texture.source.pixelWidth) && powerOfTwo(texture.source.pixelHeight)
  texture.source.scaleMode = 'linear'
  const width = texture.width / 4
  const height = texture.height / 4
  return Array.from({ length: 16 }, (_, index) => {
    // Normalized boss cells have 32px transparent gutters. Remove only
    // empty padding and retain 8px for filtering; clouds keep their extent.
    const inset = trimExplosion || (trimBossProjectiles && index <= 9 && index !== 5) ? width * (24 / 256) : 2
    return new Texture({
    source: texture.source,
    // A small inset plus the artwork's gutters prevent neighboring tile bleed.
    frame: new Rectangle((index % 4) * width + inset, Math.floor(index / 4) * height + inset, width - inset * 2, height - inset * 2),
    })
  })
}

function buildMaterials(specs: Partial<Record<Shot['kind'], MaterialSpec>>, target: typeof playerMaterials) {
  for (const [kind, spec] of Object.entries(specs)) {
    const [tile, width, height, directional, solid] = spec
    if (target === playerMaterials && missileLoaded && (kind === 'rocket' || kind === 'homing')) continue
    target[kind as Shot['kind']] = { texture: combatFrames[tile], width, height, directional, solid }
  }
}

/** Decode once in the loading screen. Frames share their atlas GPU texture sources. */
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
        explosionFrames = splitAtlas(texture, false, true)
        rootTextures.push(texture)
      }).catch((error: unknown) => { console.warn('Raid explosion artwork failed to load:', RAID_EXPLOSION_ATLAS_URL, error) })),
      (bossFrames.length ? Promise.resolve() : Assets.load<Texture>(RAID_BOSS_ATLAS_URL).then((texture) => {
        bossFrames = splitAtlas(texture, true)
        rootTextures.push(texture)
        const specs: Partial<Record<Shot['kind'], MaterialSpec>> = {
          enemy: [8, 34, 34, false, false], boss: [7, 68, 54, true, false],
          plasma: [8, 54, 54, false, false], orbShot: [6, 60, 60, false, false],
          voidShot: [6, 70, 70, false, false], superShot: [9, 68, 68, false, false],
        }
        for (const [kind, spec] of Object.entries(specs)) {
          const [tile, width, height, directional, solid] = spec
          bossMaterials[kind as Shot['kind']] = { texture: bossFrames[tile], width, height, directional, solid }
        }
      }).catch((error: unknown) => { console.warn('Raid boss artwork failed to load:', RAID_BOSS_ATLAS_URL, error) })),
      (vfxFrames.length ? Promise.resolve() : Assets.load<Texture>(RAID_VFX_ATLAS_URL).then((texture) => {
        vfxFrames = splitAtlas(texture)
        rootTextures.push(texture)
      }).catch((error: unknown) => { console.warn('Raid effects artwork unavailable:', error) })),
      (missileLoaded ? Promise.resolve() : Assets.load<Texture>(RAID_MISSILE_ATLAS_URL).then((texture) => {
        texture.source.scaleMode = 'linear'
        texture.source.autoGenerateMipmaps = true
        rootTextures.push(texture)
        for (const [index, kind, width, height] of [[0, 'rocket', 76, 42], [1, 'homing', 68, 38]] as const) {
          playerMaterials[kind] = {texture: new Texture({source: texture.source,
            frame: new Rectangle(2, index * texture.height / 2 + 2, texture.width - 4, texture.height / 2 - 4)}),
            width, height, directional: true, solid: true}
        }
        missileLoaded = true
      }).catch((error: unknown) => {console.warn('Missile art unavailable:',error)})),
    ]).then(() => {
      // Retry missing art on the next preparation instead of caching failure.
      if (!combatFrames.length || !explosionFrames.length || !bossFrames.length || !vfxFrames.length || !missileLoaded) warmPromise = null
    })
  }
  return warmPromise
}

export function getRaidProjectileMaterial(kind: Shot['kind'], enemy = false) {
  return enemy ? bossMaterials[kind] ?? enemyMaterials[kind] : playerMaterials[kind]
}

const BOSS_ART_TILES: Partial<Record<GpuBossProjectileSpec['kind'], number>> = {
  squidBubble: 0, squidInk: 1, squidSpine: 2, snakeFang: 3, venomSpit: 4, poisonCloud: 5,
}
export function isRaidBossArtSolid(kind: string) {
  return kind === 'poisonCloud' || kind === 'snakeFang' || kind === 'squidSpine'
}
/** Both foreground renderers consume the same texture and geometry. */
export function applyRaidBossArtwork(spec: GpuBossProjectileSpec): Texture | undefined {
  if (spec.kind === 'beam') {
    const texture = getRaidVfxTexture(RAID_VFX_TILE.ionWake)
    if (!texture) return
    const length = spec.width
    spec.width = spec.height
    spec.height = length * 1.16 // The soft ends extend past the visible beam lane.
    spec.rotation -= Math.PI / 2
    return texture
  }
  const tile = BOSS_ART_TILES[spec.kind]
  const texture = tile === undefined ? undefined : bossFrames[tile]
  if (!texture) return undefined
  if (spec.kind === 'snakeFang' || spec.kind === 'squidSpine') {
    const width = spec.width
    spec.width = spec.height
    spec.height = width
    spec.rotation -= Math.PI / 2
  }
  const scale = spec.kind === 'poisonCloud' ? 1.2 : 1.7
  spec.width *= scale
  spec.height *= scale
  return texture
}

export function getRaidVfxTexture(tile: number): Texture | undefined { return vfxFrames[tile] }

export function getRaidCombatFrame(tile: number): Texture | undefined { return combatFrames[tile] }

export function getRaidExplosionFrame(progress: number): Texture | undefined {
  return explosionFrames[Math.min(15, Math.max(0, Math.floor(progress * 16)))]
}

export function getRaidCombatRootTextures(): readonly Texture[] { return rootTextures }

/** Use the decoded atlas on the Canvas fallback as well as the Pixi path. */
export function drawRaidCombatTexture(
  ctx: CanvasRenderingContext2D, texture: Texture, x: number, y: number,
  width: number, height: number, rotation: number, additive: boolean, opacity = 1,
) {
  const source = texture.source.resource
  if (!source) return false
  const frame = texture.frame
  const resolution = texture.source.resolution
  ctx.save()
  ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over'
  if (opacity !== 1) ctx.globalAlpha *= opacity
  ctx.translate(x, y)
  if (rotation) ctx.rotate(rotation)
  ctx.drawImage(source as CanvasImageSource, frame.x * resolution, frame.y * resolution,
    frame.width * resolution, frame.height * resolution, -width / 2, -height / 2, width, height)
  ctx.restore()
  return true
}

export function drawRaidVfx(ctx: CanvasRenderingContext2D, tile: number, x: number, y: number,
  width: number, height: number, opacity: number, rotation = 0, additive = false) {
  const texture = getRaidVfxTexture(tile)
  return !!texture && opacity > 0 && drawRaidCombatTexture(ctx, texture, x, y, width, height, rotation, additive, opacity)
}

/** Align a projection with its gameplay lane. Keep a readable cue if the atlas cannot load. */
export function drawRaidVfxLane(ctx: CanvasRenderingContext2D, tile: number, x1: number, y1: number,
  x2: number, y2: number, width: number, opacity: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy)
  if (length <= 0 || width <= 0) return
  const x = (x1 + x2) * .5
  const y = (y1 + y2) * .5
  const rotation = Math.atan2(-dx, dy)
  if (drawRaidVfx(ctx, tile, x, y, width, length, opacity, rotation)) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.globalAlpha *= opacity
  ctx.fillStyle = tile === RAID_VFX_TILE.aim ? '#fbbf24' : tile === RAID_VFX_TILE.ionWake ? '#67e8f9' : '#fb7185'
  const wide = tile === RAID_VFX_TILE.dangerLane || tile === RAID_VFX_TILE.ionWake
  const fallbackWidth = wide ? width : Math.min(width, 2)
  if (wide) ctx.globalAlpha *= .27
  ctx.fillRect(-fallbackWidth / 2, -length / 2, fallbackWidth, length)
  ctx.restore()
}
