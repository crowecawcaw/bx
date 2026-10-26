import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SkyDome, Wind } from '../scene/Environment';
import { toon, toonRamp } from '../scene/materials';
import { DEBUG } from '../scene/dims';
import { GREAT } from './dims';
import { hillGroundTexture, tex, terraceWallTexture } from './textures';

/*
 * Jerusalem in Solomon's day, seen from the temple courts on Mount Moriah.
 *
 * The temple stood on the top of the eastern ridge. East, the ground falls steeply to the Kidron,
 * and across it rises the Mount of Olives, higher than the temple mount. West lies the Tyropoeon
 * (Central) valley and beyond it the western hill, still mostly fields and olive yards. North the
 * ridge rises gently. South, the ridge narrows into a spur: Solomon's palace just below the courts
 * (1 Kgs 7:1-12), then the Ophel and the walled City of David (2 Sam 5:7-9; 1 Kgs 3:1; 9:15),
 * ending above the Gihon spring and the king's garden where the Kidron meets the Hinnom valley
 * (Neh 3:15). "As the mountains are round about Jerusalem" (Ps 125:2).
 *
 * Everything sits on one heightfield (cubits, y = 0 at the court floor), so houses and trees stand
 * on the ground that's drawn. Horizontal distances are a little compressed so the far hills fit
 * inside the fog.
 */

type Rect = { x0: number; x1: number; z0: number; z1: number; top: number };

/** The courts' terrace. Its top sits a little below the pavement (y = 0.01) so the two never fight. */
const PLATFORM: Rect = { x0: GREAT.minX - 8, x1: GREAT.maxX + 8, z0: GREAT.minZ - 8, z1: GREAT.maxZ + 8, top: -0.3 };
/** Solomon's palace on two terraces stepping down south of the courts. */
const PALACE_HI: Rect = { x0: -120, x1: 215, z0: PLATFORM.z1, z1: 290, top: -12 };
const PALACE_LO: Rect = { x0: -90, x1: 205, z0: 290, z1: 440, top: -28 };
const TERRACES = [PLATFORM, PALACE_HI, PALACE_LO];

/** [x, z, bed height]; w is the width of the slopes, wEast that of the eastern slope if different. */
type Valley = { p: [number, number, number][]; floor: number; w: number; wEast?: number };
const KIDRON: Valley = {
  p: [[480, -1600, -40], [470, -500, -100], [470, 0, -130], [470, 600, -175], [500, 1100, -215], [530, 1400, -240], [630, 1800, -270], [820, 2400, -300]],
  floor: 22,
  w: 330,
  wEast: 560, // the long slope up the Mount of Olives
};
const TYROPOEON: Valley = {
  p: [[-360, -1100, -25], [-340, -200, -60], [-330, 0, -85], [-260, 500, -130], [-170, 900, -175], [20, 1250, -225], [500, 1410, -242]],
  floor: 14,
  w: 250,
};
const HINNOM: Valley = {
  p: [[-1150, -900, -20], [-1100, 200, -40], [-1000, 800, -90], [-750, 1250, -150], [-350, 1520, -205], [100, 1580, -232], [420, 1480, -242], [530, 1410, -244]],
  floor: 18,
  w: 280,
};

/** City of David's wall, from the south-east corner of the courts round the spur to the south-west corner. */
const WALL: [number, number][] = [
  [248, 126], [262, 260], [288, 420], [318, 560], [322, 700], [300, 860], [262, 1010], [205, 1130],
  [130, 1185], [60, 1150], [10, 1040], [-40, 880], [-80, 700], [-120, 520], [-150, 380], [-166, 250], [-166, 126],
];
const CITY: [number, number][] = [...WALL, [PLATFORM.x0, PLATFORM.z1], [PLATFORM.x1, PLATFORM.z1]];

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const gauss = (x: number, z: number, cx: number, cz: number, sx: number, sz: number) =>
  Math.exp(-(((x - cx) / sx) ** 2) - ((z - cz) / sz) ** 2);

// Smooth value noise for the ground's knolls, patches and mottling.
/** Integer hashes of (truncated) lattice coordinates, 0..1. */
function hash2(x: number, y: number) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function hash3(x: number, y: number, z: number) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1440662683)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
/** Fractal value noise, 0..1 (mostly 0.25..0.75). */
function fbm(x: number, y: number, oct = 3) {
  let s = 0;
  let a = 0.5;
  let n = 0;
  for (let o = 0; o < oct; o++) {
    s += vnoise(x, y) * a;
    n += a;
    a *= 0.5;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.7;
  }
  return s / n;
}

/** Ridged fractal noise: sharp crests, broad valleys. 0..1 */
function ridged(x: number, y: number) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < 5; o++) {
    const n = 1 - Math.abs(vnoise(x, y) * 2 - 1);
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    x = x * 2.03 + 5.3;
    y = y * 2.03 + 1.9;
  }
  return sum / norm;
}

function table(t: [number, number][], v: number) {
  if (v <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (v <= t[i][0]) return lerp(t[i - 1][1], t[i][1], (v - t[i - 1][0]) / (t[i][0] - t[i - 1][0]));
  }
  return t[t.length - 1][1];
}

/** Height of the ridge crest north to south. */
const CREST: [number, number][] = [
  [-2000, 50], [-1200, 34], [-600, 8], [-260, -14], [-130, -12], [130, -14], [400, -38], [600, -58],
  [900, -92], [1150, -135], [1350, -200], [2000, -200],
];

/** x of a valley's line at a given z (the valleys run roughly north–south). */
const xTables = new Map<Valley, [number, number][]>();
function valleyX(v: Valley, z: number) {
  let t = xTables.get(v);
  if (!t) xTables.set(v, (t = v.p.map((p) => [p[1], p[0]] as [number, number])));
  return table(t, z);
}

/** Bed height at the nearest point found by the last valleyDist call. */
let nearBed = 0;
/** Each valley's segments as [ax, az, dx, dz, 1/len², ah, dh] runs. */
const segs = new Map<Valley, Float64Array>();
/** Distance to the valley line; sets nearBed. */
function valleyDist(v: Valley, x: number, z: number) {
  let S = segs.get(v);
  if (!S) {
    S = new Float64Array((v.p.length - 1) * 7);
    for (let i = 1; i < v.p.length; i++) {
      const [ax, az, ah] = v.p[i - 1];
      const [bx, bz, bh] = v.p[i];
      S.set([ax, az, bx - ax, bz - az, 1 / ((bx - ax) ** 2 + (bz - az) ** 2), ah, bh - ah], (i - 1) * 7);
    }
    segs.set(v, S);
  }
  let best = Infinity;
  let bed = 0;
  for (let o = 0; o < S.length; o += 7) {
    const px = x - S[o];
    const pz = z - S[o + 1];
    const dx = S[o + 2];
    const dz = S[o + 3];
    let t = (px * dx + pz * dz) * S[o + 4];
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = px - dx * t;
    const ez = pz - dz * t;
    const d = ex * ex + ez * ez;
    if (d < best) {
      best = d;
      bed = S[o + 5] + S[o + 6] * t;
    }
  }
  nearBed = bed;
  return Math.sqrt(best);
}

/** Lowers h toward the valley's bed; d and bed from valleyDist. */
function carve(h: number, v: Valley, x: number, z: number, d: number, bed: number) {
  if (h <= bed) return h;
  const w = v.wEast ? lerp(v.w, v.wEast, smooth(-30, 30, x - valleyX(v, z))) : v.w;
  return bed + (h - bed) * smooth(v.floor, v.floor + w, d);
}

