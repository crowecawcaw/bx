import { TEMPLE_FEATURES, TEMPLE_GENERAL } from '../data/templeSpecs';
import {
  ALTAR,
  BACK,
  CHAMBER_BACK,
  CHAMBER_DOOR,
  CHAMBER_EAST,
  CHAMBER_IN,
  CHAMBER_OUT,
  CHAMBER_WEST,
  CROSS_X,
  CROSS_Z,
  DOOR,
  GREAT,
  HOUSE,
  INNER,
  ORACLE_DOOR,
  OUT,
  PILLAR,
  PLAT,
  PORCH,
  POS,
  RAMP,
  REGION_LABEL,
  SEA,
  START,
  STAIRS,
  STEPS,
  STOREY_Y,
  houseFaceX,
  houseFaceZ,
  regionOf,
} from '../temple/dims';
import type { Circle, Rect, SiteDef } from './types';

/** Four walls of a court, leaving a gateway of half-width `gate` in the east wall. */
function courtWalls(c: typeof INNER): Rect[] {
  const t = c.wall / 2;
  return [
    [c.minX - t, c.minZ - t, c.maxX + t, c.minZ + t],
    [c.minX - t, c.maxZ - t, c.maxX + t, c.maxZ + t],
    [c.minX - t, c.minZ, c.minX + t, c.maxZ],
    [c.maxX - t, c.minZ, c.maxX + t, -c.gate],
    [c.maxX - t, c.gate, c.maxX + t, c.maxZ],
  ];
}

/** The stone piers either side of a court's gateway. */
function gatePiers(c: typeof INNER): Rect[] {
  const t = c.wall / 2 + 1;
  return [
    [c.maxX - t, c.gate, c.maxX + t, c.gate + 2],
    [c.maxX - t, -c.gate - 2, c.maxX + t, -c.gate],
  ];
}

const BOUNDS = { minX: GREAT.minX - 5, maxX: GREAT.maxX + 5, minZ: GREAT.minZ - 5, maxZ: GREAT.maxZ + 5 };

/** A rect on the south side, or its mirror on the north. */
const side = (s: number, [x0, z0, x1, z1]: Rect): Rect => (s > 0 ? [x0, z0, x1, z1] : [x0, -z1, x1, -z0]);

/** A wall across a corridor from a to b (along z, at x; or along x, at z), with a 2-cubit doorway in the middle. */
function crossWall(axis: 'x' | 'z', at: number, a: number, b: number): Rect[] {
  const m = (a + b) / 2;
  return axis === 'x'
    ? [
        [at - 0.25, a, at + 0.25, m - 1],
        [at - 0.25, m + 1, at + 0.25, b],
      ]
    : [
        [a, at - 0.25, m - 1, at + 0.25],
        [m + 1, at - 0.25, b, at + 0.25],
      ];
}

/** Walls of the side chambers on one storey: outer walls, end walls, cross walls and stairwells. */
function chamberWalls(level: number): Rect[] {
  const fz = houseFaceZ(level);
  const fx = houseFaceX(level);
  const rects: Rect[] = [
    [CHAMBER_BACK, -CHAMBER_OUT, CHAMBER_WEST, CHAMBER_OUT], // west outer wall
    [CHAMBER_EAST, -CHAMBER_IN, OUT, -(OUT - 2)], // east end walls beside the porch
    [CHAMBER_EAST, OUT - 2, OUT, CHAMBER_IN],
    [CHAMBER_BACK, -CHAMBER_OUT, OUT, -CHAMBER_IN], // north outer wall
  ];
  // south outer wall, with the door on the ground storey (1 Kgs 6:8)
  if (level === 0) {
    rects.push([CHAMBER_BACK, CHAMBER_IN, CHAMBER_DOOR.x0, CHAMBER_OUT], [CHAMBER_DOOR.x1, CHAMBER_IN, OUT, CHAMBER_OUT]);
    rects.push([CHAMBER_DOOR.x0 - 0.15, CHAMBER_IN - 2.9, CHAMBER_DOOR.x0, CHAMBER_IN]); // its leaf, standing open
  }
  else rects.push([CHAMBER_BACK, CHAMBER_IN, OUT, CHAMBER_OUT]);
  for (const x of CROSS_X) for (const s of [1, -1]) rects.push(...crossWall('x', x, fz, CHAMBER_IN).map((r) => side(s, r)));
  for (const z of CROSS_Z) rects.push(...crossWall('z', z, CHAMBER_WEST, fx));
  for (const st of STAIRS) {
    if (st.from === level) {
      // the flight's side rail, and the wall under its head
      rects.push(side(st.side, [st.x0 + 2, st.zIn - 0.1, st.x1, st.zIn + 0.1]));
      rects.push(side(st.side, [st.x1, st.zIn, st.x1 + 0.3, st.zOut]));
    }
    // the stairwell in the floor above, open only at the head of the flight
    if (st.from + 1 === level) rects.push(side(st.side, [st.x0 - 0.3, st.zIn, st.x1 - 2, st.zOut]));
  }
  return rects;
}

