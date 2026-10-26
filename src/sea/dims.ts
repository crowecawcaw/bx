// The path through the Red Sea (Ex 14). World units are cubits, like the other sites.
// Axes: +x = east (the way Israel walks), z = north (-) / south (+), +y = up.
// Scripture gives no width, height or length, so every number here is a choice (see seaSpecs.ts).

/** Half the width of the dry path between the walls. */
export const HALF = 20;
/** Thickness of the water walls, front face to back face. */
export const SLAB = 6;
/** The sea's surface. The walls stand from the seabed up to here (about 26 m). */
export const SEA = 56;
/** You can walk this close to the foot of either wall. */
export const WALK_HALF = 15.5;

/** The walls run from shore to shore. */
export const X0 = -420;
export const X1 = 1220;

/** The far (east) shore: the seabed curves up, out of the sea, over this stretch. */
export const RISE_X = 600;
export const RISE_LEN = 440;
export const RISE_H = 70;
/** The near (west) shore, hidden behind the pillar of cloud. */
const WEST_X = -110;
const WEST_LEN = 220;

/** Where the pillar of cloud stands, between Israel and Egypt (Ex 14:19-20). */
export const CLOUD_X = -150;

/** The crowd walks on toward the far shore but stops short of the open sea. */
export const CROWD_MAX = RISE_X + 230;

/** Once the ground underfoot comes within this of the sea's surface, the waters return. */
export const CRASH_AT = SEA - 2;
/** After the crash you wake here, at the foot of the slope. */
export const RESET_X = RISE_X + 20;

export const START = { x: 0, z: 0, yaw: -Math.PI / 2 };

/* ------------------------------------------------------------------ noise */

function hash2(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
export function vnoise(x: number, z: number) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function fbm(x: number, z: number) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    s += a * vnoise(x * f, z * f);
    f *= 2.07;
    a *= 0.5;
  }
  return s;
}

/** Seeded random numbers, so the seabed looks the same on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ terrain */

const ease = (t: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t)))) / 2;

/** How far the seabed has climbed toward either shore. */
export function rise(x: number) {
  return RISE_H * Math.max(ease((x - RISE_X) / RISE_LEN), ease((WEST_X - x) / WEST_LEN));
}

/** The seabed: broad drowned dunes, lumps and drift ripples, with banks rising to the walls. */
export function groundH(x: number, z: number) {
  let y = (fbm(z * 0.025 + 11, x * 0.025) - 0.5) * 6.6;
  y += (fbm(z * 0.11 + 3, x * 0.082) - 0.5) * 2.1;
  y += Math.sin(x * 0.046 + Math.sin(z * 0.059) * 2) * 0.37;
  y += Math.sin(z * 0.23 + x * 0.027) * 0.2;
  const e = Math.min(1, Math.abs(z) / HALF);
  y += Math.pow(e, 2.8) * 6.4;
  return y + rise(x);
}

/** The foot of the walls, a little under the bank so no gap shows. */
export const wallFoot = (x: number) => rise(x) - 2;

/** Height of the crest above the foot; zero where the shore comes up out of the sea. */
export function wallHeight(x: number, side: number) {
  const top = SEA * (1 + 0.1 * Math.sin(x * 0.0096 + 0.7 + side));
  return Math.max(0, top - wallFoot(x));
}

/**
 * Cross-section of a wind-blown breaker standing as a wall: bellied foot, hard lean inward, a
 * curling lip. v runs 0 (foot) to 1 (crest). `back` is the rear face, which closes the slab.
 */
export function wallProfile(v: number, x: number, side: number, back: boolean): [number, number, number] {
  const h = wallHeight(x, side);
  const k = Math.min(1, h / SEA); // low walls near the shores lean and curl less
  const over = (back ? 7 : 8.8) * k;
  const belly = Math.sin(Math.min(1, v / 0.72) * Math.PI) * (back ? 1.5 : 2.3) * k;
  const wob = Math.sin(x * 0.0128 + side * 1.7) * 1.6 + Math.sin(x * 0.0053 + 2.1 + side) * 2.1;
  let z = HALF + (back ? SLAB : 0) + belly - Math.pow(v, 2.15) * over + wob * (0.15 + 0.85 * v) * k;
  let y = wallFoot(x) + v * h;
  if (back) {
    y += v * h * 0.07;
    z += Math.pow(v, 3) * 0.9;
  } else {
    let lip = Math.max(0, Math.min(1, (v - 0.84) / 0.16));
    lip = lip * lip * (3 - 2 * lip) * k;
    z -= lip * 3.8 * (0.55 + 0.45 * Math.sin(x * 0.018 + side));
    y -= lip * 3;
  }
  return [x + v * v * 5.7 * k, y, side * z];
}

/* ------------------------------------------------------------------ regions */

export type Region = 'seabed' | 'rise' | 'shore';

export function regionOf(x: number): Region {
  if (x < RISE_X + 60) return 'seabed';
  return groundH(x, 0) < CRASH_AT - 6 ? 'rise' : 'shore';
}

export const REGION_LABEL: Record<Region, string> = {
  seabed: 'In the Midst of the Sea',
  rise: 'Toward the Far Shore',
  shore: 'Level with the Sea',
};