const inRect = (r: Rect, x: number, z: number, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

function inPoly(poly: [number, number][], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function distToPoly(poly: [number, number][], x: number, z: number) {
  let best = Infinity;
  for (let i = 1; i < poly.length; i++) {
    const [ax, az] = poly[i - 1];
    const [bx, bz] = poly[i];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const ex = x - ax - dx * t;
    const ez = z - az - dz * t;
    best = Math.min(best, ex * ex + ez * ez);
  }
  return Math.sqrt(best);
}

/** Distances to the three valleys (and the Kidron's bed) from the last height() call. */
const lastDist = { k: 0, bedK: 0, t: 0, h: 0 };

/** The natural ground (before rounding to the mesh). */
function height(x: number, z: number) {
  const n = ridged(x / 420 + 3.1, z / 420 + 8.4);
  const ridge = table(CREST, z) + 5 * n;
  const west = 30 + 28 * gauss(x, z, -720, 250, 600, 650) + 20 * n;
  const east =
    40 +
    150 * gauss(x, z, 1200, -80, 480, 560) + // the Mount of Olives
    110 * gauss(x, z, 1150, -950, 450, 450) + // its northern shoulder (Scopus)
    80 * gauss(x, z, 1100, 850, 420, 450) + // the southern summit (1 Kgs 11:7; 2 Kgs 23:13)
    22 * n -
    60 * smooth(1500, 2400, x);
  const south = -110 + 130 * gauss(x, z, 250, 2500, 1000, 800) + 16 * n; // the hill south of the Hinnom
  const e = smooth(-40, 40, x - valleyX(KIDRON, z));
  const w = smooth(40, -40, x - valleyX(TYROPOEON, z));
  let h = lerp(lerp(ridge, west, w), east, e);
  h = lerp(h, south, smooth(1300, 1650, z));
  // knolls, hollows and the gullies that score the slopes, kept off the temple mount itself
  const away = smooth(140, 420, Math.sqrt((x - 40) ** 2 + ((z - 200) * 0.7) ** 2));
  const k1 = fbm(x / 150 + 31.7, z / 150 + 12.3, 3) - 0.5;
  const k2 = fbm(x / 46 + 7.1, z / 46 + 3.3, 2) - 0.5;
  const gully = (1 - Math.abs(2 * fbm(x / 300 + 3.3, z / 80 + 9.1, 2) - 1)) ** 8;
  h += away * (20 * k1 + 6 * k2 - (4 + 8 * e) * gully);
  const L = lastDist;
  L.k = valleyDist(KIDRON, x, z);
  L.bedK = nearBed;
  h = carve(h, KIDRON, x, z, L.k, L.bedK);
  L.t = valleyDist(TYROPOEON, x, z);
  h = carve(h, TYROPOEON, x, z, L.t, nearBed);
  L.h = valleyDist(HINNOM, x, z);
  h = carve(h, HINNOM, x, z, L.h, nearBed);
  for (const r of TERRACES) if (inRect(r, x, z, 2)) h = Math.min(h, r.top - 3);
  return h;
}

// ---------------------------------------------------------------------------------------------
// What covers the ground. The same fields colour the terrain and place the trees, scrub and rocks,
// so groves stand on their darker ground and boulders on the pale rock.

const floorDist = (x: number, z: number) =>
  Math.min(valleyDist(KIDRON, x, z) - KIDRON.floor, valleyDist(TYROPOEON, x, z) - TYROPOEON.floor, valleyDist(HINNOM, x, z) - HINNOM.floor);

/** Gardens on the valley floors; the king's garden where the valleys meet (Neh 3:15). */
function wetAt(x: number, z: number, dk = valleyDist(KIDRON, x, z), dt = valleyDist(TYROPOEON, x, z), dh = valleyDist(HINNOM, x, z)) {
  return Math.max(
    (1 - smooth(KIDRON.floor, KIDRON.floor + 70, dk)) * smooth(-120, 400, z),
    (1 - smooth(TYROPOEON.floor, TYROPOEON.floor + 40, dt)) * smooth(900, 1250, z),
    (1 - smooth(HINNOM.floor, HINNOM.floor + 45, dh)) * 0.7,
    gauss(x, z, 470, 1380, 140, 120),
  );
}
/** Olive yards: patchy, thicker on the Mount of Olives. */
function groveAt(x: number, z: number) {
  const east = smooth(0, 120, x - valleyX(KIDRON, z)) * (1 - smooth(1450, 1650, x));
  // ...and across from the courts, where the eye falls first
  const g = fbm(x / 210 + 2.2, z / 210 + 5.1, 4) + 0.07 * east + 0.08 * gauss(x, z, 850, 50, 250, 450);
  return smooth(0.5, 0.6, g);
}
/** Bare limestone: steep slopes, ledges, and a few wide stony tops. */
function rockAt(x: number, z: number, s: number) {
  return Math.min(
    1,
    smooth(0.4, 0.95, s) * smooth(0.54, 0.66, fbm(x / 70 + 40.3, z / 70 + 11.9, 3)) +
      0.25 * smooth(0.62, 0.72, fbm(x / 240 + 5.5, z / 240 + 21.2, 3)),
  );
}
/** Garrigue: thorny scrub and low maquis on the slopes nobody works. */
const scrubAt = (x: number, z: number) => smooth(0.45, 0.6, fbm(x / 110 + 60.1, z / 110 + 3.7, 2));
/** Terraced fields: only on some moderate slopes, never on the bare rock. */
const terrField = (x: number, z: number) => smooth(0.46, 0.58, fbm(x / 320 + 7.7, z / 320 + 1.3, 2));

// ---------------------------------------------------------------------------------------------
// Terrain mesh: a grid that's fine across everything seen from the courts (the Mount of Olives,
// the western hill, the city) and coarsens toward the horizon.

/** Grid lines: evenly `cell` apart over [f0, f1], growing by `grow` per cell out to [lo, hi]. */
function axis(lo: number, hi: number, f0: number, f1: number, cell: number, grow: number) {
  const out: number[] = [];
  const n = Math.round((f1 - f0) / cell);
  for (let i = 0; i <= n; i++) out.push(f0 + ((f1 - f0) * i) / n);
  for (let s = cell, x = f0; x > lo; ) {
    s *= grow;
    x = Math.max(lo, x - s);
    out.unshift(x);
  }
  for (let s = cell, x = f1; x < hi; ) {
    s *= grow;
    x = Math.min(hi, x + s);
    out.push(x);
  }
  return Float32Array.from(out);
}

function seek(a: Float32Array, v: number) {
  let lo = 0;
  let hi = a.length - 1;
  if (v <= a[0]) return 0;
  if (v >= a[hi]) return hi - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (a[m] <= v) lo = m;
    else hi = m;
  }
  return lo;
}

type Terrain = { geo: THREE.BufferGeometry; at: (x: number, z: number) => number; slope: (x: number, z: number) => number };
let terrainCache: Terrain | null = null;

const COL = {
  straw: new THREE.Color('#c8ad7a'),
  grass: new THREE.Color('#c0b072'),
  rossa: new THREE.Color('#bb8761'),
  marl: new THREE.Color('#d9ccad'),
  olive: new THREE.Color('#aaa476'),
  scrub: new THREE.Color('#878a59'),
  grove: new THREE.Color('#938d5e'),
  rock: new THREE.Color('#dbd1ba'),
  green: new THREE.Color('#8ea55f'),
  trodden: new THREE.Color('#b9a27c'),
};

function terrain(): Terrain {
  if (terrainCache) return terrainCache;
  const t0 = performance.now();
  const xs = axis(-2300, 2700, -430, 1520, 14, 1.11);
  const zs = axis(-2250, 2750, -980, 1380, 14, 1.11);
  const NX = xs.length;
  const NZ = zs.length;
  const H = new Float32Array(NX * NZ);
  const DV = new Float32Array(NX * NZ * 4);
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      H[k] = height(xs[i], zs[j]);
      DV[k * 4] = lastDist.k;
      DV[k * 4 + 1] = lastDist.bedK;
      DV[k * 4 + 2] = lastDist.t;
      DV[k * 4 + 3] = lastDist.h;
    }
  }

  const at = (x: number, z: number) => {
    const i = seek(xs, x);
    const j = seek(zs, z);
    const a = Math.min(1, Math.max(0, (x - xs[i]) / (xs[i + 1] - xs[i])));
    const b = Math.min(1, Math.max(0, (z - zs[j]) / (zs[j + 1] - zs[j])));
    const h00 = H[j * NX + i];
    const h10 = H[j * NX + i + 1];
    const h01 = H[(j + 1) * NX + i];
    const h11 = H[(j + 1) * NX + i + 1];
    // same diagonal as the index buffer below
    return a + b <= 1 ? h00 + a * (h10 - h00) + b * (h01 - h00) : h11 + (1 - a) * (h01 - h11) + (1 - b) * (h10 - h11);
  };
  const slope = (x: number, z: number) => {
    const d = 7;
    const a = at(x + d, z) - at(x - d, z);
    const b = at(x, z + d) - at(x, z - d);
    return Math.sqrt(a * a + b * b) / (2 * d);
  };

  const V = NX * NZ;
  const pos = new Float32Array(V * 3);
  const col = new Float32Array(V * 3);
  const aux = new Float32Array(V * 3);
  const c = new THREE.Color();
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      const x = xs[i];
      const z = zs[j];
      const h = H[k];
      pos[k * 3] = x;
      pos[k * 3 + 1] = h;
      pos[k * 3 + 2] = z;
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(NX - 1, i + 1);
      const j0 = Math.max(0, j - 1);
      const j1 = Math.min(NZ - 1, j + 1);
      const gx = (H[j * NX + i1] - H[j * NX + i0]) / (xs[i1] - xs[i0]);
      const gz = (H[j1 * NX + i] - H[j0 * NX + i]) / (zs[j1] - zs[j0]);
      const s = Math.sqrt(gx * gx + gz * gz);
      const city = inPoly(CITY, x, z);
      const onTerrace = inRect(PLATFORM, x, z, 10) || inRect(PALACE_HI, x, z, 10) || inRect(PALACE_LO, x, z, 10);
      const bedK = DV[k * 4 + 1];
      const east = smooth(-40, 120, x - valleyX(KIDRON, z));
      const wet = wetAt(x, z, DV[k * 4], DV[k * 4 + 2], DV[k * 4 + 3]);
      const grove = groveAt(x, z) * (1 - smooth(1.0, 1.3, s)) * (1 - wet);
      const rock = rockAt(x, z, s) * (1 - wet);
      const scrub = scrubAt(x, z) * (1 - grove * 0.7) * (1 - wet);

      c.copy(COL.straw);
      c.lerp(COL.rossa, smooth(0.42, 0.66, fbm(x / 400 + 11.3, z / 400 + 2.7, 2)) * 0.8);
      c.lerp(COL.marl, smooth(0.55, 0.72, fbm(x / 170 + 3.1, z / 170 + 8.8, 2)) * 0.2);
      c.lerp(COL.grass, smooth(0.4, 0.7, vnoise(x / 60 + 1.9, z / 60 + 4.4)) * 0.5);
      c.lerp(COL.olive, east * 0.25);
      // north-facing slopes keep more maquis; scrub mottles everything a little
      const mott = smooth(0.6, 0.8, vnoise(x / 26 + 9.2, z / 26 + 2.4));
      c.lerp(COL.scrub, Math.min(0.9, scrub * 0.75 + smooth(0.05, 0.4, gz) * 0.25 + mott * 0.4));
      c.lerp(COL.grove, grove * 0.6);
      c.lerp(COL.rock, rock * 0.75);
      c.lerp(COL.green, wet * 0.85);
      if (city) c.lerp(COL.trodden, 0.75);
      c.multiplyScalar(0.95 + 0.1 * vnoise(x / 19 + 3.3, z / 19 + 7.7));
      col[k * 3] = c.r;
      col[k * 3 + 1] = c.g;
      col[k * 3 + 2] = c.b;

      const terr =
        smooth(0.05, 0.13, s) * (1 - smooth(0.75, 1.05, s)) * terrField(x, z) * (1 - rock) * (1 - wet) * smooth(8, 30, h - bedK);
      aux[k * 3] = city || onTerrace ? 0 : terr;
      aux[k * 3 + 1] = city ? 0.2 : Math.min(1, scrub + 0.3);
      aux[k * 3 + 2] = city ? 0 : rock;
    }
  }
  const idx = V > 65535 ? new Uint32Array((NX - 1) * (NZ - 1) * 6) : new Uint16Array((NX - 1) * (NZ - 1) * 6);
  let o = 0;
  for (let j = 0; j < NZ - 1; j++) {
    for (let i = 0; i < NX - 1; i++) {
      const p = j * NX + i;
      const q = p + NX;
      idx[o++] = p;
      idx[o++] = q;
      idx[o++] = p + 1;
      idx[o++] = p + 1;
      idx[o++] = q;
      idx[o++] = q + 1;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aux', new THREE.BufferAttribute(aux, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  terrainCache = { geo, at, slope };
  if (DEBUG) console.log(`STAT terrain ${NX}x${NZ} ${(performance.now() - t0).toFixed(0)}ms`);
  return terrainCache;
}

/**
 * A small tiling texture of mottling at a few scales, sampled in world space by the ground shader:
 * r fine mottle, g broad blotches, b specks (stones, tufts), a smooth drift (terrace wobble).
 */
let detailCache: THREE.DataTexture | null = null;
function detailTexture() {
  if (detailCache) return detailCache;
  const S = 128;
  // value noise that wraps every `p` lattice cells
  const pn = (x: number, y: number, p: number, salt: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const h = (a: number, b: number) => hash3(((a % p) + p) % p, ((b % p) + p) % p, salt);
    const a = h(ix, iy);
    const b = h(ix + 1, iy);
    const c = h(ix, iy + 1);
    const d = h(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const pf = (u: number, v: number, p0: number, oct: number, salt: number) => {
    let s = 0;
    let a = 0.5;
    let n = 0;
    for (let o = 0, p = p0; o < oct; o++, p *= 2) {
      s += pn(u * p, v * p, p, salt + o) * a;
      n += a;
      a *= 0.5;
    }
    return s / n;
  };
  const ch = [new Float32Array(S * S), new Float32Array(S * S), new Float32Array(S * S), new Float32Array(S * S)];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const k = y * S + x;
      ch[0][k] = pf(u, v, 8, 3, 1);
      ch[1][k] = pf(u, v, 4, 3, 11);
      ch[2][k] = pf(u, v, 32, 2, 21);
      ch[3][k] = pf(u, v, 4, 2, 31);
    }
  }
  const data = new Uint8Array(S * S * 4);
  ch.forEach((a, c) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of a) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    for (let k = 0; k < a.length; k++) data[k * 4 + c] = Math.round((255 * (a[k] - lo)) / (hi - lo));
  });
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  detailCache = t;
  return t;
}

