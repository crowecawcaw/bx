// The second temple as Herod rebuilt it, the house of the Gospels and Acts. All world units are
// cubits; axes as for the tabernacle and Solomon's Temple: +x = east, -z = north, +z = south, +y = up.
//
// Scripture gives few measurements for this house (Ezra 6:3), so the plan follows the Mishnah
// tractate Middot, written down about a century after the house was destroyed, with Josephus where
// Middot is silent. The info panels say where each choice comes from.

/** Floor heights: the courts rise in steps of half a cubit from the Court of the Gentiles. */
export const Y = {
  mount: 0,
  /** The chel and the Court of the Women: 12 steps up from the soreg (Middot 2:3). */
  women: 6,
  /** The Court of Israel: 15 steps up from the Court of the Women (Middot 2:5). */
  israel: 13.5,
  /** The Court of the Priests stood 2½ cubits higher (Middot 2:6). */
  priests: 16,
  /** The house: 12 steps up from the court, on a foundation of 6 cubits (Middot 3:6; 4:6). */
  house: 22,
};

/**
 * The house, 100 long, 100 high, 100 broad across the porch and 70 behind it (Middot 4:6-7).
 * East to west: porch wall 5, porch 11, hekal wall 6, hekal 40, the amah traksin 1 (the cubit between
 * the two curtains), the Holy of Holies 20, wall 6, chamber 6, wall 5.
 */
export const HOUSE = {
  frontX: 0, // east face of the porch
  porchIn: -5, // inner face of the porch's front wall
  porchBack: -16, // back of the porch: the hekal's east wall
  hekalX: -22, // inner face of the hekal's east wall
  veilEast: -62, // the outer curtain
  veilWest: -63, // the inner curtain; between them, the amah traksin (Middot 4:7)
  holiestX: -83, // west wall, inner face
  backX: -100,
  inner: 10, // the hekal is 20 broad (Middot 4:7)
  body: 35, // half of the 70 behind the porch
  porch: 50, // half of the 100 across the porch: it stood out 15 cubits each side (Middot 4:7)
  porchInner: 45, // the porch hall inside its 5-cubit walls (not given)
  height: 100, // from the court floor (Middot 4:6)
  hekalHeight: 40, // Middot 4:6
  roof: 91, // the roof, above the house floor: 40 + 5 + 40 + 6 (Middot 4:6)
  parapet: 3, // Middot 4:6
};

/** Doorways: the porch entrance 20 broad and 40 high, without doors; the hekal door 10 by 20 (Middot 3:7; 4:1). */
export const PORCH_DOOR = { half: 10, height: 40 };
export const HEKAL_DOOR = { half: 5, height: 20 };

/**
 * The court (azarah), 187 long and 135 broad (Middot 5:1-2). East to west: the Court of Israel 11,
 * the Court of the Priests 11, the altar 32, between the porch and the altar 22, the house 100, and
 * 11 behind the house.
 */
export const AZARAH = { minX: -111, maxX: 76, half: 67.5, wall: 4, height: 24 };
export const PRIESTS_X = 65; // the step up from the Court of Israel to the Court of the Priests
export const DUCHAN = 2.5; // the rise and its run, in five half-cubit steps

/** The Court of the Women, 135 by 135, with a chamber 40 by 40 in each corner (Middot 2:5). */
export const WOMEN = { minX: AZARAH.maxX + AZARAH.wall, maxX: AZARAH.maxX + AZARAH.wall + 135, half: 67.5, wall: 4, height: 22, corner: 40 };

/** Gates: 10 cubits broad and 20 high (Middot 2:3). z of the side gates of the Court of the Women. */
export const GATE = { half: 5, height: 20 };
export const WOMEN_SIDE_X = (WOMEN.minX + WOMEN.maxX) / 2;

/** The fifteen steps from the Court of the Women up to the Nicanor gate, round "like half a threshing floor" (Middot 2:5). */
export const NICANOR = { x: WOMEN.minX, landing: 6, tread: 0.6, n: 15 };
export const NICANOR_R = NICANOR.landing + NICANOR.tread * NICANOR.n;

