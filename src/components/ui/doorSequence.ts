export type DoorPhase = 'idle' | 'closing' | 'closed' | 'opening'
export type DoorAction = () => void | Promise<unknown>

/** One close/reveal cycle batches related menu actions behind the closed door. */
export class DoorSequence {
  busy = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private generation = 0
  private phase: DoorPhase = 'idle'
  private actions: DoorAction[] = []
  constructor(private change: (phase: DoorPhase) => void) {}

  run(action: DoorAction, reduced = false) {
    if (this.busy) {
      if (this.phase === 'closing') { this.actions.push(action); return true }
      if (this.phase === 'closed') { void action(); return true }
      return false
    }
    this.busy = true
    this.actions = [action]
    const generation = ++this.generation
    this.phase = 'closing'
    this.change(this.phase)
    this.timer = setTimeout(async () => {
      if (generation !== this.generation) return
      this.phase = 'closed'
      this.change(this.phase)
      try {
        for (const action of this.actions) {
          if (generation !== this.generation) return
          await action()
        }
      }
      catch (error) { console.error('Screen transition failed:', error) }
      if (generation !== this.generation) return
      this.timer = setTimeout(() => {
        this.phase = 'opening'
        this.change(this.phase)
        this.timer = setTimeout(() => {
          this.busy = false
          this.actions = []
          this.phase = 'idle'
          this.change(this.phase)
        }, reduced ? 70 : 320)
      }, reduced ? 30 : 70)
    }, reduced ? 50 : 280)
    return true
  }

  cancel() {
    this.generation++
    clearTimeout(this.timer)
    this.busy = false
    this.actions = []
    this.phase = 'idle'
  }
}