/**
 * Toon ground with detail: mottling at several scales, specks of scrub and stone, a bump that
 * breaks up the toon bands, and terraces of dry-stone walls that wander off the contours, break
 * off, and vary their crop from one step to the next.
 */
function terrainMaterial() {
  const m = new THREE.MeshToonMaterial({ gradientMap: toonRamp(), vertexColors: true });
  const detail = detailTexture();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.detailMap = { value: detail };
    sh.vertexShader =
      'attribute vec3 aux;\nvarying vec3 vAux;\nvarying vec3 vTW;\n' +
      sh.vertexShader.replace(
        '#include <fog_vertex>',
        `#include <fog_vertex>
        vTW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vAux = aux;`,
      );
    sh.fragmentShader =
      'uniform sampler2D detailMap;\nvarying vec3 vAux;\nvarying vec3 vTW;\n' +
      sh.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec2 gw = vTW.xz;
          vec4 dA = texture2D(detailMap, gw / 41.0);
          vec4 dB = texture2D(detailMap, gw / 187.0 + vec2(0.37, 0.61));
          vec4 dC = texture2D(detailMap, gw / 610.0 + vec2(0.13, 0.29));
          // mottling at three scales
          diffuseColor.rgb *= 0.84 + 0.17 * dA.r + 0.15 * dB.g + 0.08 * dC.r;
          // dark tufts of scrub, pale stones
          float tuft = smoothstep(0.6, 0.74, dA.b) * vAux.y;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.66, 0.71, 0.55), tuft * 0.6);
          float stone = smoothstep(0.62, 0.7, texture2D(detailMap, gw / 17.0 + 0.5).b) * vAux.z;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.89, 0.8), stone * 0.5);
          // terraces
          {
            float wob = (dC.a - 0.5) * 11.0 + (dB.a - 0.5) * 3.0;
            float tq = (vTW.y + wob) / 6.5;
            float tf = fwidth(tq);
            float band = floor(tq);
            float ph = fract(tq);
            vec2 bu = gw / 97.0 + vec2(band * 0.173, band * 0.291);
            vec2 bdx = dFdx(gw / 97.0);
            vec2 bdy = dFdy(gw / 97.0);
            vec4 bn = textureGrad(detailMap, bu, bdx, bdy);
            float keep = smoothstep(0.3, 0.45, bn.g);
            float fade = vAux.x * keep * (1.0 - smoothstep(0.25, 0.6, tf));
            vec3 crop = mix(vec3(1.04, 0.93, 0.84), vec3(0.9, 0.98, 0.8), bn.a);
            diffuseColor.rgb *= mix(vec3(1.0), crop, fade * 0.8);
            diffuseColor.rgb *= 1.0 - 0.14 * smoothstep(0.55, 0.98, ph) * fade;
            float wallLine = 1.0 - smoothstep(0.05, 0.07 + tf * 1.5, ph);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.85, 0.74), wallLine * 0.42 * fade);
          }`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          {
            // bump from the mottling, so the toon bands break up like rough ground
            float bh = (dB.g - 0.5) * 4.0 + (dA.r - 0.5) * 1.2;
            vec3 sx = dFdx(-vViewPosition);
            vec3 sy = dFdy(-vViewPosition);
            vec3 r1 = cross(sy, normal);
            vec3 r2 = cross(normal, sx);
            float det = dot(sx, r1);
            vec3 grad = sign(det) * (dFdx(bh) * r1 + dFdy(bh) * r2);
            normal = normalize(abs(det) * normal - grad);
          }`,
        );
  };
  m.customProgramCacheKey = () => 'temple-terrain-2';
  return m;
}

