// The temple Ezekiel saw in vision (Ezekiel 40–48). All world units are cubits, and the cubit is
// Ezekiel's long one, "a cubit and an hand breadth" (40:5; 43:13). Axes as for the other sites:
// +x = east, -z = north, +z = south, +y = up.
//
// Ezekiel measures more than any other passage about a sanctuary. The plan follows the usual
// reading of chapters 40–42, in which the measurements along the east–west line add up to the
// 500 cubits of the wall (42:15-20): outer gate 50, outer court 100, inner gate 50, inner court 100,
// the house 100, the separate place and the building behind it 100. The altar stands at the centre.
// Heights are given only for the wall, the steps, the foundation of the house and the altar; the
// rest are chosen, and each info panel says so.

/** Floor heights. Each step is half a cubit (not given). */
export const Y = {
  ground: 0,
  /** The outer court: seven steps up into its gates (40:22, 26). */
  outer: 3.5,
  /** The inner court: eight steps up into its gates (40:31, 34, 37). */
  inner: 7.5,
  /** The house stands on a foundation "a full reed of six great cubits" (41:8). */
  house: 13.5,
};

/** The wall round about: 500 cubits square, a reed thick and a reed high (40:5; 42:20; 45:2). */
export const WALL = { half: 250, t: 6, top: Y.outer + 6 };

/**
 * A gate, 50 long and 25 broad (40:15, 21). Along it: a threshold of one reed, three little chambers a
 * reed square on each side with 5 cubits between them, a second threshold, then the porch of 8 with
 * posts of 2 (40:6-10). The entry is 10 broad and the gate 13 (40:11), with a border a cubit wide
 * before the chambers (40:12).
 */
export const GATE = {
  len: 50,
  half: 12.5,
  passage: 6.5, // half of 13
  entry: 5, // half of 10
  porch: 10, // half the porch's breadth within (not given)
  mouth: 7, // half the opening between the posts (not given)
  height: 18, // not given
  stepsHalf: 7,
};
/** Along a gate, from the end you enter by: [start, end] of each part. Outer gates are entered from outside the wall; inner gates from the outer court. */
export const GATE_PARTS = {
  outer: { threshold1: [0, 6], chambers: [6, 34], threshold2: [34, 40], porch: [40, 48], posts: [48, 50] },
  /** The inner gates are the same turned about: their porches face the outer court (40:31). */
  inner: { posts: [0, 2], porch: [2, 10], threshold1: [10, 16], chambers: [16, 44], threshold2: [44, 50] },
} as const;
/** The three little chambers on each side, from the start of the chambers' run. */
export const CHAMBERS_U = [
  [0, 6],
  [11, 17],
  [22, 28],
] as const;

export type Side = 'east' | 'north' | 'south';
export type GateKind = 'outer' | 'inner';
export interface GateDef {
  id: string;
  kind: GateKind;
  side: Side;
  /** Distance from the centre to the end you enter by. */
  at: number;
  floor: number;
  /** Steps up to it: their number, the height at their foot, and the run. */
  steps: { n: number; from: number; run: number };
}

const outerSteps = { n: 7, from: Y.ground, run: 7 };
const innerSteps = { n: 8, from: Y.outer, run: 8 };
export const GATES: GateDef[] = [
  { id: 'outerEast', kind: 'outer', side: 'east', at: WALL.half, floor: Y.outer, steps: outerSteps },
  { id: 'outerNorth', kind: 'outer', side: 'north', at: WALL.half, floor: Y.outer, steps: outerSteps },
  { id: 'outerSouth', kind: 'outer', side: 'south', at: WALL.half, floor: Y.outer, steps: outerSteps },
  { id: 'innerEast', kind: 'inner', side: 'east', at: 100, floor: Y.inner, steps: innerSteps },
  { id: 'innerNorth', kind: 'inner', side: 'north', at: 100, floor: Y.inner, steps: innerSteps },
  { id: 'innerSouth', kind: 'inner', side: 'south', at: 100, floor: Y.inner, steps: innerSteps },
];

/** Rotation about y that turns a gate's local frame (u inward along +x, v across along +z) to face its side. */
export const SIDE_ROT: Record<Side, number> = { east: Math.PI, north: -Math.PI / 2, south: Math.PI / 2 };

/** World position of the point (u along, v across) in a gate. */
export function gateToWorld(g: GateDef, u: number, v: number): [number, number] {
  const d = g.at - u;
  if (g.side === 'east') return [d, -v];
  if (g.side === 'north') return [-v, -d];
  return [v, d];
}
/** Local (u, v) of a world point in a gate's frame. */
export function worldToGate(g: GateDef, x: number, z: number): [number, number] {
  if (g.side === 'east') return [g.at - x, -z];
  if (g.side === 'north') return [g.at + z, -x];
  return [g.at - z, x];
}
/** An axis-aligned rectangle in a gate's frame as a world rectangle [minX, minZ, maxX, maxZ]. */
export function gateRect(g: GateDef, u0: number, u1: number, v0: number, v1: number): [number, number, number, number] {
  const [ax, az] = gateToWorld(g, u0, v0);
  const [bx, bz] = gateToWorld(g, u1, v1);
  return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)];
}

