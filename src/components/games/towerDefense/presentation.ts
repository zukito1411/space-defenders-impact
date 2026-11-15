import { AdaptiveScore, SampleScene, warmImmersionAudio } from '../presentationAudio'

type Synergy = { id: number; active: boolean }

export class DefensePresentation {
  private sounds = new SampleScene()
  private score = new AdaptiveScore()
  private synergies = new Map<number, boolean>()
  private nextAlarm = 0
  private pressure = 0

  warm() { void warmImmersionAudio() }
  deploy(col: number) { this.sounds.play('deploy', .4, col / 7 - 1, 'ui', 2, 0, 120) }
  destroy(boss: boolean, heavy: boolean, col: number) {
    this.sounds.play(boss ? 'capital-death' : heavy ? 'armored-death' : 'fighter-death', boss ? .56 : .24,
      col / 7 - 1, 'explosion', boss ? 4 : 2, 0, boss ? 250 : 110)
  }

  update(active: boolean, inWave: boolean, threat: number, hullRatio: number,
    synergies: readonly Synergy[], music: HTMLAudioElement | null) {
    if (!active || document.hidden) { this.sounds.stop(); this.score.update(null, '', 0, false); return [] }
    this.sounds.loop('station', 'sector-station', inWave ? .065 : .09, 1, 0, 'bgm')
    this.pressure += ((inWave ? Math.min(1, threat + (1 - hullRatio) * .35) : 0) - this.pressure) * .2
    this.score.update(music, music?.getAttribute('src') ?? '', this.pressure, inWave)
    const now = performance.now()
    if (inWave && (threat > .73 || hullRatio < .3) && now > this.nextAlarm) {
      this.nextAlarm = now + (hullRatio < .3 ? 3800 : 6500)
      this.sounds.play('hq-warning', hullRatio < .3 ? .34 : .25, .6, 'ui', 3, 0, 3000)
    }
    const linked: number[] = []
    for (const synergy of synergies) {
      if (synergy.active && !this.synergies.get(synergy.id)) linked.push(synergy.id)
      this.synergies.set(synergy.id, synergy.active)
    }
    if (linked.length) this.sounds.play('synergy', .3, 0, 'ui', 2, 0, 800)
    const ids = new Set(synergies.map(synergy => synergy.id))
    for (const id of this.synergies.keys()) if (!ids.has(id)) this.synergies.delete(id)
    return linked
  }

  stop() { this.sounds.stop(); this.score.stop(); this.synergies.clear() }
}