/** The 12 steps from the court up to the porch (Middot 3:6), and how broad they are (not given). */
export const STEPS = { run: 18, half: 25, n: 12 };

/** The chel, a terrace 10 cubits broad round the courts, and the 12 steps down from it (Middot 2:3). */
export const CHEL = {
  minX: AZARAH.minX - AZARAH.wall - 10,
  maxX: WOMEN.maxX + WOMEN.wall + 10,
  half: AZARAH.half + AZARAH.wall + 10,
  steps: 12, // 12 steps with a cubit's tread
};
/** The soreg, a lattice fence 10 handbreadths high, a little outside the foot of the steps (Middot 2:3). */
export const SOREG = { minX: CHEL.minX - CHEL.steps - 4, maxX: CHEL.maxX + CHEL.steps + 4, half: CHEL.half + CHEL.steps + 4, height: 1.7 };
/** Openings in the soreg: x along the north and south sides, and the east one at z = 0. */
export const SOREG_GAPS_X = [-40, 40, WOMEN_SIDE_X];

/**
 * The temple mount, 500 cubits square (Middot 2:1). The largest open space was on the south, then the
 * east, then the north, and the least on the west.
 */
export const MOUNT = { minX: -160, maxX: 340, minZ: -190, maxZ: 310 };
/** Porticoes round about: a double colonnade 30 cubits deep, and the Royal Stoa on the south. */
export const PORTICO = { depth: 30, height: 25 };
export const STOA = { depth: 46, height: 40 };

export const ALTAR = { minX: 22, maxX: 54, half: 16, height: 9 }; // 32 square at its foot (Middot 3:1)
/** The ramp on the south side, 32 long and 16 broad (Middot 3:3). */
export const RAMP = { minX: 30, maxX: 46, z0: ALTAR.half, z1: ALTAR.half + 32 };
export const LAVER = { x: 12, z: 34, r: 2.2 };

export const POS = {
  table: [-45, -7] as const, // on the north (Ex 26:35)
  menorah: [-45, 7] as const, // on the south
  incense: [-36, 0] as const, // between them, a little toward the door
  stone: [-73, 0] as const, // the foundation stone in the Holy of Holies (Mishnah Yoma 5:2)
  /** The place of slaughtering, north of the altar: eight low pillars with cedar beams and hooks (Middot 3:5). */
  pillarsX: [28, 36, 44, 52],
  pillarsZ: [-30, -40],
  tablesX: [30, 38, 46, 54],
  tablesZ: -52,
};

/** The fortress Antonia at the north-west corner of the mount (Acts 21:34-40). */
export const ANTONIA = { minX: -150, maxX: -40, minZ: -250, maxZ: MOUNT.minZ };

export const START = { x: 292, z: 4, yaw: Math.PI / 2 + 0.03 };

const inside = (x: number, z: number, x0: number, x1: number, half: number) => x > x0 && x < x1 && Math.abs(z) < half;

export function regionOf(x: number, z: number): string {
  if (inside(x, z, HOUSE.holiestX, HOUSE.veilWest, HOUSE.inner)) return 'holiest';
  if (inside(x, z, HOUSE.veilWest, HOUSE.hekalX, HOUSE.inner)) return 'holy';
  if (inside(x, z, HOUSE.porchBack, HOUSE.frontX, HOUSE.porch)) return 'porch';
  if (inside(x, z, AZARAH.minX, AZARAH.maxX + AZARAH.wall, AZARAH.half)) return x < PRIESTS_X ? 'priests' : 'israel';
  if (inside(x, z, WOMEN.minX, WOMEN.maxX + WOMEN.wall, WOMEN.half)) return 'women';
  if (inside(x, z, SOREG.minX, SOREG.maxX, SOREG.half)) return 'chel';
  if (x > MOUNT.maxX - PORTICO.depth) return 'solomons';
  if (z > MOUNT.maxZ - STOA.depth) return 'stoa';
  if (x < MOUNT.minX + PORTICO.depth || z < MOUNT.minZ + PORTICO.depth) return 'porticoes';
  return 'gentiles';
}

