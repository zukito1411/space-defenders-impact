import { getRaidPlayerHullSize } from './playerMuzzle'
import { getRaidSideShipNozzles } from './sideArtwork'
import { getRaidExhaustScale, getRaidShipBaseVisualKey, getRaidShipFrameKey, getRaidShipNozzles, isRaidEliteFrameKey, usesRaidRemasteredHullArt } from './shipArtwork'
import { updateFlightPose, type FlightPose } from './combatFeel'
import { COMBAT_TILE, drawRaidCombatTexture, getRaidCombatFrame } from './combatArt'
import type { ShipCosmeticEquipState } from '../../../progression'
import { drawCanvasSprite, drawCanvasSpriteContain, drawSpriteGlow, getCanvasSpriteDimensions, getCanvasSpriteSource, getRaidSideShipCanvasSprite, getShipCanvasSprite, getSpaceJetForceFieldSprite } from './assets'
import type { CanvasSpriteEntry } from './assets'
import { hexToRgba } from './bossRender'
import { ALLY_PLAYER_COLOR, FORCE_FIELD_ARMOR, GOD_GUNDAM_BURNING_BODY_SCALE, GOD_GUNDAM_BURNING_BODY_Y_OFFSET, GOD_GUNDAM_BURNING_HALO_SCALE, GOD_GUNDAM_BURNING_HALO_Y_OFFSET, MESIAH_DRONE_HOME_OFFSET, MESIAH_DRONE_MAX_FIRE_RANGE, MESIAH_DRONE_MIN_FIRE_RANGE, MESIAH_DRONE_MOBILE_HOME_OFFSET, PLAYER_COLOR, SPACE_ET_PASSIVE_FORCE_FIELD_CHARGES, SPIEGEL_AFTERIMAGE_CAP, getShipSpriteSize } from './constants'
import { coreBlastSpriteCache } from './effectsRender'
import { DEG } from './constants'
import { getCoreLanderBurningRage, isCoreLanderBurning } from './mechanics'
import { getCoreLanderCombatModelFromVisualShipKey, getOptionSupportStacks, normalizeMesiahDrones, normalizeMesiahScoutDrones } from './state'
import type { CoreLanderCombatModel, Enemy, GamePhase, MesiahDroneUnit, MesiahScoutUnit, Player, PowerKind, SpiegelAfterimage, Vec } from './types'
import { clamp, distSq, drawRadialEllipse } from './utils'

export const honeycombShieldSpriteCache = new Map<number, HTMLCanvasElement>()

export const coreLanderBurningHaloSpriteCache = new Map<string, HTMLCanvasElement>()

export const mesiahLiveTargetsScratch: Enemy[] = []

export function getMesiahDroneTarget(player: Player, enemies: Enemy[], lockedTargetId: number | null = null) {
  const lockedTarget = lockedTargetId === null
    ? null
    : enemies.find((enemy) => enemy.id === lockedTargetId && enemy.hp > 0 && enemy.y > -8 && (enemy.isBoss || enemy.isMiniBoss)) ?? null
  if (lockedTarget) return lockedTarget
  let nearest: Enemy | null = null
  let nearestDistance = Infinity
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.y <= -8 || (!enemy.isBoss && !enemy.isMiniBoss)) continue
    const distance = distSq(enemy, player)
    if (distance < nearestDistance || (distance === nearestDistance && nearest && enemy.id < nearest.id)) {
      nearest = enemy
      nearestDistance = distance
    }
  }
  return nearest
}

export function getMesiahScoutTargetBySlot(targets: Enemy[], scout: MesiahScoutUnit, slot: number) {
  if (targets.length === 0) return null
  const targetSlot = ((slot % targets.length) + targets.length) % targets.length
  const usedIds: number[] = []
  let selected: Enemy | null = null
  for (let pick = 0; pick <= targetSlot; pick += 1) {
    let best: Enemy | null = null
    let bestDistance = Infinity
    for (const target of targets) {
      if (usedIds.includes(target.id)) continue
      const distance = distSq(target, scout)
      if (distance < bestDistance || (distance === bestDistance && best && target.id < best.id)) {
        best = target
        bestDistance = distance
      }
    }
    if (!best) break
    selected = best
    usedIds.push(best.id)
  }
  return selected
}

export function getMesiahDroneHome(player: Player, side: number, homeOffset = 7) {
  return {
    x: clamp(player.x + homeOffset * side, 4, 96),
    y: player.y + 5.2,
  }
}

export function getMesiahDroneAttackPoint(player: Player, drone: MesiahDroneUnit, target: Enemy | null, elapsed: number) {
  const direction = drone.side
  const orbitPhase = elapsed * 3.4 + direction * 2.1
  const orbitRadiusX = target ? 13.5 : 7
  const orbitRadiusY = target ? 7.2 : 5
  return {
    x: target
      ? clamp(target.x + Math.cos(orbitPhase) * orbitRadiusX + direction * 4.2, 5, 95)
      : clamp(player.x + direction * 16 + Math.sin(elapsed * 2.4 + direction) * orbitRadiusX, 5, 95),
    y: target
      ? clamp(target.y + 5.8 + Math.sin(orbitPhase) * orbitRadiusY, 8, 78)
      : clamp(player.y - 18 + Math.cos(elapsed * 1.9 + direction) * orbitRadiusY, 12, 74),
  }
}

export function getMesiahScoutSupportPoint(
  player: Player,
  side: number,
  elapsed: number,
  isSmallViewport: boolean,
  target: Enemy | null = null,
  stackIndex = 0,
  totalStacks = 1,
) {
  const stackPhase = stackIndex * Math.PI * 0.84
  const orbit = elapsed * (target ? 3.25 : 2.35) + side * 2.4 + stackPhase
  const stackLane = stackIndex - (totalStacks - 1) / 2
  const sideOffset = (isSmallViewport ? 28 : 5.8) + stackIndex * (isSmallViewport ? 7.2 : 2.2)
  const idleY = 7.4 + stackIndex * (isSmallViewport ? 7.2 : 4.8)
  const orbitX = target ? Math.cos(orbit) * (isSmallViewport ? 13 : 10) : 0
  const orbitY = target ? Math.sin(orbit * 1.15) * (isSmallViewport ? 8.2 : 6.2) : 0
  const x = target
    ? clamp(target.x + side * (isSmallViewport ? 9.5 : 7.2) + stackLane * (isSmallViewport ? 5.5 : 4.2) + orbitX, 5, 95)
    : clamp(player.x + side * sideOffset + orbitX, 4, 96)
  const y = target
    ? clamp(target.y + 6.8 + stackIndex * (isSmallViewport ? 7.4 : 5.8) + orbitY, 10, 82)
    : clamp(player.y + idleY + orbitY, 13, 94)
  const facing = target ? Math.atan2(target.y - y, target.x - x) + Math.PI / 2 : 0
  return { x, y, rotation: facing }
}

export function moveMesiahDroneToward(drone: MesiahDroneUnit, destination: Vec, speed: number, dt: number) {
  const dx = destination.x - drone.x
  const dy = destination.y - drone.y
  const distance = Math.hypot(dx, dy)
  if (distance <= 0.001) return { movedX: 0, movedY: 0 }
  const step = Math.min(distance, speed * dt)
  const movedX = (dx / distance) * step
  const movedY = (dy / distance) * step
  drone.x += movedX
  drone.y += movedY
  return { movedX, movedY }
}

export function updateMesiahDrones(player: Player, enemies: Enemy[], dt: number, isSmallViewport: boolean) {
  const drones = normalizeMesiahDrones(player)
  const active = player.ship.key === 'mesiah' && player.hp > 0
  const elapsed = player.mesiahDroneTimer
  for (const drone of drones) {
    const home = getMesiahDroneHome(player, drone.side, isSmallViewport ? MESIAH_DRONE_MOBILE_HOME_OFFSET : MESIAH_DRONE_HOME_OFFSET)
    if (!active) {
      drone.x = home.x
      drone.y = home.y
      drone.rotation = 0
      drone.targetId = null
      drone.active = false
      drone.canFire = false
      continue
    }

    drone.active = true
    const target = getMesiahDroneTarget(player, enemies, drone.targetId)
    drone.targetId = target?.id ?? null
    const destination = target
      ? getMesiahDroneAttackPoint(player, drone, target, elapsed)
      : home
    const speed = target ? 64 : 58
    const movement = moveMesiahDroneToward(drone, destination, speed, dt)
    const distanceToTarget = target ? Math.hypot(target.x - drone.x, target.y - drone.y) : Infinity
    drone.canFire = Boolean(
      target &&
      elapsed > 0.32 &&
      distanceToTarget >= MESIAH_DRONE_MIN_FIRE_RANGE &&
      distanceToTarget <= MESIAH_DRONE_MAX_FIRE_RANGE,
    )

    if (!target) {
      drone.rotation = 0
      continue
    }

    const facing = drone.canFire && target
      ? { x: target.x - drone.x, y: target.y - drone.y }
      : Math.hypot(movement.movedX, movement.movedY) > 0.01
        ? { x: movement.movedX, y: movement.movedY }
        : { x: destination.x - drone.x, y: destination.y - drone.y }
    drone.rotation = Math.atan2(facing.y || -1, facing.x || 0) + Math.PI / 2
  }
}

export function updateMesiahScoutDrones(player: Player, enemies: Enemy[], dt: number, isSmallViewport: boolean) {
  const scouts = normalizeMesiahScoutDrones(player)
  const supportStacks = getOptionSupportStacks(player)
  const supportSizeScale = typeof player.sizeScale === 'number' && Number.isFinite(player.sizeScale) ? Math.max(1, Math.min(1.5, player.sizeScale)) : 1
  const active = player.ship.key === 'mesiah' && player.hp > 0 && supportStacks > 0
  const elapsed = player.mesiahDroneTimer
  const liveTargets = mesiahLiveTargetsScratch
  liveTargets.length = 0
  for (const enemy of enemies) {
    if (enemy.hp > 0 && enemy.y > -8 && (enemy.isBoss || enemy.isMiniBoss)) liveTargets.push(enemy)
  }
  for (const scout of scouts) {
    const enabled = active && scout.stack < supportStacks
    const home = getMesiahScoutSupportPoint(player, scout.side, elapsed, isSmallViewport, null, scout.stack, Math.max(1, supportStacks))
    if (!enabled) {
      scout.x = home.x
      scout.y = home.y
      scout.rotation = 0
      scout.targetId = null
      scout.active = false
      scout.canFire = false
      continue
    }

    scout.active = true
    const slot = scout.stack * 2 + (scout.side > 0 ? 1 : 0)
    const target = getMesiahScoutTargetBySlot(liveTargets, scout, slot)
    scout.targetId = target?.id ?? null
    const destination = target
      ? getMesiahScoutSupportPoint(player, scout.side, elapsed, isSmallViewport, target, scout.stack, supportStacks)
      : home
    const distanceToHome = Math.hypot(home.x - scout.x, home.y - scout.y)
    const movement = moveMesiahDroneToward(scout, destination, target ? 72 : Math.min(82, 54 + distanceToHome * 2.1), dt)
    const distanceToTarget = target ? Math.hypot(target.x - scout.x, target.y - scout.y) : Infinity
    scout.canFire = Boolean(
      elapsed > 0.32 &&
      (!target || (distanceToTarget >= 5.5 && distanceToTarget <= 26)),
    )

    if (!target) {
      scout.rotation = 0
      continue
    }

    const facing = scout.canFire
      ? { x: target.x - scout.x, y: target.y - scout.y }
      : Math.hypot(movement.movedX, movement.movedY) > 0.01
        ? { x: movement.movedX, y: movement.movedY }
        : { x: destination.x - scout.x, y: destination.y - scout.y }
    scout.rotation = Math.atan2(facing.y || -1, facing.x || 0) + Math.PI / 2
  }
}