function Terrain() {
  const { geo } = terrain();
  const mat = useMemo(terrainMaterial, []);
  return <mesh geometry={geo} material={mat} receiveShadow />;
}

// ---------------------------------------------------------------------------------------------
// Built things: merged boxes with vertex colours.

type Box = { x: number; y0: number; y1: number; z: number; w: number; d: number; r?: number; c: string };

function boxesGeometry(list: Box[]) {
  const c = new THREE.Color();
  const parts = list.map((b) => {
    const g = new THREE.BoxGeometry(b.w, b.y1 - b.y0, b.d);
    if (b.r) g.rotateY(b.r);
    g.translate(b.x, (b.y0 + b.y1) / 2, b.z);
    c.set(b.c);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('uv');
    return g;
  });
  return mergeGeometries(parts)!;
}

/** Retaining walls: the courts and the palace stand on built-up terraces of great stones (1 Kgs 7:10). */
function Platforms() {
  const geos = useMemo(
    () =>
      TERRACES.map((r) => {
        const bottom = -160;
        const g = new THREE.BoxGeometry(r.x1 - r.x0, r.top - bottom, r.z1 - r.z0);
        g.translate((r.x0 + r.x1) / 2, (r.top + bottom) / 2, (r.z0 + r.z1) / 2);
        const p = g.attributes.position;
        const nm = g.attributes.normal;
        const uv = g.attributes.uv;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          const y = p.getY(i);
          const z = p.getZ(i);
          if (Math.abs(nm.getY(i)) > 0.5) uv.setXY(i, x / 3000, -z / 3000);
          else uv.setXY(i, (Math.abs(nm.getX(i)) > 0.5 ? z : x) / 12, y / 6);
        }
        return g;
      }),
    [],
  );
  const mats = useMemo(() => {
    const wall = toon('t-terraceWall', { map: tex(terraceWallTexture()) });
    const ground = toon('t-ground', { map: hillGroundTexture() });
    return [wall, wall, ground, wall, wall, wall];
  }, []);
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={mats} receiveShadow />
      ))}
    </group>
  );
}

let seed = 5;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

const STONE = '#ddcca6';
const ROOF = '#bea67e';
const CEDAR = '#7a4c30';

function palaceBoxes(): Box[] {
  const out: Box[] = [];
  const hall = (x0: number, x1: number, z0: number, z1: number, y0: number, h: number, wallC = STONE) => {
    const x = (x0 + x1) / 2;
    const z = (z0 + z1) / 2;
    out.push({ x, z, w: x1 - x0, d: z1 - z0, y0: y0 - 1, y1: y0 + h, c: wallC });
    out.push({ x, z, w: x1 - x0 + 1.2, d: z1 - z0 + 1.2, y0: y0 + h - 2.2, y1: y0 + h - 1.4, c: CEDAR }); // cedar beam course
    out.push({ x, z, w: x1 - x0 + 0.6, d: z1 - z0 + 0.6, y0: y0 + h, y1: y0 + h + 1.2, c: ROOF });
  };
  const hi = PALACE_HI.top;
  const lo = PALACE_LO.top;
  // the king's own house, with an upper storey, and the house for Pharaoh's daughter (1 Kgs 7:8)
  hall(-70, 5, 150, 222, hi, 24);
  hall(-50, -10, 165, 205, hi + 24, 10);
  hall(25, 80, 150, 205, hi, 20);
  // the porch of judgment, the throne hall (1 Kgs 7:7)
  hall(100, 150, 160, 215, hi, 22);
  // the porch of pillars, 50 by 30 (1 Kgs 7:6)
  hall(-40, 10, 320, 350, lo, 20);
  // the house of the forest of Lebanon, 100 long, 50 broad, 30 high (1 Kgs 7:2)
  hall(40, 140, 320, 370, lo, 30);
  // its cedar pillars showing along the open north front (1 Kgs 7:2-3)
  for (let i = 0; i < 15; i++) {
    out.push({ x: 43 + (i * 94) / 14, z: 316, w: 1.6, d: 1.6, y0: lo - 1, y1: lo + 28.8, c: CEDAR });
  }
  out.push({ x: 90, z: 316, w: 102, d: 6, y0: lo + 28.8, y1: lo + 30.4, c: ROOF });
  // the great court about the palace, three courses of hewn stone and a row of cedar (1 Kgs 7:12)
  const court = (x0: number, x1: number, z0: number, z1: number, y: number) => {
    out.push({ x: (x0 + x1) / 2, z: z0, w: x1 - x0, d: 2, y0: y - 1, y1: y + 6, c: STONE });
    out.push({ x: (x0 + x1) / 2, z: z1, w: x1 - x0, d: 2, y0: y - 1, y1: y + 6, c: STONE });
    out.push({ x: x0, z: (z0 + z1) / 2, w: 2, d: z1 - z0, y0: y - 1, y1: y + 6, c: STONE });
    out.push({ x: x1, z: (z0 + z1) / 2, w: 2, d: z1 - z0, y0: y - 1, y1: y + 6, c: STONE });
  };
  court(PALACE_HI.x0 + 4, PALACE_HI.x1 - 4, PALACE_HI.z0 + 6, PALACE_HI.z1 - 2, hi);
  court(PALACE_LO.x0 + 4, PALACE_LO.x1 - 4, PALACE_LO.z0 + 4, PALACE_LO.z1 - 4, lo);
  return out;
}

/**
 * A stone footing round the outside of the great court's wall, from the terrace top up to the
 * wall's foot, so there's no slit under the wall now the terrace sits below the pavement. It stops
 * at the pavement's edge, so nothing lies in the pavement's plane.
 */
