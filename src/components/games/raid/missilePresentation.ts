export function missileLaunchScale(kind: string) {
  return kind === 'rocket' ? 0.82 : kind === 'homing' ? 0.9 : 1
}
export function homingCruiseSpeed(vx: number, vy: number) {
  return Math.min(66, Math.max(52, Math.hypot(vx, vy)))
}