export function drawSupportEngineTrail(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, rotation = 0, alpha = 0.82, shipKey = '', throttle = .28, landscape = false) {
  if (shipKey === 'coreLander') return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.globalAlpha *= alpha
  const wakeScale = shipKey === 'godGundam' || shipKey === 'spiegel' ? undefined : .65
  drawHullExhaust(ctx, 0, 0, size, time, throttle, shipKey, wakeScale, undefined, shipKey, landscape)
  ctx.restore()
}

export function drawRaidOptions(
  ctx: CanvasRenderingContext2D,
  player: Player,
  toX: (value: number) => number,
  toY: (value: number) => number,
  viewportWidth: number,
  time: number,
  color = PLAYER_COLOR,
  mesiahVisualShipKey = 'mesiahBlack',
  landscape = false,
) {
  const isArk = player.ship.key === 'dreadnought'
  const isMesiah = player.ship.key === 'mesiah' && player.hp > 0
  const isWhiteMesiah = isMesiah && getRaidShipBaseVisualKey(mesiahVisualShipKey) === 'mesiahWhite'
  const isMesiahSortie = isMesiah
  const supportStacks = getOptionSupportStacks(player)
  if (supportStacks <= 0 && !isArk && !isMesiah) return

  const drawSupportPair = (shipKey: string, offset: number, yOffset: number, maxBox: number, scale: number, filter: string) => {
    const optionShipSize = getShipSpriteSize(shipKey, 'option')
    const drawSize = Math.min(optionShipSize * scale, maxBox) * (landscape ? 1.15 : 1) * supportSizeScale
    const sprite = getShipCanvasSprite(shipKey)
    const sideSprite = landscape ? getRaidSideShipCanvasSprite(shipKey) : null

    for (const side of [-1, 1]) {
      const x = toX(clamp(player.x + offset * side, 4, 96))
      const y = toY(player.y + yOffset) + Math.sin(time / 900 + (side > 0 ? 0.18 : 0)) * 2.5
      const trailOverHull = shipKey === 'godGundam' || shipKey === 'spiegel'
      const throttle = .14 + (player.engineBoost ?? 0) * .58
      if (!trailOverHull) drawSupportEngineTrail(ctx, x, y, drawSize, time, 0, 0.9, shipKey, throttle, Boolean(sideSprite?.loaded))
      if (sideSprite?.loaded) drawCanvasSpriteContain(ctx, sideSprite, x, y, drawSize, 'none', 1, -Math.PI / 2, 1, color)
      else drawCanvasSprite(ctx, sprite, x, y, drawSize, filter, 1, 0, 1, color)
      if (trailOverHull) drawSupportEngineTrail(ctx, x, y, drawSize, time, 0, .7, shipKey, throttle, Boolean(sideSprite?.loaded))
    }
  }

  if (isArk) {
    drawSupportPair(
      'rocket',
      viewportWidth < 640 ? 14 : 7.4,
      1.8,
      viewportWidth < 860 ? 35 : 50,
      1.25,
      'brightness(1.08) contrast(1.18) saturate(1.35)',
    )
    if (supportStacks > 0) {
      drawSupportPair(
        'spaceEt',
        viewportWidth < 640 ? 8.2 : 5,
        7.2,
        viewportWidth < 860 ? 27 : 39,
        1.04,
        'brightness(1.18) contrast(1.16) saturate(1.3)',
      )
    }
    return
  }

  if (isMesiah) {
    const droneShipKey = isWhiteMesiah ? 'mesiahRaptorWhite' : 'mesiahRaptorBlack'
    const sprite = getShipCanvasSprite(droneShipKey)
    const sideSprite = landscape ? getRaidSideShipCanvasSprite(droneShipKey) : null
    const drawSize = Math.min(getShipSpriteSize(droneShipKey, 'option') * (viewportWidth < 860 ? 1.14 : 1.28), viewportWidth < 860 ? 35 : 54) * (landscape ? 1.15 : 1) * supportSizeScale
    for (const drone of normalizeMesiahDrones(player)) {
      const idle = !isMesiahSortie || !drone.active
      const x = toX(drone.x)
      const y = toY(drone.y) + Math.sin(time / (idle ? 520 : 135) + drone.side) * (idle ? 1.4 : 0.8)
      const alpha = idle ? 0.72 : 1
      const scale = idle ? 0.9 : 1
      const filter = idle
        ? 'brightness(0.86) contrast(1.08) saturate(0.92)'
        : 'brightness(1.08) contrast(1.18) saturate(1.35)'
      drawSupportEngineTrail(ctx, x, y, drawSize * scale, time, idle ? 0 : drone.rotation, idle ? 0.7 : 0.92, droneShipKey, idle ? .06 : .70, Boolean(sideSprite?.loaded))
      if (sideSprite?.loaded) drawCanvasSpriteContain(ctx, sideSprite, x, y, drawSize, 'none', alpha, (idle ? 0 : drone.rotation) - Math.PI / 2, scale, color)
      else drawCanvasSprite(ctx, sprite, x, y, drawSize, filter, alpha, idle ? 0 : drone.rotation, scale, color)
    }
  }

  if (supportStacks > 0) {
    if (player.ship.key === 'mesiah') {
      const scoutShipKey = isWhiteMesiah ? 'mesiahRaptorWhite' : 'mesiahRaptorBlack'
      const scoutSprite = getShipCanvasSprite(scoutShipKey)
      const sideScoutSprite = landscape ? getRaidSideShipCanvasSprite(scoutShipKey) : null
      const scoutSizeKey = scoutShipKey
      const scoutSize = Math.min(getShipSpriteSize(scoutSizeKey, 'option') * (viewportWidth < 860 ? 1.14 : 1.28), viewportWidth < 860 ? 35 : 54) * (landscape ? 1.15 : 1) * supportSizeScale
      for (const scout of normalizeMesiahScoutDrones(player)) {
        if (!scout.active || scout.stack >= supportStacks) continue
        const x = toX(scout.x)
        const y = toY(scout.y)
        drawSupportEngineTrail(ctx, x, y, scoutSize, time, scout.rotation, 0.9, scoutShipKey, scout.canFire ? .48 : .78, Boolean(sideScoutSprite?.loaded))
        if (sideScoutSprite?.loaded) drawCanvasSpriteContain(ctx, sideScoutSprite, x, y, scoutSize, 'none', 1, scout.rotation - Math.PI / 2, 1, color)
        else drawCanvasSprite(ctx, scoutSprite, x, y, scoutSize, 'brightness(1.14) contrast(1.16) saturate(1.34)', 1, scout.rotation, 1, color)
      }
    } else {
      const supportShipKey = player.ship.key === 'coreLander'
        ? getCoreLanderCombatModelFromVisualShipKey(mesiahVisualShipKey) ?? 'coreLander'
        : player.ship.key
      const supportOffset = viewportWidth < 640 ? 12 : 5.6
      const supportMaxBox = viewportWidth < 860 ? 36 : 53
      drawSupportPair(
        supportShipKey,
        supportOffset,
        1.8,
        supportMaxBox,
        1.28,
        'brightness(1.12) contrast(1.12) saturate(1.24)',
      )
    }
  }
}

// Cache a small color ramp from the existing exhaust tile. Gameplay draws one bitmap per nozzle.
const ENGINE_HEAT_FILTERS = [
  'saturate(.85)', 'hue-rotate(18deg)', 'hue-rotate(38deg)',
  'hue-rotate(72deg) saturate(.8)', 'hue-rotate(124deg) saturate(.72)',
  'hue-rotate(165deg) saturate(.78)', 'hue-rotate(192deg) saturate(.9)',
]
let engineHeatSprites: HTMLCanvasElement[] | null = null
// Root of the bright core in the upright exhaust tile, measured in the art.
const EXHAUST_ORIGIN_X = .452
const EXHAUST_ORIGIN_Y = .25

export function warmRaidEngineExhaust() {
  if (engineHeatSprites || typeof document === 'undefined') return
  const texture = getRaidCombatFrame(COMBAT_TILE.exhaust)
  if (!texture?.source?.resource) return
  const size = 96
  const sprites: HTMLCanvasElement[] = []
  for (const filter of ENGINE_HEAT_FILTERS) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.filter = filter
    if (!drawRaidCombatTexture(ctx, texture, size / 2, size / 2, size, size, -Math.PI / 2, false)) return
    sprites.push(canvas)
  }
  engineHeatSprites = sprites
}

function getEngineLengthScale(engineBoost: number, time: number) {
  const throttle = clamp(engineBoost / 1.35, 0, 1)
  const flicker = 1 + Math.sin(time / 54) * .058 + Math.sin(time / 93) * .022
  return (.61 + throttle * .69 + throttle * throttle * .17) * flicker
}

export function drawPlayerEngine(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, engineBoost = 0, nozzleWidth?: number) {
  const length = size * getEngineLengthScale(engineBoost, time)
  const throttle = clamp(engineBoost / 1.35, 0, 1)
  const width = nozzleWidth === undefined ? size * .36 : nozzleWidth / .12
  const left = x - width * EXHAUST_ORIGIN_X
  const top = y + size * .34
  const plumeTop = top - length * EXHAUST_ORIGIN_Y
  const alpha = .73 + .21 * throttle + Math.sin(time / 80) * .035
  if (engineHeatSprites) {
    const index = Math.round(clamp(throttle + Math.sin(time / 127) * .045, 0, 1) * (engineHeatSprites.length - 1))
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha *= alpha
    ctx.drawImage(engineHeatSprites[index], left, plumeTop, width, length)
    ctx.restore()
    return
  }
  const exhaust = getRaidCombatFrame(COMBAT_TILE.exhaust)
  if (exhaust && drawRaidCombatTexture(ctx, exhaust, left + width / 2, plumeTop + length / 2,
    length, width, -Math.PI / 2, true, alpha)) return

  const flameHeight = length * .52
  const flameWidth = nozzleWidth === undefined ? size * .11 : nozzleWidth / 0.96
  const tip = top + flameHeight
  const gradient = ctx.createLinearGradient(x, top, x, tip)
  gradient.addColorStop(0, 'rgba(255,255,255,0.96)')
  gradient.addColorStop(0.18, 'rgba(103,232,249,0.88)')
  gradient.addColorStop(0.52, 'rgba(239,35,60,0.42)')
  gradient.addColorStop(1, 'rgba(239,35,60,0)')
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = gradient
  ctx.shadowBlur = 10
  ctx.shadowColor = 'rgba(34,211,238,0.28)'
  ctx.beginPath()
  ctx.moveTo(x - flameWidth * 0.48, top)
  ctx.bezierCurveTo(x - flameWidth * 0.5, top + flameHeight * 0.24, x - flameWidth * 0.18, top + flameHeight * 0.72, x, tip)
  ctx.bezierCurveTo(x + flameWidth * 0.18, top + flameHeight * 0.72, x + flameWidth * 0.5, top + flameHeight * 0.24, x + flameWidth * 0.48, top)
  ctx.closePath()
  ctx.fill()

  const core = ctx.createLinearGradient(x, top, x, top + flameHeight * 0.72)
  core.addColorStop(0, 'rgba(255,255,255,0.95)')
  core.addColorStop(0.42, 'rgba(165,243,252,0.82)')
  core.addColorStop(1, 'rgba(34,211,238,0)')
  ctx.fillStyle = core
  ctx.shadowBlur = 5
  ctx.beginPath()
  ctx.moveTo(x - flameWidth * 0.2, top + size * 0.01)
  ctx.bezierCurveTo(x - flameWidth * 0.18, top + flameHeight * 0.22, x - flameWidth * 0.05, top + flameHeight * 0.52, x, top + flameHeight * 0.74)
  ctx.bezierCurveTo(x + flameWidth * 0.05, top + flameHeight * 0.52, x + flameWidth * 0.18, top + flameHeight * 0.22, x + flameWidth * 0.2, top + size * 0.01)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function drawCoreLanderBurningHalo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, alpha = 1) {
  const sprite = getCoreLanderBurningHaloSprite(size, time)
  if (sprite) {
    const ringY = y + size * 0.02
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.translate(x, ringY)
    ctx.rotate(Math.sin(time / 1500) * 0.035)
    ctx.globalAlpha *= alpha
    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2)
    ctx.restore()
    return
  }

  const pulse = 0.97 + Math.sin(time / 240) * 0.035
  const radius = size * 0.72 * pulse
  const ringY = y + size * 0.02

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.translate(x, ringY)
  ctx.rotate(Math.sin(time / 1500) * 0.035)
  ctx.globalAlpha = 0.52 * alpha
  ctx.lineCap = 'round'

  const glow = ctx.createRadialGradient(0, 0, radius * 0.24, 0, 0, radius * 1.28)
  glow.addColorStop(0, 'rgba(254,240,138,0)')
  glow.addColorStop(0.62, 'rgba(250,204,21,0.09)')
  glow.addColorStop(1, 'rgba(249,115,22,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.28, 0, Math.PI * 2)
  ctx.fill()

  ctx.lineWidth = Math.max(3.2, size * 0.046)
  ctx.strokeStyle = 'rgba(239,68,68,0.24)'
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.lineWidth = Math.max(2.6, size * 0.035)
  ctx.strokeStyle = 'rgba(250,204,21,0.42)'
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.94, 0, Math.PI * 2)
  ctx.stroke()

  ctx.lineWidth = Math.max(1.2, size * 0.012)
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.74, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = 0.38
  ctx.lineWidth = Math.max(0.9, size * 0.009)
  ctx.strokeStyle = 'rgba(255,255,255,0.26)'
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.02, Math.PI * 1.08, Math.PI * 1.9)
  ctx.stroke()
  ctx.restore()
}