function footingBoxes(): Box[] {
  const t = GREAT.wall / 2 + 0.6;
  const y0 = PLATFORM.top - 0.4;
  const y1 = 0;
  const { minX, maxX, minZ, maxZ } = GREAT;
  const c = '#d3c19b';
  return [
    { x: (minX + maxX) / 2, z: minZ - t / 2, w: maxX - minX + 2 * t, d: t, y0, y1, c },
    { x: (minX + maxX) / 2, z: maxZ + t / 2, w: maxX - minX + 2 * t, d: t, y0, y1, c },
    { x: minX - t / 2, z: 0, w: t, d: maxZ - minZ, y0, y1, c },
    { x: maxX + t / 2, z: 0, w: t, d: maxZ - minZ, y0, y1, c },
  ];
}

/** The wall of the City of David with towers, stepping down the slopes. */
function wallBoxes(at: (x: number, z: number) => number): Box[] {
  const out: Box[] = [];
  const WC = '#d6c49d';
  const TC = '#cfbb92';
  for (let s = 1; s < WALL.length; s++) {
    const [ax, az] = WALL[s - 1];
    const [bx, bz] = WALL[s];
    const len = Math.hypot(bx - ax, bz - az);
    const r = -Math.atan2(bz - az, bx - ax);
    const n = Math.ceil(len / 14);
    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 1) / n;
      const hs = [0, 0.5, 1].map((u) => at(ax + (bx - ax) * lerp(t0, t1, u), az + (bz - az) * lerp(t0, t1, u)));
      const top = Math.max(...hs) + 12;
      const x = ax + (bx - ax) * (t0 + t1) * 0.5;
      const z = az + (bz - az) * (t0 + t1) * 0.5;
      out.push({ x, z, w: len / n + 1, d: 6, r, y0: Math.min(...hs) - 8, y1: top, c: WC });
      // battlements
      for (let m = 0; m < 3; m++) {
        const u = lerp(t0, t1, (m + 0.5) / 3);
        out.push({ x: ax + (bx - ax) * u, z: az + (bz - az) * u, w: 2.2, d: 6.4, r, y0: top, y1: top + 2, c: WC });
      }
    }
    // towers at the corners, and midway along long runs
    const towers = s === 1 ? [0, 1] : [1];
    if (len > 170) towers.push(0.5);
    for (const u of towers) {
      if (s === WALL.length - 1 && u === 1) continue; // the platform corner itself
      if (s === 1 && u === 0) continue;
      const x = ax + (bx - ax) * u;
      const z = az + (bz - az) * u;
      const hs = [[-8, -8], [8, -8], [-8, 8], [8, 8]].map(([dx, dz]) => at(x + dx, z + dz));
      const top = Math.max(...hs) + 20;
      out.push({ x, z, w: 17, d: 17, r, y0: Math.min(...hs) - 8, y1: top, c: TC });
      out.push({ x, z, w: 18.5, d: 18.5, r, y0: top, y1: top + 1.4, c: WC });
    }
  }
  return out;
}

function Built() {
  const geo = useMemo(() => {
    const { at } = terrain();
    return boxesGeometry([...palaceBoxes(), ...footingBoxes(), ...wallBoxes(at)]);
  }, []);
  const mat = useMemo(() => toon('t-built', { color: '#ffffff', vertexColors: true }), []);
  return <mesh geometry={geo} material={mat} castShadow receiveShadow />;
}

// ---------------------------------------------------------------------------------------------
// Instanced houses, trees, scrub and rocks. Each kind is one instanced mesh (one draw call), with
// its shape varied per instance by scale, lean and turn, and its colour by instance colour
// multiplying the shading baked into the vertex colours.

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], cols?: THREE.Color[]) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, mats.length));
  m.count = mats.length;
  mats.forEach((x, i) => m.setMatrixAt(i, x));
  cols?.forEach((c, i) => m.setColorAt(i, c));
  m.instanceMatrix.needsUpdate = true;
  m.computeBoundingSphere();
  return m;
}

const UP = new THREE.Vector3(0, 1, 0);

function withColor(g: THREE.BufferGeometry, f: (x: number, y: number, z: number) => [number, number, number]) {
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) col.set(f(p.getX(i), p.getY(i), p.getZ(i)), i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/**
 * A flat-roofed house in a unit box (footprint ±0.5, y 0..1): walls, a parapet round the roof
 * (Deut 22:8), and the roof of beaten earth sunk inside it. 26 triangles.
 */
function houseGeometry() {
  const P: number[] = [];
  const C: number[] = [];
  const quad = (v: number[][], c: number[]) => {
    for (const k of [0, 1, 2, 0, 2, 3]) {
      P.push(...v[k]);
      C.push(...c);
    }
  };
  const o = 0.5;
  const i = 0.44;
  const r = 0.93;
  const K = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
  for (let k = 0; k < 4; k++) {
    const [ax, az] = K[k];
    const [bx, bz] = K[(k + 1) % 4];
    quad([[ax * o, 0, az * o], [bx * o, 0, bz * o], [bx * o, 1, bz * o], [ax * o, 1, az * o]], [1, 1, 1]);
    quad([[ax * o, 1, az * o], [bx * o, 1, bz * o], [bx * i, 1, bz * i], [ax * i, 1, az * i]], [1.05, 1.04, 1.02]);
    quad([[bx * i, r, bz * i], [ax * i, r, az * i], [ax * i, 1, az * i], [bx * i, 1, bz * i]], [0.9, 0.88, 0.86]);
  }
  quad([[-i, r, i], [i, r, i], [i, r, -i], [-i, r, -i]], [0.86, 0.81, 0.74]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.computeVertexNormals();
  return g;
}

type Spot = { x: number; z: number; y: number; k: number };

/**
 * The City of David: houses packed in irregular blocks on the spur, many built round a little
 * courtyard (rooms on two or three sides, a wall with a gate on the fourth), with upper rooms on
 * some roofs (2 Kgs 4:10) and a fig or olive in some yards (Mic 4:4).
 */
let layoutCache: { mats: THREE.Matrix4[]; cols: THREE.Color[]; yard: Spot[] } | null = null;
function cityLayout() {
  if (layoutCache) return layoutCache;
  const { at } = terrain();
  seed = 11;
  const mats: THREE.Matrix4[] = [];
  const cols: THREE.Color[] = [];
  const yard: Spot[] = [];
  const placed = new Map<number, [number, number, number][]>();
  const B = 40;
  const key = (i: number, j: number) => i * 1000 + j;
  const clear = (x: number, z: number, r: number) => {
    const i0 = Math.floor((x - r - 20) / B);
    const j0 = Math.floor((z - r - 20) / B);
    for (let i = i0; i <= Math.floor((x + r + 20) / B); i++) {
      for (let j = j0; j <= Math.floor((z + r + 20) / B); j++) {
        for (const [px, pz, pr] of placed.get(key(i, j)) ?? []) if (Math.sqrt((px - x) ** 2 + (pz - z) ** 2) < pr + r) return false;
      }
    }
    return true;
  };
  const q = new THREE.Quaternion();
  const tones = ['#e2d3b1', '#d9c7a0', '#e8dcc2', '#cfbd98', '#d8c29c', '#cbb691', '#ddd0b4', '#d4bf9e'].map((s) => new THREE.Color(s));
  const ok = (x: number, z: number) => inPoly(CITY, x, z) && distToPoly(WALL, x, z) > 8 && !TERRACES.some((r) => inRect(r, x, z, 6));

  /** A room at (u, v) in the block's frame; returns its roof height. */
  const room = (x: number, z: number, rot: number, u: number, v: number, w: number, d: number, h: number, tone: THREE.Color, floor?: number) => {
    const ca = Math.cos(rot);
    const sa = Math.sin(rot);
    const cx = x + u * ca + v * sa;
    const cz = z - u * sa + v * ca;
    let base: number;
    let top: number;
    if (floor === undefined) {
      const hs = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].map(([a, b]) => {
        const lx = (a * w) / 2;
        const lz = (b * d) / 2;
        return at(cx + lx * ca + lz * sa, cz - lx * sa + lz * ca);
      });
      base = Math.min(...hs) - 2.5;
      top = Math.max(...hs) + h;
    } else {
      base = floor - 1.2;
      top = floor + h;
    }
    q.setFromAxisAngle(UP, rot);
    mats.push(new THREE.Matrix4().compose(new THREE.Vector3(cx, base, cz), q, new THREE.Vector3(w, top - base, d)));
    cols.push(tone.clone().multiplyScalar(0.93 + rnd() * 0.12));
    return top;
  };

  for (let tries = 0; tries < 12000 && mats.length < 1150; tries++) {
    const x = -175 + rnd() * 510;
    const z = 120 + rnd() * 1080;
    if (!ok(x, z)) continue;
    const gx = at(x + 3, z) - at(x - 3, z);
    const gz = at(x, z + 3) - at(x, z - 3);
    const rot = -Math.atan2(gz, gx) + (rnd() - 0.5) * 0.5;
    const ca = Math.cos(rot);
    const sa = Math.sin(rot);
    const court = rnd() < 0.55;
    const W = court ? 15 + rnd() * 13 : 6 + rnd() * 9;
    const D = court ? 13 + rnd() * 9 : 6 + rnd() * 7;
    const rad = Math.hypot(W, D) / 2;
    const gap = 1.2 + rnd() * 2.5;
    if (!clear(x, z, rad + gap)) continue;
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [x + (a * W * ca + b * D * sa) / 2, z + (-a * W * sa + b * D * ca) / 2]);
    if (!corners.every(([cx, cz]) => ok(cx, cz))) continue;
    const bk = key(Math.floor(x / B), Math.floor(z / B));
    if (!placed.has(bk)) placed.set(bk, []);
    placed.get(bk)!.push([x, z, rad]);
    const tone = tones[Math.floor(rnd() * tones.length)];
    const h = 6 + rnd() * 3.5;
    if (court) {
      const t = 4.5 + rnd() * 2.5;
      const backTop = room(x, z, rot, 0, -D / 2 + t / 2, W, t, h + rnd() * 1.5, tone);
      const side = D - t;
      if (rnd() < 0.8) room(x, z, rot, -W / 2 + t / 2, t / 2, t, side, h - rnd() * 1.5, tone);
      if (rnd() < 0.6) room(x, z, rot, W / 2 - (t * 0.9) / 2, t / 2, t * 0.9, side, h - 0.5 - rnd() * 2, tones[Math.floor(rnd() * tones.length)]);
      if (rnd() < 0.3) {
        room(x, z, rot, W * 0.18, D / 2 - t * 0.4, W * 0.55, t * 0.8, h * 0.85, tone);
      } else {
        // the court wall with its gate
        const gw = 3;
        const pw = (W - gw) / 2;
        room(x, z, rot, -(gw + pw) / 2, D / 2 - 0.5, pw, 1, 3.3, tone);
        room(x, z, rot, (gw + pw) / 2, D / 2 - 0.5, pw, 1, 3.3, tone);
      }
      if (rnd() < 0.35) {
        const ou = (rnd() - 0.5) * W * 0.5;
        room(x, z, rot, ou, -D / 2 + t / 2, W * (0.3 + rnd() * 0.15), t * 0.8, 4.6, tones[Math.floor(rnd() * tones.length)], backTop);
      }
      if (rnd() < 0.45) {
        const u = (rnd() - 0.5) * 3;
        const v = t / 2 + (rnd() - 0.5) * 3;
        const yx = x + u * ca + v * sa;
        const yz = z - u * sa + v * ca;
        yard.push({ x: yx, z: yz, y: at(yx, yz), k: 0.45 + rnd() * 0.25 });
      }
    } else {
      const top = room(x, z, rot, 0, 0, W, D, h, tone);
      if (rnd() < 0.45) {
        // an L: a lower wing on one side
        const s = rnd() < 0.5 ? -1 : 1;
        room(x, z, rot, s * (W / 2 + 2.5), D * 0.2, 5, D * 0.6, h - 1.5 - rnd() * 2, tone);
      } else if (rnd() < 0.35) {
        room(x, z, rot, (rnd() - 0.5) * W * 0.3, (rnd() - 0.5) * D * 0.3, W * 0.5, D * 0.5, 4.4, tones[Math.floor(rnd() * tones.length)], top);
      }
    }
  }
  layoutCache = { mats, cols, yard };
  return layoutCache;
}

