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

// Boot and wheel positions in the two carrier-bay images, before cover cropping.
export const CARRIER_DECK_LAYOUTS = {
  landscape: {
    patrols: [
      [705, 875, 229, 19], [1040, 1260, 229, 18], // Upper catwalk
      [227, 382, 795, 18], [940, 1055, 795, 17], // Separate catwalks below the flight deck
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
      [104, 234, 445, 22], [793, 924, 445, 22], // Upper landings
      [103, 236, 798, 21], [783, 919, 798, 21], // Lower landings
    ],
    marshal: [600, 655, 1028],
    services: {
      cart: [370, 1090], welder: [406, 1090],
      bot: [575, 1115], cargo: [613, 1115], inspector: [647, 1115],
      tug: [390, 535, 1160],
    },
  },
} as const satisfies Record<'landscape' | 'portrait', DeckLayout>

export const LANDSCAPE_BOARDING_FLOOR_Y = 627
export const PORTRAIT_BOARDING_WALK_START_X = 352