export function getCoreLanderBurningHaloSprite(size: number, time: number) {
  if (typeof document === 'undefined') return null

  const roundedSize = Math.max(24, Math.round(size / 2) * 2)
  const frameBucket = Math.abs(Math.trunc(time / 120) % 8)
  const cacheKey = `${roundedSize}:${frameBucket}`
  const cached = coreLanderBurningHaloSpriteCache.get(cacheKey)
  if (cached) return cached

  const frameTime = frameBucket * 120
  const pulse = 0.97 + Math.sin(frameTime / 240) * 0.035
  const radius = roundedSize * 0.72 * pulse
  const canvasSize = Math.ceil(radius * 2.64 + roundedSize * 0.16)
  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize
  const haloCtx = canvas.getContext('2d')
  if (!haloCtx) return null

  const center = canvasSize / 2
  haloCtx.translate(center, center)
  haloCtx.globalCompositeOperation = 'lighter'
  haloCtx.lineCap = 'round'

  haloCtx.globalAlpha = 0.52
  const glow = haloCtx.createRadialGradient(0, 0, radius * 0.24, 0, 0, radius * 1.22)
  glow.addColorStop(0, 'rgba(254,240,138,0)')
  glow.addColorStop(0.62, 'rgba(250,204,21,0.07)')
  glow.addColorStop(1, 'rgba(249,115,22,0)')
  haloCtx.fillStyle = glow
  haloCtx.beginPath()
  haloCtx.arc(0, 0, radius * 1.22, 0, Math.PI * 2)
  haloCtx.fill()

  haloCtx.lineWidth = Math.max(3.2, roundedSize * 0.046)
  haloCtx.strokeStyle = 'rgba(239,68,68,0.22)'
  haloCtx.beginPath()
  haloCtx.arc(0, 0, radius, 0, Math.PI * 2)
  haloCtx.stroke()

  haloCtx.lineWidth = Math.max(2.6, roundedSize * 0.035)
  haloCtx.strokeStyle = 'rgba(250,204,21,0.4)'
  haloCtx.beginPath()
  haloCtx.arc(0, 0, radius * 0.94, 0, Math.PI * 2)
  haloCtx.stroke()

  haloCtx.lineWidth = Math.max(1.2, roundedSize * 0.012)
  haloCtx.strokeStyle = 'rgba(255,255,255,0.16)'
  haloCtx.beginPath()
  haloCtx.arc(0, 0, radius * 0.74, 0, Math.PI * 2)
  haloCtx.stroke()

  haloCtx.globalAlpha = 0.34
  haloCtx.lineWidth = Math.max(0.9, roundedSize * 0.009)
  haloCtx.strokeStyle = 'rgba(255,255,255,0.24)'
  haloCtx.beginPath()
  haloCtx.arc(0, 0, radius * 1.02, Math.PI * 1.08, Math.PI * 1.9)
  haloCtx.stroke()

  if (coreLanderBurningHaloSpriteCache.size >= 48) {
    const oldestKey = coreLanderBurningHaloSpriteCache.keys().next().value
    if (oldestKey) coreLanderBurningHaloSpriteCache.delete(oldestKey)
  }
  coreLanderBurningHaloSpriteCache.set(cacheKey, canvas)
  return canvas
}

