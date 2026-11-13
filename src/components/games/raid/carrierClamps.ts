export type DockMount = {
  x: number; y: number; hull: number; floor: number; ceiling: number; mech: boolean
}

const ease = (n: number) => {
  const t = Math.max(0, Math.min(1, n))
  return t * t * (3 - 2 * t)
}

/** Carrier artwork coordinates keep the equipment attached to the bay during departure. */
export function sampleDockClamps(dock: DockMount, release: number) {
  const r = ease(release)
  return [-1, 1].flatMap(side => [-1, 1].map(level => {
    const bx = dock.x + side * dock.hull * .66
    const by = level < 0 ? dock.ceiling + 30 : dock.floor - 30
    const contactX = dock.x + side * dock.hull * (dock.mech ? .23 : .25)
    const contactY = dock.y + dock.hull * (dock.mech ? (level < 0 ? -.02 : .16) : level < 0 ? -.035 : .14)
    const tx = contactX + (bx - side * dock.hull * .10 - contactX) * r
    const ty = contactY + (by - level * dock.hull * .04 - contactY) * r
    const dx = tx - bx, dy = ty - by, d = Math.max(.001, Math.hypot(dx, dy))
    // Two rigid links fold around their pins, rather than shrinking or fading away.
    const length = Math.max(Math.hypot(contactX - bx, contactY - by) * .60, dock.hull * .20)
    const h = Math.sqrt(Math.max(0, length * length - d * d / 4))
    const ex = (bx + tx) / 2 - side * level * dy / d * h
    const ey = (by + ty) / 2 + side * level * dx / d * h
    return { bx, by, ex, ey, tx, ty, side, level, length }
  }))
}

type Part = { image: HTMLCanvasElement; width: number; height: number; ox: number; oy: number }
type Paint = (ctx: CanvasRenderingContext2D) => void
let hardware: ReturnType<typeof buildHardware> | undefined

function polygon(ctx: CanvasRenderingContext2D, points: number[][], fill: string | CanvasGradient, edge = '#101e28') {
  ctx.beginPath()
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill()
  ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.stroke()
}

function metal(ctx: CanvasRenderingContext2D, y: number, height: number, light = '#738b95') {
  const g = ctx.createLinearGradient(0, y, 0, y + height)
  g.addColorStop(0, light); g.addColorStop(.18, '#405763')
  g.addColorStop(.53, '#293c48'); g.addColorStop(1, '#14232e')
  return g
}

function bolt(ctx: CanvasRenderingContext2D, x: number, y: number, r = 2.3) {
  polygon(ctx, Array.from({ length: 6 }, (_, i) => [x + Math.cos(i * Math.PI / 3) * r, y + Math.sin(i * Math.PI / 3) * r]), '#74868b')
  ctx.fillStyle = '#22333c'; ctx.fillRect(x - r * .5, y - .4, r, .8)
}

function pin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#0c1821'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = metal(ctx, y - r, r * 2); ctx.beginPath(); ctx.arc(x, y, r - 1.8, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#91a0a2'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = '#172a35'; ctx.beginPath(); ctx.arc(x, y, r * .55, 0, Math.PI * 2); ctx.fill()
  bolt(ctx, x, y, r * .27)
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.fillStyle = '#121f29'; ctx.fillRect(x + Math.cos(a) * r * .7 - .7, y + Math.sin(a) * r * .7 - .7, 1.4, 1.4)
  }
}

/** Bake detailed metalwork once in memory. No external image, fetch, or loading state. */
function part(width: number, height: number, ox: number, oy: number, paint: Paint): Part {
  const image = document.createElement('canvas')
  image.width = width * 2; image.height = height * 2
  const ctx = image.getContext('2d')!
  ctx.scale(2, 2); ctx.translate(ox, oy); paint(ctx)
  return { image, width, height, ox, oy }
}