export const REGION_LABEL: Record<string, string> = {
  gentiles: 'The Court of the Gentiles',
  solomons: 'Solomon’s Porch',
  stoa: 'The Royal Stoa',
  porticoes: 'The Porticoes',
  chel: 'Within the Soreg',
  women: 'The Court of the Women',
  israel: 'The Court of Israel',
  priests: 'The Court of the Priests',
  porch: 'The Porch',
  holy: 'The Holy Place',
  holiest: 'The Most Holy Place',
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Height of the floor underfoot. Steps are ramps here; the eye eases over them. */
export function heightAt(x: number, z: number): number {
  const az = Math.abs(z);
  // inside the house
  if (x < HOUSE.frontX && x > HOUSE.backX && az < (x > HOUSE.hekalX ? HOUSE.porch : HOUSE.body)) return Y.house;
  // the steps up to the porch
  if (x >= HOUSE.frontX && x < STEPS.run && az <= STEPS.half) return Y.house - (Y.house - Y.priests) * clamp01(x / STEPS.run);
  // the altar's ramp
  if (x >= RAMP.minX && x <= RAMP.maxX && z >= RAMP.z0 && z <= RAMP.z1) return Y.priests + (ALTAR.height - 0.3) * (1 - (z - RAMP.z0) / (RAMP.z1 - RAMP.z0));
  // the court
  if (x > AZARAH.minX && x < AZARAH.maxX + AZARAH.wall && az < AZARAH.half) {
    if (x < PRIESTS_X) return Y.priests;
    return Y.priests - (Y.priests - Y.israel) * clamp01((x - PRIESTS_X) / DUCHAN);
  }
  // the fifteen steps, round about the Nicanor gate
  const r = Math.hypot(x - NICANOR.x, z);
  if (x >= NICANOR.x && r < NICANOR_R) return Y.israel - (Y.israel - Y.women) * clamp01((r - NICANOR.landing) / (NICANOR_R - NICANOR.landing));
  // the chel and the Court of the Women
  if (x >= CHEL.minX && x <= CHEL.maxX && az <= CHEL.half) return Y.women;
  // the steps down from the chel, on every side
  const d = Math.max(CHEL.minX - x, x - CHEL.maxX, az - CHEL.half);
  if (d < CHEL.steps) return Y.women * (1 - d / CHEL.steps);
  return Y.mount;
}

/** Gates in the mount's wall, closed: [x, z, side]. Shushan on the east, two Huldah gates on the south, Tadi on the north, Kiponus on the west (Middot 1:3). */
export const MOUNT_GATES: { name: string; x: number; z: number; axis: 'x' | 'z' }[] = [
  { name: 'Shushan', x: MOUNT.maxX, z: 0, axis: 'z' },
  { name: 'Huldah', x: 20, z: MOUNT.maxZ, axis: 'x' },
  { name: 'Huldah', x: 150, z: MOUNT.maxZ, axis: 'x' },
  { name: 'Tadi', x: 90, z: MOUNT.minZ, axis: 'x' },
  { name: 'Kiponus', x: MOUNT.minX, z: 60, axis: 'z' },
];

/** Columns of the porticoes, [x, z, height]. A double row on the east, north and west, and three rows in the Royal Stoa. */
export const COLUMN_R = 0.9;
export const COLUMN_STEP = 8;
export function columns(): [number, number, number][] {
  const out: [number, number, number][] = [];
  const { minX, maxX, minZ, maxZ } = MOUNT;
  const h = PORTICO.height;
  const southEdge = maxZ - STOA.depth;
  for (let z = minZ + 14; z < southEdge - 4; z += COLUMN_STEP) {
    for (const d of [14, 28]) {
      if (d === 28 && z < minZ + 28) continue;
      out.push([maxX - d, z, h], [minX + d, z, h]);
    }
  }
  for (let x = minX + 14 + COLUMN_STEP; x < maxX - 14; x += COLUMN_STEP) {
    out.push([x, minZ + 14, h]);
    if (x > minX + 30 && x < maxX - 30) out.push([x, minZ + 28, h]);
  }
  for (let x = minX + 6; x < maxX - 4; x += COLUMN_STEP) {
    for (const d of [14, 30]) out.push([x, maxZ - d, STOA.height - 2]);
    out.push([x, southEdge + 2, h]);
  }
  return out;
}