export function drawCoreLanderBurningCometWake(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, alpha = 1, dualVent = false) {
  const pulse = 0.94 + Math.sin(time / 170) * 0.045
  const flicker = Math.sin(time / 91) * size * 0.018
  const top = y - size * (dualVent ? 0.46 : 0.38)
  const length = size * (dualVent ? 1.7 : 1.52) * pulse
  const tip = top + length + flicker
  const width = size * (dualVent ? 0.46 : 0.54)
  const capY = top + size * 0.16

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha *= 0.42 * alpha

  const outer = ctx.createLinearGradient(x, top, x, tip)
  outer.addColorStop(0, 'rgba(255,255,255,0.1)')
  outer.addColorStop(0.18, 'rgba(254,240,138,0.3)')
  outer.addColorStop(0.48, 'rgba(250,204,21,0.2)')
  outer.addColorStop(0.78, 'rgba(251,146,60,0.08)')
  outer.addColorStop(1, 'rgba(251,146,60,0)')
  ctx.fillStyle = outer
  ctx.shadowBlur = Math.max(14, size * 0.18)
  ctx.shadowColor = 'rgba(250,204,21,0.18)'
  ctx.beginPath()
  ctx.moveTo(x - width * 0.38, capY)
  ctx.bezierCurveTo(x - width * 0.36, top + size * 0.02, x + width * 0.36, top + size * 0.02, x + width * 0.38, capY)
  ctx.bezierCurveTo(x + width * 0.62, top + length * 0.2, x + width * 0.2, top + length * 0.68, x, tip)
  ctx.bezierCurveTo(x - width * 0.2, top + length * 0.68, x - width * 0.62, top + length * 0.2, x - width * 0.38, capY)
  ctx.closePath()
  ctx.fill()

  const core = ctx.createLinearGradient(x, capY, x, top + length * 0.72)
  core.addColorStop(0, 'rgba(255,255,255,0.2)')
  core.addColorStop(0.28, 'rgba(254,240,138,0.32)')
  core.addColorStop(0.62, 'rgba(250,204,21,0.18)')
  core.addColorStop(1, 'rgba(250,204,21,0)')
  ctx.fillStyle = core
  ctx.shadowBlur = Math.max(7, size * 0.08)
  ctx.beginPath()
  ctx.moveTo(x, capY + size * 0.08)
  ctx.bezierCurveTo(x - width * 0.18, capY + size * 0.1, x - width * 0.2, top + length * 0.32, x - width * 0.08, top + length * 0.64)
  ctx.bezierCurveTo(x - width * 0.03, top + length * 0.74, x - width * 0.02, top + length * 0.84, x, tip - size * 0.12)
  ctx.bezierCurveTo(x + width * 0.02, top + length * 0.84, x + width * 0.03, top + length * 0.74, x + width * 0.08, top + length * 0.64)
  ctx.bezierCurveTo(x + width * 0.2, top + length * 0.32, x + width * 0.18, capY + size * 0.1, x, capY + size * 0.08)
  ctx.closePath()
  ctx.fill()

  if (dualVent) {
    const ventOffset = size * 0.026
    const streakLength = length * 0.88
    const streakWidth = size * 0.026
    for (const side of [-1, 1]) {
      const sx = x + side * ventOffset
      const streakTop = capY + size * 0.12
      const streak = ctx.createLinearGradient(sx, streakTop, sx, streakTop + streakLength)
      streak.addColorStop(0, 'rgba(255,255,255,0.18)')
      streak.addColorStop(0.32, 'rgba(254,240,138,0.22)')
      streak.addColorStop(1, 'rgba(250,204,21,0)')
      ctx.fillStyle = streak
      ctx.beginPath()
      ctx.moveTo(sx - streakWidth, streakTop)
      ctx.bezierCurveTo(sx - streakWidth * 1.3, streakTop + streakLength * 0.28, sx - streakWidth * 0.28, streakTop + streakLength * 0.7, sx, streakTop + streakLength)
      ctx.bezierCurveTo(sx + streakWidth * 0.28, streakTop + streakLength * 0.7, sx + streakWidth * 1.3, streakTop + streakLength * 0.28, sx + streakWidth, streakTop)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

export function getCoreBlastSprite(radius: number, burning: boolean, frameBucket: number) {
  const roundedRadius = Math.max(1, Math.round(radius * 2) / 2)
  const cacheKey = `${burning ? 'burning' : 'normal'}:${roundedRadius}:${frameBucket}`
  const cached = coreBlastSpriteCache.get(cacheKey)
  if (cached) return cached

  const length = roundedRadius * (burning ? 6.2 : 5.35)
  const pulse = 0.95 + Math.sin(frameBucket * Math.PI * 2) * 0.05
  const flicker = Math.sin(frameBucket * Math.PI * 2 + 1.7) * roundedRadius * 0.08
  const width = roundedRadius * 3.45
  const height = Math.ceil((length + roundedRadius * 3.5 + Math.abs(flicker)) * 1.12)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width)
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const x = canvas.width / 2
  const headY = roundedRadius * 2.2
  const tailY = headY + length + flicker
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  const outerWake = ctx.createLinearGradient(x, headY, x, tailY)
  outerWake.addColorStop(0, 'rgba(255,255,255,0.94)')
  outerWake.addColorStop(0.18, burning ? 'rgba(254,240,138,0.86)' : 'rgba(254,215,170,0.84)')
  outerWake.addColorStop(0.42, burning ? 'rgba(251,146,60,0.62)' : 'rgba(249,115,22,0.58)')
  outerWake.addColorStop(0.72, burning ? 'rgba(239,68,68,0.34)' : 'rgba(239,35,60,0.3)')
  outerWake.addColorStop(1, 'rgba(239,35,60,0)')
  ctx.strokeStyle = outerWake
  ctx.lineWidth = roundedRadius * (burning ? 0.84 : 0.72) * pulse
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, headY)
  ctx.bezierCurveTo(
    x + roundedRadius * 0.12,
    headY + roundedRadius * 1.05,
    x + roundedRadius * 0.06,
    tailY - roundedRadius * 0.7,
    x,
    tailY,
  )
  ctx.stroke()

  for (let wisp = -1; wisp <= 1; wisp += 1) {
    const sway = Math.sin(frameBucket * Math.PI * 2 + wisp * 1.8) * roundedRadius * 0.08
    const side = wisp * roundedRadius * 0.18 + sway
    const wispTailX = x + side
    const wake = ctx.createLinearGradient(x, headY, wispTailX, tailY)
    wake.addColorStop(0, 'rgba(255,255,255,0.56)')
    wake.addColorStop(0.4, burning ? 'rgba(251,191,36,0.28)' : 'rgba(251,146,60,0.24)')
    wake.addColorStop(1, 'rgba(239,35,60,0)')
    ctx.strokeStyle = wake
    ctx.lineWidth = Math.max(1.1, roundedRadius * (wisp === 0 ? 0.22 : 0.13))
    ctx.beginPath()
    ctx.moveTo(x, headY + roundedRadius * 0.1)
    ctx.quadraticCurveTo(x + side * 0.34, headY + length * 0.48, wispTailX, tailY)
    ctx.stroke()
  }

  const coreWake = ctx.createLinearGradient(x, headY, x, tailY)
  coreWake.addColorStop(0, 'rgba(255,255,255,0.95)')
  coreWake.addColorStop(0.34, burning ? 'rgba(254,240,138,0.9)' : 'rgba(255,237,213,0.86)')
  coreWake.addColorStop(0.68, 'rgba(251,146,60,0.34)')
  coreWake.addColorStop(1, 'rgba(239,68,68,0)')
  ctx.strokeStyle = coreWake
  ctx.lineWidth = Math.max(1.3, roundedRadius * 0.26)
  ctx.beginPath()
  ctx.moveTo(x, headY)
  ctx.lineTo(x, tailY - roundedRadius * 0.4)
  ctx.stroke()

  const flame = ctx.createLinearGradient(x, headY, x, tailY)
  flame.addColorStop(0, 'rgba(255,255,255,0.96)')
  flame.addColorStop(0.2, burning ? 'rgba(254,240,138,0.86)' : 'rgba(254,215,170,0.84)')
  flame.addColorStop(0.52, 'rgba(249,115,22,0.48)')
  flame.addColorStop(1, 'rgba(239,35,60,0)')
  ctx.fillStyle = flame
  ctx.shadowBlur = 4
  ctx.shadowColor = burning ? 'rgba(250,204,21,0.22)' : 'rgba(249,115,22,0.2)'
  ctx.beginPath()
  ctx.moveTo(x, headY - roundedRadius * 0.82)
  ctx.bezierCurveTo(
    x + roundedRadius * 0.48,
    headY + roundedRadius * 0.14,
    x + roundedRadius * 0.2,
    tailY - roundedRadius * 0.74,
    x,
    tailY,
  )
  ctx.bezierCurveTo(
    x - roundedRadius * 0.2,
    tailY - roundedRadius * 0.74,
    x - roundedRadius * 0.48,
    headY + roundedRadius * 0.14,
    x,
    headY - roundedRadius * 0.82,
  )
  ctx.closePath()
  ctx.fill()

  const glow = ctx.createRadialGradient(x, headY, 1, x, headY, roundedRadius * 1.28)
  glow.addColorStop(0, 'rgba(255,255,255,0.82)')
  glow.addColorStop(0.28, burning ? 'rgba(254,240,138,0.54)' : 'rgba(254,215,170,0.52)')
  glow.addColorStop(0.64, 'rgba(249,115,22,0.22)')
  glow.addColorStop(1, 'rgba(239,68,68,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, headY, roundedRadius * 1.28 * pulse, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = burning ? 'rgba(255,255,255,0.98)' : 'rgba(255,250,245,0.94)'
  ctx.beginPath()
  ctx.arc(x, headY, roundedRadius * 0.42, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (coreBlastSpriteCache.size >= 48) {
    const oldestKey = coreBlastSpriteCache.keys().next().value
    if (oldestKey) coreBlastSpriteCache.delete(oldestKey)
  }
  coreBlastSpriteCache.set(cacheKey, canvas)
  return canvas
}

export function drawInvulnerabilityShimmer(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number) {
  const pulse = 0.96 + Math.sin(time / 520) * 0.045
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(pulse, pulse)
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = 'rgba(226,232,240,0.34)'
  ctx.fillStyle = 'rgba(226,232,240,0.035)'
  ctx.shadowBlur = 12
  ctx.shadowColor = 'rgba(226,232,240,0.24)'
  ctx.lineWidth = 1
  ctx.setLineDash([size * 0.075, size * 0.055])
  ctx.lineDashOffset = -time / 72
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

export function getHoneycombShieldSprite(size: number) {
  const spriteSize = Math.max(48, Math.round(size))
  const cached = honeycombShieldSpriteCache.get(spriteSize)
  if (cached) return cached

  const radius = spriteSize * 0.53
  const pad = Math.ceil(spriteSize * 0.18)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(radius * 2 + pad * 2)
  canvas.height = canvas.width
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.globalCompositeOperation = 'lighter'

  const shell = ctx.createRadialGradient(0, 0, radius * 0.16, 0, 0, radius * 1.08)
  shell.addColorStop(0, 'rgba(255,251,235,0.12)')
  shell.addColorStop(0.54, 'rgba(252,211,77,0.11)')
  shell.addColorStop(0.9, 'rgba(245,158,11,0.22)')
  shell.addColorStop(1, 'rgba(245,158,11,0)')
  ctx.fillStyle = shell
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.08, 0, Math.PI * 2)
  ctx.fill()

  const cell = spriteSize * 0.145
  const hexRadius = cell * 0.54
  const hexHeight = Math.sqrt(3) * cell
  const cols = Math.ceil(radius / (cell * 1.5)) + 1
  const rows = Math.ceil(radius / hexHeight) + 1
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.strokeStyle = 'rgba(252,211,77,0.52)'
  ctx.lineWidth = Math.max(0.8, spriteSize * 0.011)
  for (let col = -cols; col <= cols; col += 1) {
    for (let row = -rows; row <= rows; row += 1) {
      const hx = col * cell * 1.5
      const hy = (row + (Math.abs(col) % 2) * 0.5) * hexHeight
      if (Math.hypot(hx, hy) > radius - hexRadius * 0.2) continue
      ctx.save()
      ctx.translate(hx, hy)
      traceRegularPolygon(ctx, 6, hexRadius, Math.PI / 6)
      ctx.stroke()
      ctx.restore()
    }
  }
  ctx.restore()

  ctx.strokeStyle = 'rgba(255,251,235,0.68)'
  ctx.lineWidth = Math.max(1.3, spriteSize * 0.018)
  ctx.shadowBlur = 8
  ctx.shadowColor = 'rgba(252,211,77,0.45)'
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.stroke()

  honeycombShieldSpriteCache.set(spriteSize, canvas)
  return canvas
}

export function drawHoneycombShield(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, strength: number) {
  const pulse = 0.985 + Math.sin(time / 620) * 0.025
  const radius = size * 0.53
  const sprite = getHoneycombShieldSprite(size)

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(pulse, pulse)
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.66 + strength * 0.34
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2)
  ctx.globalAlpha = 1

  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1.1, size * 0.016)
  ctx.shadowBlur = 4
  ctx.shadowColor = 'rgba(252,211,77,0.36)'
  for (let index = 0; index < 3; index += 1) {
    const angle = time / 740 + index * Math.PI * 0.42
    ctx.strokeStyle = index % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(251,191,36,0.58)'
    ctx.beginPath()
    ctx.arc(0, 0, radius * (0.88 + (index % 2) * 0.08), angle, angle + Math.PI * 0.16)
    ctx.stroke()
  }
  ctx.restore()
}

export function tracePlasmaLoop(ctx: CanvasRenderingContext2D, radius: number, phase: number, wobble: number, segments = 48) {
  ctx.beginPath()
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2
    const wave =
      Math.sin(angle * 5 + phase) * wobble +
      Math.sin(angle * 9 - phase * 1.28) * wobble * 0.45 +
      Math.sin(angle * 3 + phase * 0.72) * wobble * 0.32
    const r = radius + wave
    const px = Math.cos(angle) * r
    const py = Math.sin(angle) * r
    if (index === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

export function drawPlasmaForceField(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, charge: number) {
  const phase = time / 310
  const pulse = 0.96 + Math.sin(time / 260) * 0.055
  const radius = size * (0.64 + charge * 0.035) * pulse
  const wobble = size * (0.02 + charge * 0.007)

  ctx.save()
  ctx.translate(x, y)
  ctx.globalCompositeOperation = 'lighter'

  const core = ctx.createRadialGradient(0, 0, radius * 0.14, 0, 0, radius * 1.24)
  core.addColorStop(0, 'rgba(255,255,255,0.03)')
  core.addColorStop(0.48, 'rgba(34,211,238,0.06)')
  core.addColorStop(0.76, 'rgba(217,70,239,0.13)')
  core.addColorStop(1, 'rgba(34,211,238,0)')
  ctx.fillStyle = core
  tracePlasmaLoop(ctx, radius * 1.08, phase * 0.8, wobble * 0.5, 40)
  ctx.fill()

  const colors = ['rgba(165,243,252,0.84)', 'rgba(217,70,239,0.5)']
  for (let layer = 0; layer < 2; layer += 1) {
    ctx.shadowBlur = 13 - layer * 3
    ctx.shadowColor = layer === 1 ? 'rgba(217,70,239,0.52)' : 'rgba(34,211,238,0.72)'
    ctx.strokeStyle = colors[layer]
    ctx.lineWidth = Math.max(1, size * (0.024 - layer * 0.004))
    tracePlasmaLoop(ctx, radius * (1 + layer * 0.075), phase * (layer % 2 ? -1.15 : 1), wobble * (1.1 - layer * 0.24), layer === 0 ? 46 : 38)
    ctx.stroke()
  }

  ctx.lineCap = 'round'
  ctx.shadowBlur = 6
  for (let arc = 0; arc < 4; arc += 1) {
    const angle = phase * 0.7 + arc * Math.PI * 0.58
    const arcRadius = radius * (0.86 + (arc % 3) * 0.055)
    ctx.strokeStyle = arc % 2 === 0 ? 'rgba(34,211,238,0.66)' : 'rgba(244,114,182,0.48)'
    ctx.lineWidth = Math.max(1.2, size * 0.013)
    ctx.beginPath()
    ctx.arc(0, 0, arcRadius, angle, angle + Math.PI * (0.12 + (arc % 2) * 0.08))
    ctx.stroke()
  }

  ctx.shadowBlur = 5
  for (let spark = 0; spark < 4; spark += 1) {
    const angle = phase * 1.35 + spark * Math.PI * 0.5
    const sparkRadius = radius * (0.92 + Math.sin(phase + spark) * 0.08)
    ctx.fillStyle = spark % 2 === 0 ? 'rgba(255,255,255,0.82)' : 'rgba(34,211,238,0.78)'
    ctx.shadowColor = 'rgba(34,211,238,0.82)'
    ctx.beginPath()
    ctx.arc(Math.cos(angle) * sparkRadius, Math.sin(angle) * sparkRadius, Math.max(1.2, size * 0.018), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawCometForceField(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, charge: number) {
  const shield = getSpaceJetForceFieldSprite()
  if (shield.loaded) {
    const { source } = getCanvasSpriteDimensions(shield)
    const pulse = 0.98 + Math.sin(time / 620) * 0.02
    ctx.save()
    ctx.translate(x, y)
    // Sprite is horizontal; align its long axis with the logical flight axis.
    ctx.rotate(Math.PI / 2)
    ctx.globalAlpha *= 0.65 + clamp(charge, 0, 1) * 0.3
    ctx.drawImage(source, -size * pulse, -size * pulse * 0.5, size * pulse * 2, size * pulse)
    ctx.restore()
    return
  }
  const energy = clamp(charge, 0.35, 1)
  const pulse = 0.98 + Math.sin(time / 165) * 0.055
  const radiusX = size * (0.41 + energy * 0.045) * pulse
  const radiusY = size * (0.58 + energy * 0.05) * pulse
  const tail = size * (1.12 + energy * 0.34)
  const streakPhase = time / 82

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.sin(time / 260) * 0.018)
  ctx.globalCompositeOperation = 'lighter'

  const tailGradient = ctx.createLinearGradient(0, tail * 1.08, 0, -radiusY * 0.9)
  tailGradient.addColorStop(0, 'rgba(34,211,238,0)')
  tailGradient.addColorStop(0.2, 'rgba(34,211,238,0.12)')
  tailGradient.addColorStop(0.48, 'rgba(74,222,128,0.24)')
  tailGradient.addColorStop(0.72, 'rgba(250,204,21,0.14)')
  tailGradient.addColorStop(1, 'rgba(240,253,244,0.08)')
  ctx.fillStyle = tailGradient
  ctx.shadowBlur = 18
  ctx.shadowColor = 'rgba(45,212,191,0.55)'
  ctx.beginPath()
  ctx.moveTo(-radiusX * 0.5, -radiusY * 0.04)
  ctx.bezierCurveTo(-radiusX * 0.78, tail * 0.24, -radiusX * 0.28, tail * 0.94, 0, tail * 1.02)
  ctx.bezierCurveTo(radiusX * 0.28, tail * 0.94, radiusX * 0.78, tail * 0.24, radiusX * 0.5, -radiusY * 0.04)
  ctx.closePath()
  ctx.fill()

  const coreGradient = ctx.createLinearGradient(0, tail * 0.86, 0, -radiusY * 0.25)
  coreGradient.addColorStop(0, 'rgba(45,212,191,0)')
  coreGradient.addColorStop(0.34, 'rgba(134,239,172,0.24)')
  coreGradient.addColorStop(0.64, 'rgba(255,255,255,0.44)')
  coreGradient.addColorStop(1, 'rgba(103,232,249,0.12)')
  ctx.fillStyle = coreGradient
  ctx.shadowBlur = 12
  ctx.shadowColor = 'rgba(187,247,208,0.66)'
  ctx.beginPath()
  ctx.ellipse(0, tail * 0.32, radiusX * 0.22, tail * 0.54, 0, 0, Math.PI * 2)
  ctx.fill()

  const shell = ctx.createRadialGradient(0, -radiusY * 0.12, radiusX * 0.16, 0, 0, radiusY * 1.12)
  shell.addColorStop(0, 'rgba(255,255,255,0.2)')
  shell.addColorStop(0.38, 'rgba(103,232,249,0.2)')
  shell.addColorStop(0.7, 'rgba(74,222,128,0.24)')
  shell.addColorStop(1, 'rgba(21,128,61,0)')
  ctx.fillStyle = shell
  ctx.beginPath()
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.lineCap = 'round'
  for (let index = 0; index < 7; index += 1) {
    const offset = ((streakPhase + index * 0.17) % 1) * tail
    const xOffset = Math.sin(streakPhase * 1.4 + index * 1.85) * radiusX * (0.14 + (index % 3) * 0.06)
    const yOffset = tail * 0.9 - offset
    const alpha = 0.24 + (index % 2) * 0.16
    ctx.strokeStyle = index % 3 === 0 ? `rgba(255,255,255,${alpha})` : index % 2 === 0 ? `rgba(125,249,255,${alpha})` : `rgba(134,239,172,${alpha})`
    ctx.lineWidth = Math.max(1.15, size * (0.011 + index * 0.0009))
    ctx.beginPath()
    ctx.moveTo(xOffset, yOffset + tail * 0.16)
    ctx.bezierCurveTo(xOffset * 0.7, yOffset - tail * 0.02, xOffset * 0.24, yOffset - tail * 0.2, 0, yOffset - tail * 0.34)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(240,253,250,0.64)'
  ctx.lineWidth = Math.max(1.1, size * 0.014)
  ctx.shadowBlur = 8
  ctx.shadowColor = 'rgba(125,249,255,0.62)'
  ctx.beginPath()
  ctx.ellipse(0, 0, radiusX * 0.9, radiusY * 0.9, 0, Math.PI * 1.12, Math.PI * 1.88)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(250,204,21,0.22)'
  ctx.lineWidth = Math.max(0.9, size * 0.01)
  ctx.beginPath()
  ctx.ellipse(0, radiusY * 0.04, radiusX * 0.58, radiusY * 0.76, 0, Math.PI * 1.08, Math.PI * 1.92)
  ctx.stroke()

  ctx.restore()
}

export function drawSpiegelBurningMirage(
  ctx: CanvasRenderingContext2D,
  sprite: CanvasSpriteEntry,
  size: number,
  alpha: number,
  movement: number,
  afterimages: SpiegelAfterimage[],
  toX: (value: number) => number,
  toY: (value: number) => number,
  landscape = false,
) {
  const strength = clamp(alpha * Math.max(movement, afterimages[0]?.life ?? 0), 0, 1)
  if (strength <= 0.025) return

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const filter = 'brightness(1.08) contrast(1.16) saturate(1.08)'
  const maxGhosts = Math.min(afterimages.length, SPIEGEL_AFTERIMAGE_CAP)
  for (let index = maxGhosts - 1; index >= 0; index -= 1) {
    const afterimage = afterimages[index]
    const life = clamp(afterimage.life, 0, 1)
    const ghostAlpha = strength * life * (0.28 - index * 0.016)
    if (ghostAlpha <= 0.012) continue
    if (landscape) drawCanvasSpriteContain(ctx, sprite, toX(afterimage.x), toY(afterimage.y), size * (0.985 + life * 0.018), 'none', ghostAlpha, -Math.PI / 2, 1, PLAYER_COLOR, false)
    else drawCanvasSprite(ctx, sprite, toX(afterimage.x), toY(afterimage.y), size * (0.985 + life * 0.018), filter, ghostAlpha, 0, 1, PLAYER_COLOR, false)
  }
  ctx.restore()
}

const flightPoses = new Map<string, FlightPose>()

export function getRaidPlayerFlightBank(color: string, x: number) {
  const pose = flightPoses.get(color)
  return pose && performance.now() - pose.time <= 150 && Math.abs(x - pose.x) <= 12 ? pose.bank : 0
}

const solarHullRims = new WeakMap<CanvasSpriteEntry, [HTMLCanvasElement | undefined, HTMLCanvasElement | undefined]>()

function drawSolarHullRim(ctx: CanvasRenderingContext2D, sprite: CanvasSpriteEntry, x: number, y: number, size: number, side: number, alpha: number, landscape = false) {
  if (!sprite.loaded || typeof document === 'undefined') return
  const slot = side < 0 ? 0 : 1
  let rims = solarHullRims.get(sprite)
  if (!rims) {
    rims = [undefined, undefined]
    solarHullRims.set(sprite, rims)
  }
  let rim = rims[slot]
  if (!rim) {
    rim = document.createElement('canvas')
    const edge = 96
    rim.width = rim.height = edge
    const bake = rim.getContext('2d')
    if (!bake) return
    if (landscape) {
      const { source, width, height } = getCanvasSpriteDimensions(sprite)
      const fit = edge / Math.max(1, width, height)
      bake.save()
      bake.translate(edge / 2, edge / 2)
      bake.rotate(-Math.PI / 2)
      bake.drawImage(source, -width * fit / 2, -height * fit / 2, width * fit, height * fit)
      bake.restore()
    } else bake.drawImage(getCanvasSpriteSource(sprite), 0, 0, edge, edge)
    bake.globalCompositeOperation = 'source-in'
    const ramp = bake.createLinearGradient(slot === 0 ? 0 : edge, 12, slot === 0 ? edge : 0, 62)
    ramp.addColorStop(0, 'rgba(255,226,181,.7)')
    ramp.addColorStop(.39, 'rgba(255,197,133,.25)')
    ramp.addColorStop(.54, 'rgba(255,197,133,0)')
    bake.fillStyle = ramp
    bake.fillRect(0, 0, edge, edge)
    rims[slot] = rim
  }
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha *= alpha
  ctx.drawImage(rim, x - size / 2, y - size / 2, size, size)
  ctx.restore()
}

export function drawRaidPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  phase: GamePhase,
  toX: (value: number) => number,
  toY: (value: number) => number,
  viewportWidth: number,
  time: number,
  color = PLAYER_COLOR,
  cosmetics: Required<ShipCosmeticEquipState> = { trail: false, aura: false, frame: false },
  visualShipKey = player.ship.key,
  identityAuraColor: string | null = null,
  environmentRim: string | null = null,
  eclipse = 0,
  sunlight = 0,
  reducedMotion = false,
  landscape = false,
) {
  const x = toX(player.x)
  const y = toY(player.y)
  let pose = flightPoses.get(color)
  if (!pose) {
    if (flightPoses.size >= 8) flightPoses.delete(flightPoses.keys().next().value!)
    pose = { time, x: player.x, bank: 0 }
    flightPoses.set(color, pose)
  }
  const bank = updateFlightPose(pose, time, player.x)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(phase === 'playing' && player.hp > 0 && player.ship.key !== 'coreLander' ? bank : 0)
  ctx.translate(-x, -y)
  try {
  const size = getRaidPlayerHullSize(player.ship.key, viewportWidth, landscape, player.sizeScale)
  const isDown = phase === 'gameover' || player.hp <= 0
  const rotation = isDown ? 28 * DEG : 0
  const scale = isDown ? 0.88 : 1
  const alpha = isDown ? 0.3 : 1
  const engineBoost = clamp(player.engineBoost ?? 0, 0, 1.35)
  const coreLanderBurning = isCoreLanderBurning(player)
  const coreLanderCombatModel: CoreLanderCombatModel | null = player.ship.key === 'coreLander' && (visualShipKey === 'godGundam' || visualShipKey === 'spiegel') ? visualShipKey : null
  const eliteFrame = isRaidEliteFrameKey(visualShipKey)
  const sideVisualKey = coreLanderCombatModel ?? (player.ship.key === 'coreLander' ? getRaidShipFrameKey('coreLander', eliteFrame) : visualShipKey)
  const sideSprite = landscape ? getRaidSideShipCanvasSprite(sideVisualKey) : null
  const renderSize = coreLanderCombatModel ? size * 1.08 : size
  const cosmeticShipKey = coreLanderCombatModel ?? player.ship.key
  const remasteredHull = usesRaidRemasteredHullArt(visualShipKey)
  const nozzles = (landscape ? getRaidSideShipNozzles(sideVisualKey) : undefined) ?? getRaidShipNozzles(visualShipKey)
  const masteryPaintColor = cosmetics.frame && !remasteredHull ? getMasteryPaintColor(cosmeticShipKey, color) : color
  const coreLanderBurningBlend = player.ship.key === 'coreLander'
    ? clamp(player.burningBlend ?? (coreLanderBurning ? 1 : 0), 0, 1)
    : 0
  const coreLanderBurningRage = player.ship.key === 'coreLander' ? getCoreLanderBurningRage(player) : 0
  const crossfadeCoreLander = player.ship.key === 'coreLander' && !coreLanderCombatModel && coreLanderBurningBlend > .01
  const trailColor = cosmetics.trail ? color : undefined
  const sideBurningKey = coreLanderCombatModel === 'godGundam' ? 'godGundamBurning' : !coreLanderCombatModel ? getRaidShipFrameKey('coreLanderBurning', eliteFrame) : null
  const sideBurningSprite = landscape && player.ship.key === 'coreLander' && sideBurningKey && coreLanderBurningBlend > .01
    ? getRaidSideShipCanvasSprite(sideBurningKey) : null

  if (!isDown && !coreLanderCombatModel && !crossfadeCoreLander) {
    drawHullExhaust(ctx, x, y, renderSize, time, engineBoost, visualShipKey, undefined, trailColor, cosmeticShipKey, landscape && Boolean(sideSprite?.loaded))
  }
  const sunSide = Math.sign(sunlight)
  const maneuverJet = pose.maneuverJet ?? 0
  if (nozzles && player.ship.key !== 'coreLander' && !isDown && phase === 'playing' && !reducedMotion && Math.abs(maneuverJet) > .065) {
    const side = Math.sign(maneuverJet)
    const power = Math.abs(maneuverJet)
    const [ventX, ventY, aperture] = nozzles[side > 0 ? 0 : nozzles.length - 1]
    const jetSize = renderSize * (.24 + power * .12)
    ctx.save()
    ctx.translate(x + renderSize * (ventX - side * aperture * .33), y + renderSize * (ventY - aperture * .12))
    ctx.rotate(side * Math.PI / 3)
    ctx.globalAlpha *= Math.min(1, power * 1.5)
    drawPlayerEngine(ctx, 0, -jetSize * .34, jetSize, time, .25 + power * .65, renderSize * aperture * .45)
    ctx.restore()
  }
  if (!isDown && identityAuraColor) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    drawRadialEllipse(ctx, x, y, renderSize * 0.62, renderSize * 0.72, [
      [0, hexToRgba(identityAuraColor, 0.12)],
      [0.5, hexToRgba(identityAuraColor, 0.07)],
      [1, 'rgba(0,0,0,0)'],
    ])
    ctx.restore()
  }
  if (!isDown && cosmetics.aura) {
    if (sideSprite?.loaded) {
      const blend = sideBurningSprite?.loaded ? coreLanderBurningBlend : 0
      ctx.save()
      ctx.globalAlpha *= 1 - blend
      drawMasteryAura(ctx, x, y, renderSize, time, cosmeticShipKey, masteryPaintColor, sideVisualKey, true)
      ctx.restore()
      if (sideBurningSprite?.loaded && sideBurningKey && blend > 0) {
        ctx.save()
        ctx.globalAlpha *= blend
        drawMasteryAura(ctx, x, y, renderSize, time, cosmeticShipKey, masteryPaintColor, sideBurningKey, true)
        ctx.restore()
      }
    } else drawMasteryAura(ctx, x, y, renderSize, time, cosmeticShipKey, masteryPaintColor, nozzles ? visualShipKey : cosmeticShipKey)
  }
  if (!isDown && coreLanderBurningBlend > 0.04) {
    if (coreLanderCombatModel === 'spiegel') {
      if ((player.godMeleeCloak ?? 0) <= 0) {
        drawSpiegelBurningMirage(ctx, sideSprite?.loaded ? sideSprite : getShipCanvasSprite('spiegel'), renderSize, coreLanderBurningBlend, player.spiegelAfterimageStrength ?? 0, player.spiegelAfterimages ?? [], toX, toY, landscape && Boolean(sideSprite?.loaded))
      }
    } else {
      const pulse = 0.88 + Math.sin(time / 150) * 0.12
      if (sideSprite?.loaded) drawSideBurningWake(ctx, x, y, renderSize, time, coreLanderBurningBlend, sideBurningKey ?? sideVisualKey, cosmeticShipKey, engineBoost)
      else drawCoreLanderBurningCometWake(ctx, x, y, renderSize, time, coreLanderBurningBlend, Boolean(coreLanderCombatModel))
      const sideCombatHalo = Boolean(sideSprite?.loaded && coreLanderCombatModel)
      const haloX = sideCombatHalo ? x - renderSize * .12 : x
      const haloY = sideCombatHalo ? y + renderSize * .13 : coreLanderCombatModel ? y + renderSize * GOD_GUNDAM_BURNING_HALO_Y_OFFSET : y
      const haloSize = coreLanderCombatModel ? renderSize * GOD_GUNDAM_BURNING_HALO_SCALE : renderSize
      if (sideCombatHalo) {
        ctx.save()
        ctx.translate(haloX, haloY)
        ctx.scale(1, .72)
        drawCoreLanderBurningHalo(ctx, 0, 0, haloSize, time, coreLanderBurningBlend)
        ctx.restore()
      } else drawCoreLanderBurningHalo(ctx, haloX, haloY, haloSize, time, coreLanderBurningBlend)
      ctx.save()
      ctx.globalAlpha *= coreLanderBurningBlend
      drawRadialEllipse(ctx, x, y, renderSize * 0.54 * pulse, renderSize * 0.64 * pulse, [
        [0, 'rgba(254,240,138,0.22)'],
        [0.48, 'rgba(251,191,36,0.12)'],
        [1, 'rgba(251,146,60,0)'],
      ])
      ctx.restore()
    }
  }

  if (player.shield > 0) drawHoneycombShield(ctx, x, y, renderSize, time, clamp(player.shield / 8, 0, 1))
  else if (player.invuln > 0) drawInvulnerabilityShimmer(ctx, x, y, renderSize, time)

  if (player.forceField > 0) {
    const forceCharge = player.ship.key === 'spaceEt'
      ? clamp(player.forceField / SPACE_ET_PASSIVE_FORCE_FIELD_CHARGES, 0.42, 1)
      : clamp(player.forceField / FORCE_FIELD_ARMOR, 0, 1)
    if (player.ship.key === 'spaceEt') drawCometForceField(ctx, x, y, renderSize, time, forceCharge)
    else drawPlasmaForceField(ctx, x, y, renderSize, time, forceCharge)
  }

  const normalFilter = remasteredHull ? 'none' : cosmetics.frame
    ? getShipFrameSpriteFilter(cosmeticShipKey)
    : 'brightness(1.12) contrast(1.14) saturate(1.26)'
  const eclipseFilter = eclipse > .65 ? 'brightness(.76)' : eclipse > .29 ? 'brightness(.88)' : eclipse > .10 ? 'brightness(.95)' : ''
  const normalSpriteFilter = eclipseFilter ? (normalFilter === 'none' ? eclipseFilter : `${normalFilter} ${eclipseFilter}`) : normalFilter
  const burningSpriteFilter = eliteFrame ? 'none' : cosmetics.frame
    ? 'brightness(1.34) contrast(1.36) saturate(1.68)'
    : 'brightness(1.2) contrast(1.18) saturate(1.36)'
  const sprite = getShipCanvasSprite(visualShipKey)
  const spriteGlow = coreLanderBurning
    ? coreLanderCombatModel
      ? coreLanderCombatModel === 'spiegel'
        ? `rgba(${Math.round(226 - 74 * coreLanderBurningRage)},${Math.round(232 - 119 * coreLanderBurningRage)},${Math.round(240 - 127 * coreLanderBurningRage)},${(0.18 + coreLanderBurningRage * 0.1).toFixed(2)})`
        : `rgba(251,${Math.round(191 - 74 * coreLanderBurningRage)},${Math.round(36 - 20 * coreLanderBurningRage)},${(0.28 + coreLanderBurningRage * 0.16).toFixed(2)})`
      : 'rgba(251,191,36,0.28)'
    : player.forceField > 0
    ? player.ship.key === 'spaceEt' ? 'rgba(125,249,255,0.46)' : 'rgba(34,211,238,0.34)'
    : player.shield > 0 ? 'rgba(252,211,77,0.16)' : player.invuln > 0 ? 'rgba(226,232,240,0.1)' : null
  if (sunSide && eclipse < .86 && !isDown) {
    drawSpriteGlow(ctx, x + sunSide * renderSize * .18, y - renderSize * .13, renderSize * .71,
      'rgba(255,226,178,.27)', .62 * Math.abs(sunlight) * (1 - eclipse))
  }
  if (spriteGlow) drawSpriteGlow(ctx, x, y, renderSize, spriteGlow, 0.68)
  else if (!isDown) drawSpriteGlow(ctx, x, y, renderSize, environmentRim ?? hexToRgba(color, 0.09), 0.55)
  if (sideSprite?.loaded) {
    // The playfield turns clockwise; rotate the right-facing art into its
    // logical upward flight direction before the camera transform.
    const burningBlend = sideBurningSprite?.loaded ? coreLanderBurningBlend : 0
    if (burningBlend < .99) drawCanvasSpriteContain(ctx, sideSprite, x, y, renderSize, 'none', alpha * (1 - burningBlend), rotation - Math.PI / 2, scale, masteryPaintColor)
    if (sideBurningSprite?.loaded && burningBlend > 0) {
      drawCanvasSpriteContain(ctx, sideBurningSprite, x, y, renderSize, 'none', alpha * burningBlend, rotation - Math.PI / 2, scale, masteryPaintColor)
    }
    if (crossfadeCoreLander && !isDown) drawCrossfadeExhaust(ctx, x, y, renderSize, sideVisualKey, y, renderSize, sideBurningKey ?? 'coreLanderBurning', coreLanderBurningBlend, time, engineBoost, trailColor, cosmeticShipKey, true)
  } else if (crossfadeCoreLander) {
    const baseKey = getRaidShipFrameKey('coreLander', eliteFrame)
    const burningKey = getRaidShipFrameKey('coreLanderBurning', eliteFrame)
    const baseSprite = getShipCanvasSprite(baseKey)
    const burningSprite = getShipCanvasSprite(burningKey)
    const burningRenderSize = renderSize * (1 + .06 * coreLanderBurningBlend)
    if (!isDown) {
      drawCrossfadeExhaust(ctx, x, y, renderSize, baseKey, y, burningRenderSize, burningKey,
        coreLanderBurningBlend, time, engineBoost, trailColor, cosmeticShipKey)
    }
    if (coreLanderBurningBlend < 0.99) {
      drawCanvasSprite(
        ctx,
        baseSprite,
        x,
        y,
        renderSize,
        normalSpriteFilter,
        alpha * (1 - coreLanderBurningBlend),
        rotation,
        scale,
        masteryPaintColor,
      )
    }
    drawCanvasSprite(
      ctx,
      burningSprite,
      x,
      y,
      burningRenderSize,
      burningSpriteFilter,
      alpha * coreLanderBurningBlend,
      rotation,
      scale,
      masteryPaintColor,
    )
    return
  } else if (coreLanderCombatModel && coreLanderBurningBlend > 0.01) {
    const baseSprite = getShipCanvasSprite(coreLanderCombatModel)
    if (coreLanderCombatModel === 'spiegel') {
      for (const side of [-1, 1] as const) {
        drawCanvasSprite(
          ctx,
          baseSprite,
          x + side * renderSize * 0.52,
          y + renderSize * 0.04,
          renderSize * 0.9,
          normalSpriteFilter,
          alpha * coreLanderBurningBlend * 0.28,
          rotation + side * 0.04,
          scale,
          masteryPaintColor,
        )
      }
      drawCanvasSprite(
        ctx,
        baseSprite,
        x,
        y,
        renderSize,
        normalSpriteFilter,
        alpha,
        rotation,
        scale,
        masteryPaintColor,
      )
    } else {
      const usesBurningSprite = coreLanderCombatModel === 'godGundam'
      const burningSprite = getShipCanvasSprite(usesBurningSprite ? 'godGundamBurning' : coreLanderCombatModel)
      const burningRenderSize = usesBurningSprite ? renderSize * GOD_GUNDAM_BURNING_BODY_SCALE : renderSize
      const burningY = usesBurningSprite ? y + renderSize * GOD_GUNDAM_BURNING_BODY_Y_OFFSET : y
      if (coreLanderBurningBlend < 0.99) {
        drawCanvasSprite(
          ctx,
          baseSprite,
          x,
          y,
          renderSize,
          normalSpriteFilter,
          alpha * (1 - coreLanderBurningBlend),
          rotation,
          scale,
          masteryPaintColor,
        )
      }
      drawCanvasSprite(
        ctx,
        burningSprite,
        x,
        burningY,
        burningRenderSize,
        getGodGundamBurningSpriteFilter(coreLanderBurningBlend, coreLanderBurningRage),
        alpha * coreLanderBurningBlend,
        rotation,
        scale,
        masteryPaintColor,
      )
    }
  } else {
    drawCanvasSprite(
      ctx,
      sprite,
      x,
      y,
      renderSize,
      normalSpriteFilter,
      alpha,
      rotation,
      scale,
      masteryPaintColor,
    )
  }
  if (sunSide && nozzles && player.ship.key !== 'coreLander' && !isDown && eclipse < .86) {
    drawSolarHullRim(ctx, sideSprite?.loaded ? sideSprite : sprite, x, y, renderSize, sunSide, .56 * Math.abs(sunlight) * (1 - eclipse), Boolean(sideSprite?.loaded))
  }
  if (coreLanderCombatModel && !isDown) {
    ctx.save()
    ctx.globalAlpha *= .7
    if (landscape && sideSprite?.loaded) {
      if (coreLanderCombatModel === 'godGundam' && coreLanderBurningBlend > .01) {
        drawCrossfadeExhaust(ctx, x, y, renderSize, sideVisualKey, y, renderSize, 'godGundamBurning', coreLanderBurningBlend, time, engineBoost, trailColor, cosmeticShipKey, true)
      } else drawHullExhaust(ctx, x, y, renderSize, time, engineBoost, sideVisualKey, undefined, trailColor, cosmeticShipKey, true)
    } else if (coreLanderCombatModel === 'godGundam' && coreLanderBurningBlend > .01) {
      drawCrossfadeExhaust(ctx, x, y, renderSize, visualShipKey,
        y + renderSize * GOD_GUNDAM_BURNING_BODY_Y_OFFSET, renderSize * GOD_GUNDAM_BURNING_BODY_SCALE, 'godGundamBurning',
        coreLanderBurningBlend, time, engineBoost, trailColor, cosmeticShipKey)
    } else {
      drawHullExhaust(ctx, x, y, renderSize, time, engineBoost, visualShipKey, undefined, trailColor, cosmeticShipKey)
    }
    ctx.restore()
  }
  } finally { ctx.restore() }
}

export type MasteryVisualStyle = {
  core: string
  edge: string
  soft: string
  accent: string
  paint: string
  trailOffsets: number[]
  auraShape: 'comet' | 'blade' | 'diamond' | 'triangle' | 'cross' | 'stealth'
}

export const MASTERY_VISUAL_STYLES: Record<string, MasteryVisualStyle> = {
  rocket: {
    core: 'rgba(34,211,238,0.78)',
    edge: 'rgba(15,23,42,0.9)',
    soft: 'rgba(14,165,233,0.18)',
    accent: 'rgba(226,232,240,0.76)',
    paint: '#38bdf8',
    trailOffsets: [-0.14, 0.14],
    auraShape: 'comet',
  },
  fast: {
    core: 'rgba(255,255,255,0.9)',
    edge: 'rgba(239,35,60,0.76)',
    soft: 'rgba(244,63,94,0.2)',
    accent: 'rgba(226,232,240,0.84)',
    paint: '#ffffff',
    trailOffsets: [-0.12, 0, 0.12],
    auraShape: 'blade',
  },
  gatling: {
    core: 'rgba(251,146,60,0.82)',
    edge: 'rgba(239,35,60,0.7)',
    soft: 'rgba(251,146,60,0.2)',
    accent: 'rgba(254,215,170,0.76)',
    paint: '#fb923c',
    trailOffsets: [-0.19, -0.06, 0.06, 0.19],
    auraShape: 'cross',
  },
  laser: {
    core: 'rgba(34,211,238,0.86)',
    edge: 'rgba(248,250,252,0.78)',
    soft: 'rgba(34,211,238,0.18)',
    accent: 'rgba(165,243,252,0.82)',
    paint: '#67e8f9',
    trailOffsets: [-0.08, 0.08],
    auraShape: 'diamond',
  },
  dreadnought: {
    core: 'rgba(168,85,247,0.72)',
    edge: 'rgba(30,41,59,0.92)',
    soft: 'rgba(88,28,135,0.24)',
    accent: 'rgba(216,180,254,0.7)',
    paint: '#a855f7',
    trailOffsets: [-0.27, -0.09, 0.09, 0.27],
    auraShape: 'triangle',
  },
  xwing: {
    core: 'rgba(250,204,21,0.78)',
    edge: 'rgba(248,250,252,0.86)',
    soft: 'rgba(250,204,21,0.16)',
    accent: 'rgba(239,68,68,0.66)',
    paint: '#fde047',
    trailOffsets: [-0.28, -0.12, 0.12, 0.28],
    auraShape: 'cross',
  },
  spaceEt: {
    core: 'rgba(248,250,252,0.9)',
    edge: 'rgba(56,189,248,0.7)',
    soft: 'rgba(148,163,184,0.16)',
    accent: 'rgba(15,23,42,0.86)',
    paint: '#f8fafc',
    trailOffsets: [0],
    auraShape: 'stealth',
  },
  mesiah: {
    core: 'rgba(226,232,240,0.86)',
    edge: 'rgba(20,184,166,0.62)',
    soft: 'rgba(15,23,42,0.22)',
    accent: 'rgba(255,255,255,0.86)',
    paint: '#e2e8f0',
    trailOffsets: [-0.2, 0, 0.2],
    auraShape: 'diamond',
  },
  coreLander: {
    core: 'rgba(251,146,60,0.86)',
    edge: 'rgba(239,68,68,0.66)',
    soft: 'rgba(251,146,60,0.18)',
    accent: 'rgba(255,237,213,0.9)',
    paint: '#fb923c',
    trailOffsets: [-0.12, 0.12],
    auraShape: 'diamond',
  },
  godGundam: {
    core: 'rgba(251,191,36,0.92)',
    edge: 'rgba(217,119,6,0.78)',
    soft: 'rgba(245,158,11,0.28)',
    accent: 'rgba(254,240,138,0.94)',
    paint: '#f59e0b',
    trailOffsets: [-0.08, 0.08],
    auraShape: 'cross',
  },
  spiegel: {
    core: 'rgba(248,250,252,0.88)',
    edge: 'rgba(239,68,68,0.74)',
    soft: 'rgba(15,23,42,0.24)',
    accent: 'rgba(250,204,21,0.84)',
    paint: '#ef4444',
    trailOffsets: [-0.08, 0.08],
    auraShape: 'stealth',
  },
}

export function getMasteryVisualStyle(shipKey: string, color: string): MasteryVisualStyle {
  return MASTERY_VISUAL_STYLES[shipKey] ?? {
    core: color === ALLY_PLAYER_COLOR ? 'rgba(34,211,238,0.76)' : 'rgba(248,113,113,0.72)',
    edge: color === ALLY_PLAYER_COLOR ? 'rgba(165,243,252,0.72)' : 'rgba(252,165,165,0.72)',
    soft: color === ALLY_PLAYER_COLOR ? 'rgba(34,211,238,0.16)' : 'rgba(248,113,113,0.16)',
    accent: 'rgba(255,255,255,0.76)',
    paint: color,
    trailOffsets: [-0.16, 0, 0.16],
    auraShape: 'comet',
  }
}

export function getMasteryPaintColor(shipKey: string, fallbackColor: string) {
  return MASTERY_VISUAL_STYLES[shipKey]?.paint ?? fallbackColor
}

export function getShipFrameSpriteFilter(shipKey: string) {
  if (shipKey === 'godGundam') return 'brightness(1.18) contrast(1.34) saturate(2.45) sepia(0.46) hue-rotate(350deg)'
  if (shipKey === 'spiegel') return 'brightness(1.2) contrast(1.34) saturate(1.9) sepia(0.24) hue-rotate(342deg)'
  return 'brightness(1.28) contrast(1.42) saturate(2.25)'
}

export function getGodGundamBurningSpriteFilter(blend: number, rage: number) {
  const blendStep = Math.round(clamp(blend, 0, 1) * 8) / 8
  const rageStep = Math.round(clamp(rage, 0, 1) * 4) / 4
  const heat = blendStep * (0.35 + rageStep * 0.65)
  return `brightness(${(1.22 + heat * 0.44).toFixed(2)}) contrast(${(1.16 + heat * 0.2).toFixed(2)}) saturate(${(1.36 + heat * 1.22).toFixed(2)}) sepia(${(blendStep * (0.68 + rageStep * 0.24)).toFixed(2)}) hue-rotate(${(352 - rageStep * 18).toFixed(1)}deg)`
}

function drawHullExhaust(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number,
  boost: number, visualKey: string, wakeScale?: number, trailColor?: string, cosmeticKey = visualKey, landscape = false) {
  const nozzles = (landscape ? getRaidSideShipNozzles(visualKey) : undefined) ?? getRaidShipNozzles(visualKey)
  if (!nozzles) {
    if (trailColor) drawSingleMasteryEngineTrail(ctx, x, y, size, time, trailColor, cosmeticKey, boost)
    else drawPlayerEngine(ctx, x, y + size * .02, size * (wakeScale ?? 1), time, boost)
    return
  }
  const wakeSize = size * (wakeScale ?? getRaidExhaustScale(visualKey, nozzles.length))
  for (const [offsetX, offsetY, aperture] of nozzles) {
    const wakeX = x + size * offsetX
    const wakeY = y + size * offsetY - wakeSize * .34
    if (trailColor) drawSingleMasteryEngineTrail(ctx, wakeX, wakeY, wakeSize, time, trailColor, cosmeticKey, boost, size * aperture)
    else drawPlayerEngine(ctx, wakeX, wakeY, wakeSize, time, boost, size * aperture)
  }
}

function drawCrossfadeExhaust(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, visualKey: string,
  burningY: number, burningSize: number, burningKey: string, blend: number, time: number, boost: number,
  trailColor: string | undefined, cosmeticKey: string, landscape = false) {
  if (blend < .99) {
    ctx.save()
    ctx.globalAlpha *= 1 - blend
    drawHullExhaust(ctx, x, y, size, time, boost, visualKey, undefined, trailColor, cosmeticKey, landscape)
    ctx.restore()
  }
  ctx.save()
  ctx.globalAlpha *= blend
  drawHullExhaust(ctx, x, burningY, burningSize, time, boost, burningKey, undefined, trailColor, cosmeticKey, landscape)
  ctx.restore()
}

const masteryWakeSprites = new WeakMap<MasteryVisualStyle, HTMLCanvasElement>()
const MASTERY_WAKE_X = 44
const MASTERY_WAKE_Y = 18
const MASTERY_WAKE_LENGTH = 72
const MASTERY_WAKE_WIDTH = 16

function bakeMasteryWake(style: MasteryVisualStyle, exhaust: NonNullable<ReturnType<typeof getRaidCombatFrame>>) {
  const wake = document.createElement('canvas')
  wake.width = 88
  wake.height = 116
  const wakeCtx = wake.getContext('2d')
  if (!wakeCtx) return null
  paintMasteryWake(wakeCtx, style, MASTERY_WAKE_X, MASTERY_WAKE_Y, MASTERY_WAKE_LENGTH, MASTERY_WAKE_WIDTH, 100)

  // Color the authored plume with the ship's signature palette before merging
  // it with the original bloom and hot core. Each nozzle draws one bitmap.
  const texture = document.createElement('canvas')
  texture.width = wake.width
  texture.height = wake.height
  const textureCtx = texture.getContext('2d')
  if (!textureCtx) return wake
  const plumeWidth = 70
  const plumeLength = 123
  if (!drawRaidCombatTexture(textureCtx, exhaust,
    MASTERY_WAKE_X + plumeWidth * (.5 - EXHAUST_ORIGIN_X),
    MASTERY_WAKE_Y + plumeLength * (.5 - EXHAUST_ORIGIN_Y),
    plumeLength, plumeWidth, -Math.PI / 2, false)) return wake
  const tint = textureCtx.createLinearGradient(0, MASTERY_WAKE_Y, 0, MASTERY_WAKE_Y + MASTERY_WAKE_LENGTH)
  tint.addColorStop(0, style.accent)
  tint.addColorStop(.25, style.core)
  tint.addColorStop(.63, style.paint)
  tint.addColorStop(1, 'rgba(0,0,0,0)')
  textureCtx.globalCompositeOperation = 'source-in'
  textureCtx.fillStyle = tint
  textureCtx.fillRect(0, 0, texture.width, texture.height)
  wakeCtx.globalCompositeOperation = 'lighter'
  wakeCtx.globalAlpha = .74
  wakeCtx.drawImage(texture, 0, 0)
  return wake
}

export function drawSingleMasteryEngineTrail(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, color: string, shipKey: string, engineBoost = 0, nozzleWidth?: number) {
  const style = getMasteryVisualStyle(shipKey, color)
  const pulse = .96 + Math.sin(time / 180) * .05
  const tailScale = shipKey === 'spaceEt' ? 1.18 : shipKey === 'dreadnought' ? .92 : shipKey === 'mesiah' ? 1.05 : 1
  const top = y + size * .34
  const length = size * .72 * tailScale * pulse * (1 + clamp(engineBoost, 0, 1.35) * .36)
  const width = nozzleWidth === undefined ? size * (shipKey === 'dreadnought' ? .15 : .13) : nozzleWidth / 1.16

  if (nozzleWidth !== undefined && typeof document !== 'undefined') {
    let wake = masteryWakeSprites.get(style)
    if (!wake) {
      const exhaust = getRaidCombatFrame(COMBAT_TILE.exhaust)
      wake = exhaust ? bakeMasteryWake(style, exhaust) ?? undefined : undefined
      if (wake) masteryWakeSprites.set(style, wake)
    }
    if (wake) {
      const scaleX = width / MASTERY_WAKE_WIDTH
      const scaleY = length / MASTERY_WAKE_LENGTH
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(wake, x - MASTERY_WAKE_X * scaleX, top - MASTERY_WAKE_Y * scaleY, wake.width * scaleX, wake.height * scaleY)
      ctx.restore()
      return
    }
  }
  paintMasteryWake(ctx, style, x, top, length, width, size)
}

function paintMasteryWake(ctx: CanvasRenderingContext2D, style: MasteryVisualStyle, x: number, top: number, length: number, width: number, size: number) {
  const tip = top + length

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  const outer = ctx.createLinearGradient(x, top, x, tip)
  outer.addColorStop(0, style.accent)
  outer.addColorStop(0.2, style.core)
  outer.addColorStop(0.58, style.edge)
  outer.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = outer
  ctx.shadowBlur = Math.max(10, size * 0.16)
  ctx.shadowColor = style.soft
  ctx.beginPath()
  ctx.moveTo(x - width * 0.58, top)
  ctx.bezierCurveTo(x - width * 0.54, top + length * 0.24, x - width * 0.16, top + length * 0.74, x, tip)
  ctx.bezierCurveTo(x + width * 0.16, top + length * 0.74, x + width * 0.54, top + length * 0.24, x + width * 0.58, top)
  ctx.closePath()
  ctx.fill()

  const inner = ctx.createLinearGradient(x, top, x, top + length * 0.68)
  inner.addColorStop(0, 'rgba(255,255,255,0.86)')
  inner.addColorStop(0.36, style.accent)
  inner.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = inner
  ctx.shadowBlur = Math.max(5, size * 0.07)
  ctx.beginPath()
  ctx.moveTo(x - width * 0.23, top + size * 0.01)
  ctx.bezierCurveTo(x - width * 0.2, top + length * 0.2, x - width * 0.05, top + length * 0.48, x, top + length * 0.66)
  ctx.bezierCurveTo(x + width * 0.05, top + length * 0.48, x + width * 0.2, top + length * 0.2, x + width * 0.23, top + size * 0.01)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const sideAuraSprites = new WeakMap<CanvasSpriteEntry, HTMLCanvasElement>()
const SIDE_AURA_SIZE = 320
const SIDE_AURA_EDGE = 512

function getSideAuraSprite(sprite: CanvasSpriteEntry) {
  const cached = sideAuraSprites.get(sprite)
  if (cached) return cached
  if (!sprite.loaded || typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIDE_AURA_EDGE
  const bake = canvas.getContext('2d')
  if (!bake) return null
  bake.globalCompositeOperation = 'lighter'
  drawCanvasSpriteContain(bake, sprite, 256, 256, SIDE_AURA_SIZE * 1.18, 'blur(22.4px) brightness(1.55) saturate(1.75)', .24, -Math.PI / 2, 1, PLAYER_COLOR, false)
  drawCanvasSpriteContain(bake, sprite, 256, 256, SIDE_AURA_SIZE * 1.08, 'blur(10.24px) brightness(1.55) saturate(1.8)', .28, -Math.PI / 2, 1, PLAYER_COLOR, false)
  sideAuraSprites.set(sprite, canvas)
  return canvas
}

export function warmRaidSideCosmetics(visualShipKey: string, aura = true) {
  const sprite = getRaidSideShipCanvasSprite(visualShipKey)
  if (sprite && aura) void sprite.ready.then(() => { getSideAuraSprite(sprite) })
}

function drawSideBurningWake(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, alpha: number, visualShipKey: string, cosmeticShipKey: string, boost: number) {
  const nozzles = getRaidSideShipNozzles(visualShipKey)
  if (!nozzles) return
  const lengthScale = size * .9
  ctx.save()
  ctx.globalAlpha *= alpha * .42
  for (const [offsetX, offsetY, aperture] of nozzles) {
    // The logical +Y wake becomes leftward flight exhaust after camera rotation.
    drawSingleMasteryEngineTrail(ctx, x + size * offsetX, y + size * offsetY - lengthScale * .34, lengthScale, time, '#fbbf24', cosmeticShipKey, boost, size * Math.max(aperture, .035))
  }
  ctx.restore()
}

export function drawMasteryAura(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, shipKey: string, color: string, visualShipKey = shipKey, landscape = false) {
  const style = getMasteryVisualStyle(shipKey, color)
  const pulse = 0.95 + Math.sin(time / 260) * 0.12
  if (landscape) {
    const sprite = getRaidSideShipCanvasSprite(visualShipKey)
    const aura = sprite && getSideAuraSprite(sprite)
    if (aura) {
      const scale = size / SIDE_AURA_SIZE
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha *= pulse
      ctx.drawImage(aura, x - aura.width * scale / 2, y - aura.height * scale / 2, aura.width * scale, aura.height * scale)
      ctx.restore()
    }
    return
  }
  const sprite = getShipCanvasSprite(visualShipKey)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  drawCanvasSprite(ctx, sprite, x, y, size * 1.18, `blur(${Math.max(5.5, size * 0.07)}px) brightness(1.55) saturate(1.75)`, 0.24 * pulse, 0, 1, style.paint)
  drawCanvasSprite(ctx, sprite, x, y, size * 1.08, `blur(${Math.max(2.2, size * 0.032)}px) brightness(1.55) saturate(1.8)`, 0.28 * pulse, 0, 1, style.paint)
  ctx.restore()
}

export function traceRegularPolygon(ctx: CanvasRenderingContext2D, sides: number, radius: number, rotation = -Math.PI / 2) {
  ctx.beginPath()
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (index / sides) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

export function drawPowerPickupIcon(ctx: CanvasRenderingContext2D, type: PowerKind, size: number, color: string, phase = 0) {
  const r = size * 0.19
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(1.5, size * 0.045)
  ctx.globalAlpha = 0.62

  if (type === 'laser') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.85
    const beam = ctx.createLinearGradient(0, -r * 1.08, 0, r * 1.08)
    beam.addColorStop(0, 'rgba(34,211,238,0)')
    beam.addColorStop(0.18, 'rgba(34,211,238,0.7)')
    beam.addColorStop(0.5, 'rgba(255,255,255,0.95)')
    beam.addColorStop(0.82, 'rgba(34,211,238,0.7)')
    beam.addColorStop(1, 'rgba(34,211,238,0)')
    ctx.strokeStyle = 'rgba(34,211,238,0.38)'
    ctx.lineWidth = Math.max(2.6, size * 0.08)
    ctx.beginPath()
    ctx.moveTo(0, -r * 1.0)
    ctx.lineTo(0, r * 1.0)
    ctx.stroke()
    ctx.strokeStyle = beam
    ctx.lineWidth = Math.max(1.4, size * 0.045)
    ctx.beginPath()
    ctx.moveTo(0, -r * 1.08)
    ctx.lineTo(0, r * 1.08)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(236,254,255,0.9)'
    ctx.lineWidth = Math.max(0.8, size * 0.024)
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.82)
    ctx.lineTo(0, r * 0.82)
    ctx.stroke()
    for (const side of [-1, 1]) {
      ctx.strokeStyle = 'rgba(125,249,255,0.6)'
      ctx.lineWidth = Math.max(0.8, size * 0.022)
      ctx.beginPath()
      ctx.moveTo(side * r * 0.42, -r * 0.62)
      ctx.quadraticCurveTo(side * r * 0.72, 0, side * r * 0.42, r * 0.62)
      ctx.stroke()
    }
    ctx.restore()
  } else if (type === 'spread') {
    ctx.beginPath()
    ctx.moveTo(0, r * 0.85)
    ctx.lineTo(-r, -r * 0.9)
    ctx.moveTo(0, r * 0.85)
    ctx.lineTo(0, -r * 1.1)
    ctx.moveTo(0, r * 0.85)
    ctx.lineTo(r, -r * 0.9)
    ctx.stroke()
  } else if (type === 'scatter') {
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * r * 0.35, Math.sin(angle) * r * 0.35)
      ctx.lineTo(Math.cos(angle) * r * 1.05, Math.sin(angle) * r * 1.05)
      ctx.stroke()
    }
  } else if (type === 'rocket') {
    ctx.beginPath()
    ctx.moveTo(0, -r * 1.15)
    ctx.lineTo(r * 0.72, r * 0.45)
    ctx.lineTo(r * 0.24, r * 0.9)
    ctx.lineTo(0, r * 0.62)
    ctx.lineTo(-r * 0.24, r * 0.9)
    ctx.lineTo(-r * 0.72, r * 0.45)
    ctx.closePath()
    ctx.stroke()
  } else if (type === 'homing') {
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.9, -0.25, Math.PI * 1.55)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(r * 0.55, -r * 0.95)
    ctx.lineTo(r * 1.08, -r * 1)
    ctx.lineTo(r * 0.86, -r * 0.5)
    ctx.stroke()
  } else if (type === 'option') {
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(side * r * 0.62, 0, r * 0.34, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(-r * 0.24, 0)
    ctx.lineTo(r * 0.24, 0)
    ctx.stroke()
  } else if (type === 'shield') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(252,211,77,0.08)'
    ctx.strokeStyle = 'rgba(252,211,77,0.96)'
    ctx.lineWidth = Math.max(1.3, size * 0.038)
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.16, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.lineWidth = Math.max(1, size * 0.026)
    const cells: Array<[number, number, number]> = [
      [0, 0, 0.52],
      [-r * 0.46, -r * 0.28, 0.42],
      [r * 0.46, -r * 0.28, 0.42],
      [-r * 0.46, r * 0.28, 0.42],
      [r * 0.46, r * 0.28, 0.42],
      [0, -r * 0.58, 0.36],
      [0, r * 0.58, 0.36],
    ]
    for (const [hx, hy, scale] of cells) {
      ctx.save()
      ctx.translate(hx, hy)
      traceRegularPolygon(ctx, 6, r * scale, Math.PI / 6)
      ctx.stroke()
      ctx.restore()
    }
    ctx.restore()
  } else if (type === 'forcefield') {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineWidth = Math.max(1.2, size * 0.033)
    ctx.shadowBlur = 10
    ctx.shadowColor = 'rgba(34,211,238,0.72)'
    ctx.strokeStyle = 'rgba(165,243,252,0.92)'
    tracePlasmaLoop(ctx, r * 1.08, phase * 1.35, r * 0.12, 52)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(244,114,182,0.62)'
    ctx.lineWidth = Math.max(1, size * 0.023)
    tracePlasmaLoop(ctx, r * 0.72, -phase * 1.7, r * 0.08, 44)
    ctx.stroke()
    for (let index = 0; index < 3; index += 1) {
      const angle = phase + index * Math.PI * 0.72
      ctx.beginPath()
      ctx.arc(0, 0, r * (0.82 + index * 0.08), angle, angle + Math.PI * 0.22)
      ctx.stroke()
    }
    ctx.restore()
  } else if (type === 'repair') {
    ctx.beginPath()
    ctx.moveTo(-r, 0)
    ctx.lineTo(r, 0)
    ctx.moveTo(0, -r)
    ctx.lineTo(0, r)
    ctx.stroke()
  } else if (type === 'levelup') {
    ctx.beginPath()
    ctx.moveTo(0, -r * 1.15)
    ctx.lineTo(r * 0.82, -r * 0.18)
    ctx.lineTo(r * 0.32, -r * 0.18)
    ctx.lineTo(r * 0.32, r * 0.86)
    ctx.lineTo(-r * 0.32, r * 0.86)
    ctx.lineTo(-r * 0.32, -r * 0.18)
    ctx.lineTo(-r * 0.82, -r * 0.18)
    ctx.closePath()
    ctx.stroke()
  }

  ctx.restore()
}
