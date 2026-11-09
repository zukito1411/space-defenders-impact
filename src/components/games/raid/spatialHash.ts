/**
 * Reusable 2D broad-phase for Raid projectile contacts. Gameplay entities
 * keep their original ownership, update frequency and collision shapes.
 * We only narrow down candidate pairs before exact hit tests.
 */
const GRID_ORIGIN = -40
const GRID_CELL_SIZE = 10
const GRID_COLUMNS = 18
const GRID_TOTAL = GRID_COLUMNS * GRID_COLUMNS

export type RaidSpatialObject = { id: number; x: number; y: number }

export type RaidSpatialHash<T extends RaidSpatialObject> = {
  readonly cells: T[][]
  readonly touchedCells: number[]
  readonly candidates: T[]
  readonly seen: Set<number>
}

function cellCoordinate(value: number) {
  return Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor((value - GRID_ORIGIN) / GRID_CELL_SIZE)))
}

export function createRaidSpatialHash<T extends RaidSpatialObject>(): RaidSpatialHash<T> {
  return {
    cells: Array.from({ length: GRID_TOTAL }, () => [] as T[]),
    touchedCells: [],
    candidates: [],
    seen: new Set<number>(),
  }
}

export function clearRaidSpatialHash<T extends RaidSpatialObject>(hash: RaidSpatialHash<T>) {
  for (const index of hash.touchedCells) hash.cells[index].length = 0
  hash.touchedCells.length = 0
  hash.candidates.length = 0
  hash.seen.clear()
}

export function insertRaidSpatialHash<T extends RaidSpatialObject>(
  hash: RaidSpatialHash<T>, object: T, halfWidth: number, halfHeight = halfWidth,
) {
  const left = cellCoordinate(object.x - halfWidth)
  const right = cellCoordinate(object.x + halfWidth)
  const top = cellCoordinate(object.y - halfHeight)
  const bottom = cellCoordinate(object.y + halfHeight)
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const index = y * GRID_COLUMNS + x
      const cell = hash.cells[index]
      if (cell.length === 0) hash.touchedCells.push(index)
      cell.push(object)
    }
  }
}

export function queryRaidSpatialHash<T extends RaidSpatialObject>(
  hash: RaidSpatialHash<T>, x: number, y: number, halfWidth: number, halfHeight = halfWidth,
): readonly T[] {
  const output = hash.candidates
  const seen = hash.seen
  output.length = 0
  seen.clear()
  const left = cellCoordinate(x - halfWidth)
  const right = cellCoordinate(x + halfWidth)
  const top = cellCoordinate(y - halfHeight)
  const bottom = cellCoordinate(y + halfHeight)
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      for (const candidate of hash.cells[row * GRID_COLUMNS + col]) {
        if (seen.has(candidate.id)) continue
        seen.add(candidate.id)
        output.push(candidate)
      }
    }
  }
  return output
}
