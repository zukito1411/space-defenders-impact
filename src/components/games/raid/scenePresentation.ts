import { AdaptiveScore, SampleScene, warmImmersionAudio } from '../presentationAudio'
import type { ImmersionClip } from '../presentationAssets'
import { getGameSoundEnabled } from '../sound'
import { COMBAT_TILE, drawRaidCombatTexture, getRaidCombatFrame } from './combatArt'
import { cosmicRegionIndex } from './cosmos'
import { raidStereoPan } from './flightEffects'
import { clearPlayerConditions, recordPlayerFeedback, validPlayerFeedback } from './playerCondition'
import type { DestructionPresentationEvent, Enemy, GamePhase, Player, PlayerFeedbackKind, RaidRandomEventKind, Vec } from './types'

type SceneState = {
  phase: GamePhase; stage: number; carrier: boolean; stageClear: boolean; player: Player; ally: Player | null
  enemies: readonly Enemy[]; hostileShots: number; event?: RaidRandomEventKind; landscape: boolean; elite: boolean
  bgm: HTMLAudioElement | null; track: string
}
type Burst = DestructionPresentationEvent & { at: number }

/** Audio and cosmetic timelines share authoritative events, never combat decisions. */
export class RaidScenePresentation {
  private sounds = new SampleScene()
  private score = new AdaptiveScore()
  private sequence = 0
  private received = 0
  private stream: DestructionPresentationEvent[] = []
  private bursts: Burst[] = []
  private defeated = new Set<number>()
  private feedback = new Set<number>()
  private nextAmbience = 0
  private nextFault = 0
  private pressure = 0
  private clock = 0
  private previous = 0
  private landscape = false
  private lastPhase: GamePhase = 'select'

  warm() { void warmImmersionAudio() }

  playerEvent(player: Player, kind: PlayerFeedbackKind, contact?: Vec) {
    recordPlayerFeedback(player, kind, contact)
    this.observePlayer(player)
  }

  observePlayer(player: Player) {
    const event = player.feedback
    if (!validPlayerFeedback(event) || this.feedback.has(event.serial)) return
    this.feedback.add(event.serial)
    if (this.feedback.size > 64) this.feedback.delete(this.feedback.values().next().value!)
    this.sounds.play(event.kind, event.kind === 'repair' ? .3 : event.kind.endsWith('break') ? .58 : .36,
      raidStereoPan(player.x, player.y, this.landscape), 'impact', 3)
  }

  defeat(enemy: Pick<Enemy, 'id' | 'x' | 'y' | 'radius' | 'isBoss' | 'isMiniBoss'>) {
    if (this.defeated.has(enemy.id)) return
    this.defeated.add(enemy.id)
    if (this.defeated.size > 512) this.defeated.delete(this.defeated.values().next().value!)
    const event: DestructionPresentationEvent = { serial: ++this.sequence, x: enemy.x, y: enemy.y,
      radius: Math.max(1, Math.min(20, enemy.radius)), tier: enemy.isBoss ? 'capital' : enemy.isMiniBoss || enemy.radius >= 4 ? 'armored' : 'fighter', seed: enemy.id % 997 }
    this.stream.push(event)
    if (this.stream.length > 12) this.stream.shift()
    this.ingest([event])
  }

  snapshot() { return this.stream.slice() }

  ingest(events: readonly DestructionPresentationEvent[]) {
    for (const event of events.slice(-12)) {
      if (!event || !Number.isSafeInteger(event.serial) || event.serial <= this.received || !Number.isFinite(event.seed) || !Number.isFinite(event.x) || !Number.isFinite(event.y)
        || !Number.isFinite(event.radius) || !['fighter', 'armored', 'capital'].includes(event.tier)) continue
      this.received = event.serial
      this.bursts.push({ ...event, radius: Math.max(1, Math.min(20, event.radius)), at: this.clock })
      if (this.bursts.length > 24) this.bursts.shift()
      this.sounds.play(`${event.tier}-death`, event.tier === 'capital' ? .62 : event.tier === 'armored' ? .42 : .26,
        raidStereoPan(event.x, event.y, this.landscape), 'explosion', event.tier === 'capital' ? 4 : 2, 0, event.tier === 'fighter' ? 110 : 180)
    }
  }