function Houses() {
  const mesh = useMemo(() => {
    const { mats, cols } = cityLayout();
    return instanced(houseGeometry(), toon('t-house', { color: '#ffffff', vertexColors: true }), mats, cols);
  }, []);
  return <primitive object={mesh} />;
}

/**
 * A lumpy crown from a few lobes, each a low-poly sphere with its vertices pushed in and out.
 * Normals point out of each lobe (and a little up), so the toon bands run round the crown softly
 * instead of facet by facet; vertex colours darken the crown toward its underside.
 */
function lobes(list: number[][], kind: 'ico' | 'oct', amp: number, salt: number, lo = 0.78, hi = 1.08) {
  return list.map(([cx, cy, cz, r, sy = 1], li) => {
    const g = kind === 'ico' ? new THREE.IcosahedronGeometry(1, 0) : new THREE.OctahedronGeometry(1, 0);
    g.deleteAttribute('uv');
    const p = g.attributes.position;
    const nm = g.attributes.normal;
    const col = new Float32Array(p.count * 3);
    const lv = 0.92 + 0.16 * hash3(li, salt, 17);
    const n = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const dx = p.getX(i);
      const dy = p.getY(i);
      const dz = p.getZ(i);
      const j = 1 + amp * (2 * hash3(Math.round(dx * 100) + li * 7, Math.round(dy * 100) + salt, Math.round(dz * 100)) - 1);
      p.setXYZ(i, cx + dx * r * j, cy + dy * r * j * sy, cz + dz * r * j);
      n.set(dx, dy / sy + 0.3, dz).normalize();
      nm.setXYZ(i, n.x, n.y, n.z);
      const s = lerp(lo, hi, (dy + 1) / 2) * lv;
      col.set([s * 1.01, s, s * 0.96], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
}

/** A trunk or bough: an open four-sided prism from a to b, its vertex colour relative to the crown's. */
function limb(a: number[], b: number[], r0: number, r1: number, c: [number, number, number]) {
  const va = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(va);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 4, 1, true).toNonIndexed();
  g.deleteAttribute('uv');
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate(va.x, va.y, va.z);
  return withColor(g, () => c);
}

const BARK: [number, number, number] = [0.62, 0.52, 0.5];

/** Olive: a short leaning trunk under a broad, flattened, lumpy crown. 68 triangles. */
function oliveGeometry() {
  return mergeGeometries([
    limb([0, 0, 0], [0.7, 2.6, 0.35], 0.6, 0.35, BARK),
    ...lobes(
      [
        [0, 4.3, 0, 3.4, 0.62],
        [2.4, 3.7, 1.1, 2.5, 0.66],
        [-2.0, 3.9, -1.3, 2.7, 0.6],
      ],
      'ico',
      0.22,
      3,
    ),
  ])!;
}

/** Terebinth, oak or fig: a sturdier trunk and a rounder, taller crown. */
function broadleafGeometry() {
  return mergeGeometries([
    limb([0, 0, 0], [0.3, 3.4, 0.2], 0.75, 0.45, BARK),
    ...lobes(
      [
        [0.2, 6.4, 0, 4.2, 0.8],
        [2.9, 5.4, 1.4, 3.1, 0.82],
        [-2.5, 5.6, -1.5, 3.3, 0.8],
      ],
      'ico',
      0.2,
      9,
      0.74,
      1.08,
    ),
  ])!;
}

/** Cypress: a dark, slightly ragged spindle. */
function cypressGeometry() {
  const prof = [[0.3, 0], [1.1, 1.0], [1.45, 3.6], [1.3, 7.5], [0.9, 11.0], [0.4, 13.8], [0.02, 15.2]].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(prof, 5).toNonIndexed();
  g.deleteAttribute('uv');
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const j = 1 + 0.3 * (hash3(Math.round(x * 50), Math.round(y * 50), Math.round(z * 50)) - 0.5);
    p.setXYZ(i, x * j, y, z * j);
  }
  return withColor(g, (_x, y) => {
    const s = lerp(0.8, 1.08, y / 15);
    return [s, s, s * 0.97];
  });
}

/** A low bush of thorny scrub. 8 triangles. */
function scrubGeometry() {
  return mergeGeometries(
    lobes(
      [
        [0, 0.55, 0, 1.5, 0.6],
      ],
      'oct',
      0.25,
      5,
      0.8,
      1.06,
    ),
  )!;
}

/**
 * A patch of olive grove for the further slopes: eight crowns, some run together, on a local
 * ground plane that the instance matrix shears to the slope. 64 triangles.
 */
function clumpGeometry() {
  return mergeGeometries(
    lobes(
      [
        [0, 3.6, 0, 5.2, 0.62],
        [10.5, 3.2, 3, 4.5, 0.65],
        [-9.5, 3.3, -2.5, 4.8, 0.6],
        [3, 3.0, -10.5, 4.2, 0.66],
        [-4, 3.1, 10, 4.5, 0.62],
        [13, 2.8, -9, 3.8, 0.7],
        [-13.5, 2.9, 8, 4.0, 0.66],
        [6, 2.8, 13, 3.6, 0.7],
      ],
      'oct',
      0.2,
      13,
      0.74,
      1.06,
    ),
  )!;
}

/** A boulder: a craggy, flat-faceted lump. */
function rockGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 0);
  g.deleteAttribute('uv');
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const j = 1 + 0.32 * (2 * hash3(Math.round(x * 100), Math.round(y * 100), Math.round(z * 100) + 4) - 1);
    p.setXYZ(i, x * j * 1.15, y * j * 0.7, z * j);
  }
  g.computeVertexNormals();
  return withColor(g, (_x, y) => {
    const s = lerp(0.8, 1.05, (y + 0.7) / 1.4);
    return [s, s, s];
  });
}

