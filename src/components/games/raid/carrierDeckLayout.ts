type Point = readonly [x: number, y: number]
type Route = readonly [startX: number, endX: number, y: number]
type Patrol = readonly [...Route, height: number]

type DeckLayout = {
  patrols: readonly Patrol[]
  marshal: Route
  services: {
    cart: Point
    welder: Point
    bot: Point
    cargo: Point
    inspector: Point
    tug: Route
  }
}

// Source image coordinates, before cover cropping. Patrol feet sit at the
// base of the railing where it meets the deck surface.
export const CARRIER_DECK_LAYOUTS = {
  landscape: {
    patrols: [
      [710, 870, 236, 24], [1040, 1260, 236, 23], // Upper catwalk
      [227, 382, 803, 23], [998, 1055, 803, 22], // Separate catwalks below the flight deck
    ],
    marshal: [1080, 1145, 617],
    services: {
      cart: [706, 629], welder: [742, 629],
      bot: [1165, 629], cargo: [1203, 629], inspector: [1235, 629],
      tug: [425, 648, 630],
    },
  },
  portrait: {
    patrols: [
      [104, 234, 455, 27], [793, 924, 455, 27], // Upper landings
      [103, 234, 812, 26], [785, 919, 812, 26], // Lower landings
    ],
    marshal: [600, 652, 1028],
    services: {
      cart: [370, 1090], welder: [406, 1090],
      bot: [575, 1115], cargo: [613, 1115], inspector: [647, 1115],
      tug: [390, 535, 1160],
    },
  },
} as const satisfies Record<'landscape' | 'portrait', DeckLayout>

export const LANDSCAPE_BOARDING_FLOOR_Y = 627
export const PORTRAIT_BOARDING_WALK_START_X = 352