/** The outer court's "lower pavement", as broad as the gates are long (40:17-18). */
export const PAVEMENT = WALL.half - GATE.len; // its inner edge, from the centre

/** Thirty chambers upon the pavement (40:17): five each side of the gates on the north, east and south. Size not given. */
export const OUTER_CHAMBER = { depth: 15, height: 12, spans: [22, 58, 94, 130, 166].map((a): [number, number] => [a, a + 30]) };

/** In every corner of the outer court a court 40 long and 30 broad, with boiling places (46:21-23). */
export const KITCHEN = { long: 40, broad: 30, wall: 1, height: 8 };

/** The inner court, 100 cubits foursquare (40:47), with the altar at its centre. */
export const INNER = { half: 50, wall: 2, height: 6 };

/**
 * The raised ground the inner court shares with the house and the separate place around it, at the
 * height of the inner court (Ezekiel speaks of the house's foundation, not of this; it is chosen so the
 * house's courts lie level).
 */
export const TERRACE = { minX: -170, maxX: INNER.half, half: INNER.half };

/**
 * The house (40:48-41:11). East to west: the porch's front 5 (its posts), the porch 11 (40:49), the
 * wall 6 (41:1), the temple 40 (41:2), the post of the door 2 (41:3), the most holy place 20 (41:4),
 * the wall 6, the side chambers 4 and their outer wall 5 (41:5, 9). The inner rooms are 20 broad.
 */
export const HOUSE = {
  front: -50,
  porchIn: -55,
  porchBack: -66,
  holyX: -72, // the temple's east wall, inner face
  partition: -112, // the post of the door (41:3)
  holiestX: -114,
  holiestBack: -134,
  wallBack: -140,
  chamberBack: -144,
  back: -149,
  inner: 10, // half the 20 cubits within (41:2, 4)
  porchHalf: 15, // the porch's posts, 5 a side of its 20 (40:48)
  wall: 16, // the house's wall, 6 (41:5)
  chamber: 20, // side chambers 4 broad (41:5)
  outer: 25, // their outer wall 5 (41:9)
  platform: 30, // "the place that was left", 5 round about (41:11)
  porchDoor: 7, // the porch's gate 14 broad, 3 cubits on each side of it (40:48; 14 from the Greek)
  door: 5, // the temple's door 10 broad (41:2)
  holiestDoor: 3, // the inner door 6 (41:3)
  holyHeight: 30, // not given
  holiestHeight: 20, // not given; a cube, like the oracle of Solomon's house
  roof: 33, // not given
  chamberRoof: 21, // three storeys (41:6); heights not given
};
/** The steps up to the porch (40:49; ten in the Greek). */
export const STEPS = { x0: HOUSE.front, x1: HOUSE.front + 10, half: HOUSE.porchDoor, n: 10 };
/** Pillars by the posts, one on this side and another on that side (40:49). Size not given. */
export const PILLARS: [number, number][] = [
  [-46, -11.8],
  [-46, 11.8],
];
export const PILLAR = { r: 1.2, height: 18 };

/**
 * The separate place, 20 cubits round the house (41:10, 13), and the building before it at the west,
 * 70 by 90 within walls 5 thick (41:12): taken as 70 east to west and 90 north to south, so that the
 * separate place and the building together are 100 (41:13-14).
 */
export const SEPARATE = { minX: TERRACE.minX, maxX: HOUSE.front, half: INNER.half };
export const BUILDING = { minX: -250, maxX: TERRACE.minX, half: 50, wall: 5, height: 24 };

/**
 * The priests' holy chambers north and south of the separate place (42:1-14): a row 100 long toward
 * the house and one 50 long toward the outer court, in three storeys, with a walk 10 broad between
 * them and a wall 50 long before the shorter row.
 */
export const PRIESTS = {
  minX: HOUSE.back - 1,
  maxX: HOUSE.front,
  innerRow: [52, 70] as const,
  walk: [70, 80] as const,
  outerRow: [80, 98] as const,
  outerMinX: -100,
  storey: 6,
};
/** The places westward where the priests boil the offerings (46:19-20). */
export const PRIESTS_KITCHEN = { minX: TERRACE.minX, maxX: PRIESTS.minX, z0: 52, z1: 76, height: 7 };

/** Chambers in the inner court beside the north and south gates, for the priests (40:44-46). Size not given. */
export const SINGERS = { minX: 18, maxX: 44, depth: 10, height: 9 };

/**
 * The altar (43:13-17): a base a cubit high with a border of a span round its edge; up 2 cubits to
 * the lower settle and 4 more to the greater, each a cubit in; then the hearth 4 high and 12 square,
 * with four horns. Its stairs face east.
 */
export const ALTAR = {
  base: 9, // half of 18
  lower: 8, // half of 16
  upper: 7, // half of 14 (43:17)
  hearth: 6, // half of 12 (43:16)
  tops: [1, 3, 7, 11] as const,
  horn: 1,
};
export const ALTAR_STAIRS = { x0: ALTAR.upper, x1: 22, half: 2 };