/** Jittered-grid sampling: calls f once at a random point in each cell. */
function grid(cell: number, x0: number, x1: number, z0: number, z1: number, s: number, f: (x: number, z: number) => void) {
  seed = s;
  for (let z = z0; z < z1; z += cell) for (let x = x0; x < x1; x += cell) f(x + rnd() * cell, z + rnd() * cell);
}

/** Keeps the n with the highest priority. */
function cap(a: Plant[], n: number) {
  return a.length <= n ? a : a.sort((p, q) => q.pri - p.pri).slice(0, n);
}

const blocked = (x: number, z: number, m: number) =>
  TERRACES.some((r) => inRect(r, x, z, m)) || inPoly(CITY, x, z) || distToPoly(WALL, x, z) < m;

/** Where the courts look out from. */
const VIEW = { x: 60, z: 150 };
const viewDist = (x: number, z: number) => Math.sqrt((x - VIEW.x) ** 2 + (z - VIEW.z) ** 2);

/**
 * Roughly how much the courts see of the ground here, 0..1: most of all the west face of the
 * Mount of Olives across the Kidron; little behind its crest or out in the fog.
 */
function seen(x: number, z: number) {
  const d = viewDist(x, z);
  if (x > 1520) return 0.15 * (1 - smooth(1700, 2400, d));
  const olivet = x - valleyX(KIDRON, z) > 15 ? 1 - 0.45 * smooth(500, 1300, Math.abs(z - VIEW.z)) : 0;
  return Math.max(olivet, 0.7 - 0.5 * smooth(800, 1900, d));
}

/** tilt: the ground's gradient [dh/dx, dh/dz]; when given, the plant's local xz plane is sheared onto the slope. */
type Plant = { x: number; y: number; z: number; s: number; sy: number; sxz: number; lean: number; c: THREE.Color; pri: number; tilt?: [number, number] };

function plantMatrices(list: Plant[]) {
  const e = new THREE.Euler();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const T = new THREE.Vector3();
  const U = new THREE.Vector3();
  const X = new THREE.Vector3();
  const Z = new THREE.Vector3();
  const mats = list.map((p) => {
    const yaw = hash2(p.x * 37, p.z * 71) * Math.PI * 2;
    if (p.tilt) {
      const [gx, gz] = p.tilt;
      const gl = Math.max(1e-4, Math.sqrt(gx * gx + gz * gz));
      T.set(-gz / gl, 0, gx / gl); // along the contour
      U.set(-gx / gl, -gl, -gz / gl); // down the slope, so (T, up, U) stays right-handed
      X.copy(T).multiplyScalar(Math.cos(yaw)).addScaledVector(U, Math.sin(yaw)).multiplyScalar(p.s * p.sxz);
      Z.copy(U).multiplyScalar(Math.cos(yaw)).addScaledVector(T, -Math.sin(yaw)).multiplyScalar(p.s / p.sxz);
      return new THREE.Matrix4().makeBasis(X, sc.set(0, p.s * p.sy, 0), Z).setPosition(p.x, p.y, p.z);
    }
    const ld = hash2(p.z * 53 + 7, p.x * 29) * Math.PI * 2;
    e.set(p.lean * Math.cos(ld), yaw, p.lean * Math.sin(ld), 'YXZ');
    q.setFromEuler(e);
    v.set(p.x, p.y, p.z);
    sc.set(p.s * p.sxz, p.s * p.sy, p.s / p.sxz);
    return new THREE.Matrix4().compose(v, q, sc);
  });
  return { mats, cols: list.map((p) => p.c) };
}

/** A colour between a and b, a little lighter or darker. */
const tone = (a: THREE.Color, b: THREE.Color, t: number, v: number) => a.clone().lerp(b, t).multiplyScalar(v);

