// Solomon's Temple. All world units are cubits; axes as for the tabernacle:
// +x = east, -x = west, -z = north, +z = south, +y = up. The house faces east.
// "Right" in the text is south when facing east: the sea stood "on the right side of the house
// eastward over against the south" (1 Kgs 7:39), so Jachin, the right pillar, is the southern one.

/** The house: interior measures (1 Kgs 6:2-3, 16-20). */
export const HOUSE = {
  oracleX: -50, // west wall, inner face
  partitionX: -30, // the oracle is 20 cubits deep (1 Kgs 6:16, 20)
  frontX: 10, // the temple (hekal) before it is 40 cubits long (1 Kgs 6:17)
  halfWidth: 10, // 20 cubits broad (1 Kgs 6:2)
  height: 30, // 1 Kgs 6:2
  oracleHeight: 20, // the oracle is a 20-cubit cube (1 Kgs 6:20)
  partition: 0.5, // cedar boards (1 Kgs 6:16); thickness not given
  wall: 6, // not given; the thickness of Ezekiel's temple wall (Ezek 41:5)
  rest: 1, // each narrowed rest steps the wall in a cubit (1 Kgs 6:6)
  storey: 5, // each tier of chambers 5 cubits high (1 Kgs 6:10)
  chamberWall: 3, // not given
};

/** Outer face of the house wall at ground level, and the chambers' outer wall (5 + 6 = 6 + 5 = 7 + 4). */
export const OUT = HOUSE.halfWidth + HOUSE.wall; // 16
export const BACK = HOUSE.oracleX - HOUSE.wall; // -56
export const CHAMBER_IN = OUT + 5; // 21: the nethermost chamber is 5 broad (1 Kgs 6:6)
export const CHAMBER_OUT = CHAMBER_IN + HOUSE.chamberWall; // 24
export const CHAMBER_BACK = BACK - 5 - HOUSE.chamberWall; // -64
export const CHAMBER_TOP = 3 * HOUSE.storey + 2; // three storeys and their floors

/** The porch: 20 long (the breadth of the house), 10 deep, 120 high (1 Kgs 6:3; 2 Chr 3:4). */
export const PORCH = {
  backX: HOUSE.frontX + HOUSE.wall, // 16
  frontX: HOUSE.frontX + HOUSE.wall + 10, // 26: 10 cubits deep inside
  faceX: HOUSE.frontX + HOUSE.wall + 16, // 32: east face of the side walls
  height: 120,
  opening: 32, // height of the open front; not given
};

/** Doorways. Width = the fraction of the 20-cubit wall given in 1 Kgs 6:31, 33 (KJV). Heights are not given. */
export const DOOR = { half: 2.5, height: 10 }; // "a fourth part of the wall"
export const ORACLE_DOOR = { half: 2, height: 8 }; // "a fifth part of the wall"

/** Jachin and Boaz: 18 cubits high, 12 round (1 Kgs 7:15), standing in the porch. */
export const PILLAR = {
  x: 29,
  z: 6,
  height: 18,
  radius: 12 / (2 * Math.PI),
  chapiter: 5, // 1 Kgs 7:16
};

export const POS = {
  ark: [-40, 0] as const, // under the cherubim's wings (1 Kgs 8:6)
  cherubZ: 5, // each 10 cubits across the wings, filling the 20-cubit oracle (1 Kgs 6:27)
  incense: [-24, 0] as const, // the altar "by the oracle" (1 Kgs 6:22)
  lampX: [-21, -14.5, -8, -1.5, 5],
  lampZ: 8, // five on the right (south), five on the left (1 Kgs 7:49)
  tableZ: 4.5, // ten tables, five on each side (2 Chr 4:8)
  altar: [62, 0] as const, // before the house (2 Chr 5:12; 1 Kgs 8:64)
  sea: [38, 36] as const, // right side of the house, eastward, toward the south (1 Kgs 7:39)
  basesX: [-50, -36, -22, -8, 6],
  basesZ: 34, // five on the right side of the house, five on the left (1 Kgs 7:39)
};

export const ALTAR = { size: 20, height: 10 }; // 2 Chr 4:1
/** Ramp up the south side of the altar (not in Scripture; steps were forbidden, Ex 20:26). */
export const RAMP = { minX: 58, maxX: 66, length: 32 };
export const SEA = { radius: 5, height: 5, oxHeight: 2.6 }; // 1 Kgs 7:23-25

/** Courts: no measurements are given; shown at twice the tabernacle court, inside a great court. */
export const INNER = { minX: -90, maxX: 110, minZ: -50, maxZ: 50, gate: 10, wall: 2, height: 5.25 };
export const GREAT = { minX: -150, maxX: 230, minZ: -110, maxZ: 110, gate: 10, wall: 2, height: 5.25 };

export const START = { x: 168, z: 5, yaw: Math.PI / 2 + 0.03 };

export function regionOf(x: number, z: number): string {
  if (Math.abs(z) < HOUSE.halfWidth) {
    if (x > HOUSE.oracleX && x < HOUSE.partitionX - HOUSE.partition / 2) return 'oracle';
    if (x >= HOUSE.partitionX - HOUSE.partition / 2 && x < HOUSE.frontX + HOUSE.wall / 2) return 'holy';
    if (x >= HOUSE.frontX + HOUSE.wall / 2 && x < PORCH.faceX) return 'porch';
  }
  if (x > INNER.minX && x < INNER.maxX && z > INNER.minZ && z < INNER.maxZ) return 'inner';
  return 'great';
}

export const REGION_LABEL: Record<string, string> = {
  great: 'The Great Court',
  inner: 'The Inner Court',
  porch: 'The Porch',
  holy: 'The Holy Place',
  oracle: 'The Most Holy Place',
};