/** Eight tables for slaying, and four of hewn stone, at the inner north gate (40:39-42). Sizes of the eight not given. */
export const TABLE = { long: 3, broad: 1.6, height: 2 };
export const STONE_TABLE = { side: 1.5, height: 1 };

/** The wooden altar, the table before the LORD: 3 high and 2 long (41:22). */
export const WOOD_ALTAR = { x: -106, half: 1, height: 3 };

/**
 * The water from under the threshold, south of the altar, out by the right side of the outer east
 * gate (47:1-2), then down the mountain eastward. A trickle in the courts (the Hebrew is "trickling").
 */
export const RIVER_PATH: [number, number][] = [
  [-49.6, 8.7],
  [-43, 8.8],
  [-34, 12.5],
  [-10, 14],
  [12, 13.5],
  [26, 9],
  [40, 4],
  [WALL.half + 8, 4],
];

/** Where you begin: inside the outer east gate, looking west to the inner court (40:6, 19). */
export const START = { x: 186, z: 0, yaw: Math.PI / 2 };

/** The walkable ground: the enclosure, and a strip round it outside the wall. */
export const BOUNDS = { minX: -300, maxX: 300, minZ: -300, maxZ: 300 };

const inRect = (x: number, z: number, x0: number, x1: number, z0: number, z1: number) => x > x0 && x < x1 && z > z0 && z < z1;

/** The gate (if any) whose building or steps contain (x, z), with local coordinates. */
export function gateAt(x: number, z: number, withSteps = true): { g: GateDef; u: number; v: number } | null {
  for (const g of GATES) {
    const [u, v] = worldToGate(g, x, z);
    if (u >= (withSteps ? -g.steps.run : 0) && u <= GATE.len && Math.abs(v) <= GATE.half) return { g, u, v };
  }
  return null;
}

export function kitchenAt(x: number, z: number) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  const W = WALL.half - WALL.t;
  return ax > W - KITCHEN.long && ax < W && az > W - KITCHEN.broad && az < W;
}

export function regionOf(x: number, z: number): string {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  const gate = gateAt(x, z, false);
  if (gate) {
    if (gate.g.id === 'outerEast') return 'eastgate';
    if (gate.g.id === 'innerEast') return 'sabbath';
    return gate.g.kind === 'outer' ? 'gate' : 'igate';
  }
  if (ax > WALL.half || az > WALL.half) return 'outside';
  const H = HOUSE;
  if (inRect(x, z, H.holiestBack, H.holiestX, -H.inner, H.inner)) return 'holiest';
  if (inRect(x, z, H.partition, H.porchBack, -H.inner, H.inner)) return 'holy';
  if (inRect(x, z, H.porchBack, H.front, -H.porchHalf, H.porchHalf)) return 'porch';
  if (inRect(x, z, -INNER.half, INNER.half + INNER.wall, -INNER.half, INNER.half)) return 'inner';
  if (inRect(x, z, TERRACE.minX, HOUSE.front, -TERRACE.half, TERRACE.half)) return 'separate';
  if (kitchenAt(x, z)) return 'kitchen';
  if (inRect(x, az, PRIESTS_KITCHEN.minX - 4, PRIESTS.maxX, PRIESTS.innerRow[0], PRIESTS.outerRow[1] + 4)) return 'priests';
  return 'outer';
}

export const REGION_LABEL: Record<string, string> = {
  outside: 'The Very High Mountain',
  eastgate: 'The Gate toward the East',
  gate: 'A Gate of the Outer Court',
  igate: 'A Gate of the Inner Court',
  sabbath: 'The Inner Gate toward the East',
  outer: 'The Outer Court',
  kitchen: 'The Kitchens of the Court',
  priests: 'By the Priests’ Chambers',
  inner: 'The Inner Court',
  separate: 'The Separate Place',
  porch: 'The Porch of the House',
  holy: 'The Temple',
  holiest: 'The Most Holy Place',
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Height of the floor underfoot. Steps are ramps here; the eye eases over them. */
export function heightAt(x: number, z: number): number {
  const H = HOUSE;
  const az = Math.abs(z);
  // the house, on its foundation
  if (x > H.back && x < H.front && az < H.platform) return Y.house;
  // the steps up to the porch
  if (x >= STEPS.x0 && x <= STEPS.x1 && az <= STEPS.half) return Y.house - (Y.house - Y.inner) * clamp01((x - STEPS.x0) / (STEPS.x1 - STEPS.x0));
  // the inner court and the separate place
  if (x > TERRACE.minX && x < TERRACE.maxX && az < TERRACE.half) return Y.inner;
  // the gates and their steps
  const gate = gateAt(x, z);
  if (gate) {
    const { g, u, v } = gate;
    if (u >= 0) return g.floor;
    if (Math.abs(v) <= GATE.stepsHalf) return g.steps.from + (g.floor - g.steps.from) * clamp01((u + g.steps.run) / g.steps.run);
  }
  if (Math.abs(x) < WALL.half && az < WALL.half) return Y.outer;
  return Y.ground;
}