function Vegetation() {
  const meshes = useMemo(() => {
    const t0 = performance.now();
    const { at, slope } = terrain();
    const yardTrees = cityLayout().yard;
    const olives: Plant[] = [];
    const clumps: Plant[] = [];
    const broad: Plant[] = [];
    const cypress: Plant[] = [];
    const scrub: Plant[] = [];
    const rocks: Plant[] = [];

    const OLIVE = [new THREE.Color('#76835a'), new THREE.Color('#a3a985')]; // dark to silvery
    const CLUMP = [new THREE.Color('#6e7a52'), new THREE.Color('#8f9670')];
    const TEREB = [new THREE.Color('#5f7440'), new THREE.Color('#7c8c4e')];
    const FIG = [new THREE.Color('#6a8c45'), new THREE.Color('#86a257')];
    const CYP = [new THREE.Color('#33482f'), new THREE.Color('#4a6140')];
    const SCRUB = [new THREE.Color('#6f7448'), new THREE.Color('#a29e78')];
    const ROCK = [new THREE.Color('#bdb39e'), new THREE.Color('#e6dcc6')];

    // Olive yards: individual trees wherever they're seen from the courts, thickest on the Mount of Olives.
    const olivetFace = (x: number, z: number) => x > 700 && x - valleyX(KIDRON, z) > 15;
    const nearRegion = (x: number, z: number) => viewDist(x, z) < 1000 && !olivetFace(x, z);
    grid(12, -950, 860, -900, 1200, 77, (x, z) => {
      if (!nearRegion(x, z)) return;
      const g = groveAt(x, z);
      const p = smooth(0.62, 0.85, g) * 0.97 + 0.01;
      if (rnd() > p) return;
      if (blocked(x, z, 14) || slope(x, z) > 1.2 || floorDist(x, z) < 10) return;
      const big = rnd() < 0.08 ? 1.35 : 1;
      olives.push({
        x,
        z,
        y: at(x, z) - 0.3,
        s: (0.9 + rnd() * 0.55) * big,
        sy: 0.85 + rnd() * 0.3,
        sxz: 0.85 + rnd() * 0.3,
        lean: rnd() * 0.18,
        c: tone(OLIVE[0], OLIVE[1], rnd() ** 1.5, 0.9 + rnd() * 0.18),
        pri: seen(x, z) + rnd() * 0.3,
      });
    });
    // Clumps of trees on the far slopes and in the hearts of the biggest groves.
    grid(30, -2300, 2700, -2250, 2750, 41, (x, z) => {
      if (viewDist(x, z) > 2500 || nearRegion(x, z)) return;
      if (!(olivetFace(x, z) && x < 1520) && rnd() < 0.25) return; // sparser off the face
      const p = smooth(0.35, 0.75, groveAt(x, z)) * 0.95;
      if (rnd() > p) return;
      if (blocked(x, z, 20) || floorDist(x, z) < 12 || slope(x, z) > 1.2) return;
      clumps.push({
        x,
        z,
        y: at(x, z) - 0.6,
        s: 0.8 + rnd() * 0.45,
        sy: 0.8 + rnd() * 0.4,
        sxz: 0.8 + rnd() * 0.4,
        lean: 0,
        tilt: [(at(x + 8, z) - at(x - 8, z)) / 16, (at(x, z + 8) - at(x, z - 8)) / 16],
        c: tone(CLUMP[0], CLUMP[1], rnd(), 0.9 + rnd() * 0.15),
        pri: seen(x, z) + rnd() * 0.2,
      });
    });
    // Terebinths and oaks, alone or in twos and threes, on the hills (Isa 41:19; Hos 4:13).
    grid(70, -1300, 1550, -1400, 1800, 61, (x, z) => {
      if (rnd() > 0.07) return;
      const n = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const px = x + (rnd() - 0.5) * 30;
        const pz = z + (rnd() - 0.5) * 30;
        if (blocked(px, pz, 14) || floorDist(px, pz) < 10 || slope(px, pz) > 1) continue;
        broad.push({ x: px, z: pz, y: at(px, pz) - 0.3, s: 0.8 + rnd() * 0.6, sy: 0.85 + rnd() * 0.3, sxz: 0.85 + rnd() * 0.3, lean: rnd() * 0.1, c: tone(TEREB[0], TEREB[1], rnd(), 0.92 + rnd() * 0.14), pri: seen(px, pz) + rnd() * 0.5 });
      }
    });
    // Figs and pomegranates in the gardens on the valley floors (Neh 3:15; Song 6:11).
    grid(17, -1200, 800, -400, 1700, 31, (x, z) => {
      const w = wetAt(x, z);
      if (rnd() > w * 0.2) return;
      if (blocked(x, z, 12)) return;
      broad.push({ x, z, y: at(x, z) - 0.3, s: 0.5 + rnd() * 0.3, sy: 0.75 + rnd() * 0.2, sxz: 0.8 + rnd() * 0.4, lean: rnd() * 0.12, c: tone(FIG[0], FIG[1], rnd(), 0.92 + rnd() * 0.14), pri: seen(x, z) + rnd() * 0.5 });
    });
    for (const p of yardTrees) {
      broad.push({ x: p.x, z: p.z, y: p.y - 0.3, s: p.k, sy: 0.9, sxz: 0.9 + rnd() * 0.2, lean: rnd() * 0.1, c: tone(FIG[0], OLIVE[1], rnd() * 0.6, 0.95), pri: 2 });
    }
    // Cypresses in small dark knots: by the palace, below the city, here and there on the hills.
    grid(80, -1200, 1450, -1200, 1700, 53, (x, z) => {
      const near = viewDist(x, z) < 700 ? 0.25 : 0.07;
      if (rnd() > near) return;
      const n = 1 + Math.floor(rnd() * 4);
      for (let k = 0; k < n; k++) {
        const px = x + (rnd() - 0.5) * 22;
        const pz = z + (rnd() - 0.5) * 22;
        if (blocked(px, pz, 12) || slope(px, pz) > 1) continue;
        cypress.push({ x: px, z: pz, y: at(px, pz) - 0.5, s: 0.85 + rnd() * 0.65, sy: 0.85 + rnd() * 0.45, sxz: 0.9 + rnd() * 0.2, lean: rnd() * 0.05, c: tone(CYP[0], CYP[1], rnd(), 0.9 + rnd() * 0.2), pri: seen(px, pz) + rnd() * 0.5 });
      }
    });
    // Scrub on the rough slopes, between the groves and among the rocks.
    grid(19, -1150, 1560, -1300, 1650, 97, (x, z) => {
      if (viewDist(x, z) > 1700) return;
      const s = slope(x, z);
      const p = scrubAt(x, z) * 0.5 + rockAt(x, z, s) * 0.25 + 0.02;
      if (rnd() > p) return;
      if (blocked(x, z, 10) || wetAt(x, z) > 0.5) return;
      scrub.push({ x, z, y: at(x, z) - 0.2, s: 0.7 + rnd() * 1.1, sy: 0.7 + rnd() * 0.6, sxz: 0.7 + rnd() * 0.6, lean: rnd() * 0.15, c: tone(SCRUB[0], SCRUB[1], rnd(), 0.9 + rnd() * 0.15), pri: seen(x, z) + rnd() * 0.4 });
    });
    // Outcrops of limestone: knots of boulders on the bare rock, and strays.
    grid(36, -1150, 1560, -1300, 1650, 23, (x, z) => {
      if (viewDist(x, z) > 1600) return;
      const s = slope(x, z);
      const r = rockAt(x, z, s);
      if (rnd() > r * 0.5 + 0.02) return;
      const n = 1 + Math.floor(rnd() * (1 + r * 6));
      for (let k = 0; k < n; k++) {
        const px = x + (rnd() - 0.5) * 18;
        const pz = z + (rnd() - 0.5) * 18;
        if (blocked(px, pz, 8) || wetAt(px, pz) > 0.4) continue;
        const sz = 0.8 + rnd() * rnd() * 4.5;
        rocks.push({ x: px, z: pz, y: at(px, pz) - sz * 0.25, s: sz, sy: 0.6 + rnd() * 0.6, sxz: 0.7 + rnd() * 0.6, lean: rnd() * 0.4, c: tone(ROCK[0], ROCK[1], rnd(), 0.95 + rnd() * 0.08), pri: seen(px, pz) + rnd() * 0.4 });
      }
    });

    const counts = { olives: olives.length, clumps: clumps.length, broad: broad.length, cypress: cypress.length, scrub: scrub.length, rocks: rocks.length };
    const foliage = toon('t-foliage', { color: '#ffffff', vertexColors: true });
    const stone = toon('t-boulder', { color: '#ffffff', vertexColors: true });
    const build = (geo: THREE.BufferGeometry, mat: THREE.Material, list: Plant[], n: number) => {
      const { mats, cols } = plantMatrices(cap(list, n));
      return instanced(geo, mat, mats, cols);
    };
    const out = [
      build(oliveGeometry(), foliage, olives, 900),
      build(clumpGeometry(), foliage, clumps, 960),
      build(broadleafGeometry(), foliage, broad, 260),
      build(cypressGeometry(), foliage, cypress, 220),
      build(scrubGeometry(), foliage, scrub, 1500),
      build(rockGeometry(), stone, rocks, 800),
    ];
    if (DEBUG) console.log(`STAT vegetation ${JSON.stringify(counts)} ${(performance.now() - t0).toFixed(0)}ms`);
    return out;
  }, []);
  return (
    <group>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
}

/** ?debug: expose the scene so screenshots can be rendered from an overview camera. */
function DebugHook() {
  const { scene, camera, gl } = useThree();
  useEffect(() => {
    if (DEBUG) (window as unknown as Record<string, unknown>).__templeView = { scene, camera, gl, THREE };
  }, [scene, camera, gl]);
  return null;
}

export function TempleWorld() {
  return (
    <>
      <SkyDome />
      <fog attach="fog" args={['#ecdcbf', 380, 2400]} />
      <hemisphereLight args={['#a9b6e8', '#c49460', 1.05]} />
      {/* morning sun from the east-southeast, over the Mount of Olives */}
      <directionalLight
        position={[240, 160, 135]}
        intensity={2.5}
        color="#ffdcae"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-camera-near={50}
        shadow-camera-far={800}
        shadow-bias={-0.0006}
        shadow-normalBias={0.06}
      />
      <Wind />
      <group name="landscape">
        <Platforms />
        <Terrain />
        <Built />
        <Houses />
        <Vegetation />
      </group>
      {DEBUG && <DebugHook />}
    </>
  );
}