function buildHardware() {
  const mount = part(112, 62, 56, 28, ctx => {
    ctx.fillStyle = '#07121bb0'; ctx.fillRect(-51, 18, 102, 13)
    polygon(ctx, [[-50, 15], [-41, 8], [41, 8], [50, 15], [50, 29], [-50, 29]], metal(ctx, 8, 21))
    ctx.fillStyle = '#859494'; ctx.fillRect(-47, 15, 94, 1)
    ctx.fillStyle = '#a77c35'; ctx.fillRect(-46, 22, 92, 5)
    ctx.save(); ctx.beginPath(); ctx.rect(-46, 22, 92, 5); ctx.clip()
    for (let x = -53; x < 51; x += 12) polygon(ctx, [[x, 22], [x + 5, 22], [x + 10, 27], [x + 5, 27]], '#24313a', '#24313a')
    ctx.restore()
    polygon(ctx, [[-27, 15], [-23, -15], [-14, -22], [14, -22], [23, -15], [27, 15]], metal(ctx, -22, 37))
    polygon(ctx, [[-26, 14], [-24, -6], [-35, 14]], '#233844')
    polygon(ctx, [[26, 14], [24, -6], [35, 14]], '#52656b')
    for (const x of [-42, 42]) for (const y of [12, 24]) bolt(ctx, x, y)
    pin(ctx, 0, 0, 17)
    ctx.fillStyle = '#12202a'; ctx.fillRect(-15, -20, 30, 4)
    ctx.fillStyle = '#84d5de'; ctx.fillRect(-9, -19, 18, 1.6)
  })
  const link = (lower: boolean) => part(204, 78, 22, 39, ctx => {
    // Recessed service hose and polished actuator alongside the load-bearing spar.
    ctx.strokeStyle = '#0a141c'; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(8, 13); ctx.bezierCurveTo(48, 30, 112, 30, 153, 12); ctx.stroke()
    ctx.strokeStyle = '#52616a'; ctx.lineWidth = 1.2; ctx.stroke()
    polygon(ctx, [[0, -13], [13, -17], [143, -13], [160, -7], [160, 8], [144, 13], [13, 17], [0, 12]], metal(ctx, -17, 34, lower ? '#7b898a' : '#7a8f97'))
    polygon(ctx, [[19, -10], [132, -8], [143, -3], [136, 5], [19, 7]], '#182c38', '#536a75')
    ctx.fillStyle = '#71868c'; ctx.fillRect(22, -12, 102, 1)
    ctx.fillStyle = '#0e1d28'; ctx.fillRect(27, -5, 96, 7)
    const chrome = ctx.createLinearGradient(0, -6, 0, 3)
    chrome.addColorStop(0, '#3a505e'); chrome.addColorStop(.32, '#c1cdca'); chrome.addColorStop(.55, '#7b9298'); chrome.addColorStop(1, '#233945')
    ctx.fillStyle = chrome; ctx.fillRect(69, -5, 69, 6)
    polygon(ctx, [[20, -9], [70, -9], [75, -5], [75, 5], [20, 5]], metal(ctx, -9, 14))
    for (const x of [24, 63, 70]) { ctx.fillStyle = '#94a5a5'; ctx.fillRect(x, -8, 2, 12) }
    for (const x of [87, 94, 101, 108, 115]) { ctx.fillStyle = '#0e202c'; ctx.fillRect(x, 7, 3, 3) }
    ctx.fillStyle = '#ac873e'; ctx.fillRect(30, -15, 24, 3)
    ctx.fillStyle = '#23333c'; for (const x of [33, 42, 51]) ctx.fillRect(x, -15, 3, 3)
    for (const x of [15, 142]) for (const y of [-8, 8]) bolt(ctx, x, y, 1.8)
    ctx.fillStyle = '#a8b4b0'; ctx.fillRect(77, 11, 14, 1); ctx.fillRect(77, 13, 9, .7)
    pin(ctx, 0, 0, 13); pin(ctx, 160, 0, 11)
  })
  const jaw = part(64, 58, 47, 29, ctx => {
    // The open throat faces the hull; dark pads meet the actual contact point.
    polygon(ctx, [[-35, -15], [-27, -22], [-7, -22], [2, -15], [2, -10], [-14, -10], [-14, 10], [2, 10], [2, 15], [-7, 22], [-27, 22], [-35, 15]], metal(ctx, -22, 44))
    polygon(ctx, [[-32, -12], [-26, -16], [-20, -16], [-20, 16], [-26, 16], [-32, 12]], '#304955', '#8c9d9e')
    ctx.fillStyle = '#b7954c'; ctx.fillRect(-12, -20, 10, 4); ctx.fillRect(-12, 16, 10, 4)
    ctx.fillStyle = '#0b1720'; ctx.fillRect(-4, -15, 7, 6); ctx.fillRect(-4, 9, 7, 6)
    ctx.fillStyle = '#839592'; ctx.fillRect(1, -14, 1, 4); ctx.fillRect(1, 10, 1, 4)
    pin(ctx, -28, 0, 7)
    for (const y of [-16, 16]) bolt(ctx, -25, y, 1.8)
    ctx.fillStyle = '#0a1d28'; ctx.fillRect(-19, -4, 9, 8)
    ctx.fillStyle = '#89d4d6'; ctx.fillRect(-17, -2, 5, 2)
  })
  return { mount, upper: link(false), lower: link(true), jaw }
}

function drawPart(ctx: CanvasRenderingContext2D, p: Part, x: number, y: number, angle: number, scale: number, flip = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale * flip)
  ctx.drawImage(p.image, -p.ox, -p.oy, p.width, p.height); ctx.restore()
}

export function drawDockClamps(ctx: CanvasRenderingContext2D, dock: DockMount, release: number) {
  const parts = hardware ??= buildHardware()
  for (const a of sampleDockClamps(dock, release)) {
    drawPart(ctx, parts.mount, a.bx, a.by, 0, .8, a.level < 0 ? -1 : 1)
    drawPart(ctx, parts.upper, a.bx, a.by, Math.atan2(a.ey - a.by, a.ex - a.bx), a.length / 160)
    drawPart(ctx, parts.lower, a.ex, a.ey, Math.atan2(a.ty - a.ey, a.tx - a.ex), a.length / 160)
    // Jaw's contact pads remain vertical while the elbow rotates behind them.
    const size = Math.max(.48, Math.min(.9, dock.hull / 470))
    // The painted wrist pin is 28 units behind the pads.
    const wristX = a.tx + a.side * 28 * size
    ctx.save(); ctx.translate(a.tx, a.ty); ctx.scale(-a.side * size, size)
    ctx.strokeStyle = '#101f29'; ctx.lineWidth = 10
    ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(0, 0); ctx.stroke()
    ctx.restore()
    // A short wrist connector joins the arm endpoint to the jaw's hinge.
    ctx.save(); ctx.strokeStyle = '#49616b'; ctx.lineWidth = 5 * size
    ctx.beginPath(); ctx.moveTo(a.tx, a.ty); ctx.lineTo(wristX, a.ty); ctx.stroke(); ctx.restore()
    ctx.save(); ctx.translate(a.tx, a.ty); ctx.scale(-a.side * size, size)
    ctx.drawImage(parts.jaw.image, -parts.jaw.ox, -parts.jaw.oy, parts.jaw.width, parts.jaw.height)
    ctx.restore()
  }
}