function obstacles(open: Record<string, boolean>, level = 0) {
  if (level > 0) {
    // upper storeys: only the chambers' floors, round the house
    const rects: Rect[] = [
      [BOUNDS.minX, BOUNDS.minZ, CHAMBER_BACK, BOUNDS.maxZ],
      [OUT, BOUNDS.minZ, BOUNDS.maxX, BOUNDS.maxZ],
      [CHAMBER_BACK, BOUNDS.minZ, OUT, -CHAMBER_OUT],
      [CHAMBER_BACK, CHAMBER_OUT, OUT, BOUNDS.maxZ],
      [houseFaceX(level), -houseFaceZ(level), OUT, houseFaceZ(level)],
      ...chamberWalls(level),
    ];
    return { rects, circles: [] as Circle[] };
  }
  const { halfWidth: hw, frontX, partitionX, partition } = HOUSE;
  const p0 = partitionX - partition / 2;
  const p1 = partitionX + partition / 2;
  const t = 0.5; // parapet round the platform
  const rects: Rect[] = [
    ...courtWalls(GREAT),
    ...courtWalls(INNER),
    ...gatePiers(GREAT),
    ...gatePiers(INNER),
    // the platform's parapet, open for the steps, and the steps' cheek walls
    [PLAT.minX, -PLAT.halfZ, PLAT.maxX, -PLAT.halfZ + t],
    [PLAT.minX, PLAT.halfZ - t, PLAT.maxX, PLAT.halfZ],
    [PLAT.minX, -PLAT.halfZ, PLAT.minX + t, PLAT.halfZ],
    [PLAT.maxX - t, -PLAT.halfZ, PLAT.maxX, -STEPS.halfZ - t],
    [PLAT.maxX - t, STEPS.halfZ + t, PLAT.maxX, PLAT.halfZ],
    [PLAT.maxX - t, -STEPS.halfZ - t, PLAT.maxX + STEPS.run, -STEPS.halfZ],
    [PLAT.maxX - t, STEPS.halfZ, PLAT.maxX + STEPS.run, STEPS.halfZ + t],
    // the house walls (1 Kgs 6:5)
    [BACK, hw, PORCH.backX, OUT],
    [BACK, -OUT, PORCH.backX, -hw],
    [BACK, -hw, HOUSE.oracleX, hw],
    ...chamberWalls(0),
    // east wall of the house, either side of the door
    [frontX, -hw, PORCH.backX, -DOOR.half],
    [frontX, DOOR.half, PORCH.backX, hw],
    // porch side walls
    [PORCH.backX, hw, PORCH.faceX, OUT],
    [PORCH.backX, -OUT, PORCH.faceX, -hw],
    // the cedar partition before the oracle, either side of its doors
    [p0, -hw, p1, -ORACLE_DOOR.half],
    [p0, ORACLE_DOOR.half, p1, hw],
    // furniture of the holy place
    [POS.incense[0] - 1.3, -0.7, POS.incense[0] + 1.3, 0.7],
    // the ark and its drawn-out staves (1 Kgs 8:8)
    [POS.ark[0] - 4.6, POS.ark[1] - 1.45, POS.ark[0] + 4.6, POS.ark[1] + 1.45],
    // the altar, and kerbs along its ramp, open at the foot
    [POS.altar[0] - ALTAR.size / 2 - 0.4, -ALTAR.size / 2 - 0.4, POS.altar[0] + ALTAR.size / 2 + 0.4, ALTAR.size / 2 + 0.4],
    [RAMP.minX - 0.3, ALTAR.size / 2, RAMP.minX, ALTAR.size / 2 + RAMP.length - 3],
    [RAMP.maxX, ALTAR.size / 2, RAMP.maxX + 0.3, ALTAR.size / 2 + RAMP.length - 3],
  ];
  for (const x of POS.lampX) {
    for (const s of [1, -1]) {
      rects.push([x - 1.15, s * POS.lampZ - 0.45, x + 1.15, s * POS.lampZ + 0.45]);
      rects.push([x - 1.75, s * POS.tableZ - 0.65, x + 1.75, s * POS.tableZ + 0.65]);
    }
  }
  for (const x of POS.basesX) for (const s of [1, -1]) rects.push([x - 2.3, s * POS.basesZ - 2.3, x + 2.3, s * POS.basesZ + 2.3]);

  // things that open: closed, they block the way; open, their leaves stand out from the wall
  if (!open.gate) rects.push([INNER.maxX - INNER.wall / 2 - 0.4, -INNER.gate, INNER.maxX + INNER.wall / 2, INNER.gate]);
  else for (const s of [1, -1]) rects.push([INNER.maxX - INNER.wall / 2 - INNER.gate, s * INNER.gate - 0.5, INNER.maxX - INNER.wall / 2, s * INNER.gate + 0.5]);
  if (!open.doors) rects.push([frontX - 0.4, -DOOR.half, PORCH.backX, DOOR.half]);
  else for (const s of [1, -1]) rects.push([frontX - DOOR.half / 2 - 0.3, s * DOOR.half - 0.35, frontX, s * DOOR.half + 0.35]);
  if (!open.oracleDoors) rects.push([p0, -ORACLE_DOOR.half, p1 + 0.3, ORACLE_DOOR.half]);
  else for (const s of [1, -1]) rects.push([p1, s * ORACLE_DOOR.half - 0.35, p1 + ORACLE_DOOR.half + 0.2, s * ORACLE_DOOR.half + 0.35]);
  if (!open.veil) rects.push([p0 - 0.9, -ORACLE_DOOR.half - 0.3, p0 - 0.2, ORACLE_DOOR.half + 0.3]);

  const circles: Circle[] = [
    [PILLAR.x, PILLAR.z, PILLAR.radius + 0.1],
    [PILLAR.x, -PILLAR.z, PILLAR.radius + 0.1],
    [POS.sea[0], POS.sea[1], SEA.radius + 1.8],
    [POS.ark[0], POS.cherubZ, 1.5],
    [POS.ark[0], -POS.cherubZ, 1.5],
  ];
  return { rects, circles };
}