  update(state: SceneState) {
    this.landscape = state.landscape
    const paused = state.phase === 'paused' || document.hidden || !getGameSoundEnabled()
    if (paused) { this.sounds.stop(); this.score.update(null, '', 0, false); return }
    if (state.phase === 'select' && this.lastPhase !== 'select') {
      this.bursts.length = 0; this.stream.length = 0; this.defeated.clear(); this.feedback.clear(); this.pressure = 0
      this.sequence = 0; this.received = 0
      this.sounds.stop()
    }
    this.lastPhase = state.phase
    const active = state.phase === 'playing' && !state.carrier
    const alive = state.enemies.filter(enemy => enemy.hp > 0)
    const boss = alive.find(enemy => enemy.isBoss)
    const target = state.stageClear || !active ? 0 : boss ? .65 + (1 - boss.hp / Math.max(1, boss.maxHp)) * .35
      : Math.min(1, alive.length / 22 + state.hostileShots / 100)
    this.pressure += (target - this.pressure) * (target > this.pressure ? .24 : .14)
    this.score.update(state.bgm, state.track, this.pressure, active && !state.stageClear)
    if (!active) { this.sounds.stop(); return }
    const now = performance.now()
    const engine = (pilot: Player | null, slot: string, gain: number) => {
      const clip = pilot ? `engine-${pilot.ship.key}` as ImmersionClip : null
      const boost = Math.min(1, Math.max(0, (pilot?.engineBoost ?? 0) / 1.35))
      const critical = pilot && pilot.hp <= pilot.maxHp * .35
      const sputter = critical ? .76 + .24 * Math.sin(now / 85) ** 2 : 1
      this.sounds.loop(slot, pilot && pilot.hp > 0 ? clip : null,
        gain * (.38 + boost * .62) * sputter, .82 + boost * .28,
        pilot ? raidStereoPan(pilot.x, pilot.y, state.landscape) * .28 : 0, 'player')
      if (pilot) this.observePlayer(pilot)
    }
    engine(state.player, 'engine', .29)
    engine(state.ally, 'ally-engine', .14)
    const boost = Math.min(1, Math.max(0, state.player.engineBoost / 1.35))
    this.sounds.loop('elite-harmonic', state.elite && state.player.hp > 0 ? `engine-${state.player.ship.key}` as ImmersionClip : null,
      .034 * (.4 + boost * .6), 1.34 + boost * .18, 0, 'player')
    const region = cosmicRegionIndex(state.stage)
    const sector = state.event === 'ion' ? 'ion' : state.event === 'wreck' ? 'wreck'
      : state.stage === 5 || state.stage === 9101 ? 'ocean' : state.stage === 10 || state.stage === 9102 ? 'volcanic'
        : (['stellar', 'asteroid', 'wreck', 'ion'] as const)[region]
    this.sounds.loop('sector', `sector-${sector}`, (boss ? .055 : .105) * (state.stageClear ? .45 : 1), 1, 0, 'bgm')
    if (!boss && !state.stageClear && now >= this.nextAmbience) {
      this.nextAmbience = now + 17000 + region * 3100
      this.sounds.play(region >= 2 ? 'radio-fragment' : 'hull-tick', .09, Math.sin(now / 4000) * .6, 'bgm', 0, 0, 15000)
    }
    if (state.player.hp > 0 && state.player.hp <= state.player.maxHp * .35 && now >= this.nextFault) {
      this.nextFault = now + 2700
      this.sounds.play('hull-tick', .13, 0, 'impact', 1, 0, 2400)
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number, phase: GamePhase, toX: (n: number) => number,
    toY: (n: number) => number, width: number, reduced: boolean, low: boolean) {
    const delta = this.previous ? Math.max(0, Math.min(50, time - this.previous)) : 0
    this.previous = time
    if (phase !== 'paused' && !document.hidden) this.clock += delta
    const fragment = getRaidCombatFrame(COMBAT_TILE.fragment)
    const fire = getRaidCombatFrame(COMBAT_TILE.fireImpact)
    ctx.save()
    let write = 0
    for (const burst of this.bursts) {
      const seconds = (this.clock - burst.at) / 1000
      const lifetime = burst.tier === 'capital' ? 2.1 : burst.tier === 'armored' ? 1.2 : .62
      if (seconds > lifetime) continue
      this.bursts[write++] = burst
      const progress = seconds / lifetime
      const x = toX(burst.x), y = toY(burst.y)
      const size = Math.max(12, Math.min(100, burst.radius * width / 100))
      if (fire && burst.tier !== 'capital') {
        const count = burst.tier === 'armored' && !low && !reduced ? 2 : 1
        for (let i = 0; i < count; i++) {
          const age = seconds - i * .17
          if (age < 0 || age > .45) continue
          drawRaidCombatTexture(ctx, fire, x + (i ? size * .24 : 0), y + (i ? size * .17 : 0),
            size * (1.1 + age * 2), size * (1 + age * 2), burst.seed * .19, true, (1 - age / .45) * .7)
        }
      }
      if (fragment && !reduced) for (let i = 0; i < (low ? 2 : burst.tier === 'capital' ? 6 : 3); i++) {
        const angle = i * 2.399 + burst.seed * .31
        const drift = size * seconds * (1.1 + i * .17)
        drawRaidCombatTexture(ctx, fragment, x + Math.cos(angle) * drift, y + Math.sin(angle) * drift + seconds * size * .3,
          size * .22, size * .15, angle + seconds * (i % 2 ? -2 : 2), false, (1 - progress) * .85)
      }
      if (burst.tier === 'capital' && seconds >= .55 && !reduced) {
        const shock = (seconds - .55) / 1.5
        ctx.strokeStyle = `rgba(253,186,116,${Math.max(0, 1 - shock) * .28})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.ellipse(x, y, size * (1 + shock * 3), size * (.35 + shock * 1.3), 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    this.bursts.length = write
    ctx.restore()
  }

  stop() {
    this.sounds.stop(); this.score.stop(); this.bursts.length = 0; this.stream.length = 0
    this.defeated.clear(); this.feedback.clear(); this.sequence = 0; this.received = 0
    this.clock = 0; this.previous = 0; this.lastPhase = 'select'; clearPlayerConditions()
  }
}
