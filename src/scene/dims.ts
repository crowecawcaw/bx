// All world units are cubits. 1 cubit ≈ 18 in / 45.7 cm (common cubit).
// Axes: +x = east, -x = west, -z = north, +z = south, +y = up.
// The court is centred on the origin; the gate is on the east side (Ex 27:13-16).

export const CUBIT_M = 0.4572;

export const COURT = {
  length: 100, // east-west (Ex 27:9-11)
  width: 50, // north-south (Ex 27:12-13)
  height: 5, // Ex 27:18
  pillarSpacing: 5, // 300 cubits of perimeter / 60 pillars
  gateWidth: 20, // Ex 27:16
  minX: -50,
  maxX: 50,
  minZ: -25,
  maxZ: 25,
};

// Tabernacle proper. Interior 30 x 10 x 10 (20 boards x 1.5 per side, Ex 26:16-18).
// The tent stands in the western half of the court; the ark sits at the centre of the
// western 50x50 square (a common reconstruction; Scripture gives no offset).
export const TENT = {
  frontX: 0, // east face (door)
  backX: -30, // west wall inner face
  veilX: -20, // veil hangs under the clasps, 20 cubits (5 curtains x 4) from the front (Ex 26:33)
  halfWidth: 5,
  height: 10,
  boardWidth: 1.5, // Ex 26:16
  boardThickness: 1, // not stated; 1 cubit per the Talmud (Shabbat 98b), which makes 6 + 2 corner boards fit a 10-cubit interior
  boardsPerSide: 20, // Ex 26:18, 20
  westBoards: 6, // Ex 26:22
  cornerBoards: 2, // Ex 26:23
};

export const POS = {
  ark: [-25, 0] as const, // Holy of Holies centre
  incense: [-21.5, 0] as const, // "before the vail" (Ex 30:6; 40:26)
  table: [-10, -3] as const, // north side (Ex 26:35; 40:22)
  menorah: [-10, 3] as const, // south side, over against the table (Ex 26:35; 40:24)
  laver: [12, 0] as const, // between the tent and the altar (Ex 30:18; 40:30)
  altar: [25, 0] as const, // before the door (Ex 40:6, 29)
};

export const EYE_HEIGHT = 3.7; // ≈ 1.7 m
export const PLAYER_RADIUS = 0.6;
export const START = { x: 64, z: 6, yaw: Math.PI / 2 + 0.12 };

export type Region = 'camp' | 'court' | 'holy' | 'holiest';

export function regionOf(x: number, z: number): Region {
  if (x < TENT.frontX && x > TENT.backX && Math.abs(z) < TENT.halfWidth) {
    return x < TENT.veilX ? 'holiest' : 'holy';
  }
  if (x > COURT.minX && x < COURT.maxX && z > COURT.minZ && z < COURT.maxZ) return 'court';
  return 'camp';
}

export const REGION_LABEL: Record<Region, string> = {
  camp: 'The Camp of Israel',
  court: 'Outer Court',
  holy: 'The Holy Place',
  holiest: 'The Most Holy Place',
};

/** Debug hooks (window.__tabernacle, window.__gl) load only with ?debug in the URL. */
export const DEBUG = new URLSearchParams(window.location.search).has('debug');