const inRect = (x: number, z: number, [x0, z0, x1, z1]: Rect) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
const stairRect = (st: (typeof STAIRS)[number]): Rect => side(st.side, [st.x0, st.zIn, st.x1, st.zOut]);

/** Floor height: the altar's ramp, the steps, the platform, and the storeys and stairs of the chambers. */
function heightAt(x: number, z: number, level: number) {
  for (const st of STAIRS) {
    if ((st.from === level || st.from + 1 === level) && inRect(x, z, stairRect(st))) {
      const t = clamp01((x - st.x0) / (st.x1 - st.x0));
      return PLAT.h + STOREY_Y[st.from] + (STOREY_Y[st.from + 1] - STOREY_Y[st.from]) * t;
    }
  }
  if (level > 0) return PLAT.h + STOREY_Y[level];
  const S = ALTAR.size / 2;
  if (x >= RAMP.minX && x <= RAMP.maxX && z >= S && z <= S + RAMP.length) return (ALTAR.height - 0.4) * (1 - (z - S) / RAMP.length);
  if (Math.abs(z) <= PLAT.halfZ && x >= PLAT.minX && x <= PLAT.maxX) return PLAT.h;
  if (Math.abs(z) <= STEPS.halfZ && x > PLAT.maxX && x <= PLAT.maxX + STEPS.run) return PLAT.h * (1 - (x - PLAT.maxX) / STEPS.run);
  return 0;
}
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export const TEMPLE: SiteDef = {
  id: 'temple',
  title: "Solomon's Temple",
  features: TEMPLE_FEATURES,
  general: TEMPLE_GENERAL,
  specsIntro:
    'Every measurement and furnishing given for the house Solomon built (1 Kings 6–8, 2 Chronicles 3–5), with the parallel accounts, and where each appears in this model.',
  regionOf,
  regionLabel: REGION_LABEL,
  start: START,
  bounds: BOUNDS,
  curtains: ['gate', 'doors', 'oracleDoors', 'veil'],
  reach: 18,
  levels: 3,
  obstacles,
  links: STAIRS.map((st) => ({ rect: side(st.side, [st.x1 - 1.8, st.zIn, st.x1, st.zOut]), a: st.from, b: st.from + 1 })),
  heightAt,
  scripture: '1 Kings 6:1-14',
  layers: false,
};
