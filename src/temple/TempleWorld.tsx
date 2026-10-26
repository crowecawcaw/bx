import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SkyDome, Wind, ridged } from '../scene/Environment';
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

const PLATFORM: Rect = { x0: GREAT.minX - 8, x1: GREAT.maxX + 8, z0: GREAT.minZ - 8, z1: GREAT.maxZ + 8, top: 0 };
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
function valleyX(v: Valley, z: number) {
  return table(v.p.map((p) => [p[1], p[0]] as [number, number]), z);
}

/** Distance to the valley line and the bed height at the nearest point. */
function valleyNear(v: Valley, x: number, z: number): [number, number] {
  let best = Infinity;
  let bed = 0;
  for (let i = 1; i < v.p.length; i++) {
    const [ax, az, ah] = v.p[i - 1];
    const [bx, bz, bh] = v.p[i];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) {
      best = d;
      bed = ah + (bh - ah) * t;
    }
  }
  return [best, bed];
}

function carve(h: number, v: Valley, x: number, z: number) {
  const [d, bed] = valleyNear(v, x, z);
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
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

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
  h = carve(h, KIDRON, x, z);
  h = carve(h, TYROPOEON, x, z);
  h = carve(h, HINNOM, x, z);
  for (const r of TERRACES) if (inRect(r, x, z, 2)) h = Math.min(h, r.top - 3);
  return h;
}

// ---------------------------------------------------------------------------------------------
// Terrain mesh: a grid that's fine near the temple and coarse toward the horizon.

const N = 160;
const CX = 200;
const CZ = 250;
const WA = 720; // cell ≈ 9 cubits at the centre
const WB = 1780; // reaches ±2500
const warp = (u: number) => WA * u + WB * u * u * u;
function unwarp(v: number) {
  let lo = -1;
  let hi = 1;
  for (let k = 0; k < 40; k++) {
    const m = (lo + hi) / 2;
    if (warp(m) < v) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

type Terrain = { geo: THREE.BufferGeometry; at: (x: number, z: number) => number; slope: (x: number, z: number) => number };
let terrainCache: Terrain | null = null;

const COL = {
  dry: new THREE.Color('#cdb489'),
  rossa: new THREE.Color('#c0916a'),
  lime: new THREE.Color('#e3d8bf'),
  scrub: new THREE.Color('#9c9a68'),
  green: new THREE.Color('#8ea55f'),
  olive: new THREE.Color('#aaa476'),
  trodden: new THREE.Color('#b8a07a'),
  grove: new THREE.Color('#a39b66'),
};

function terrain(): Terrain {
  if (terrainCache) return terrainCache;
  const V = N + 1;
  const xs = new Float32Array(V);
  const zs = new Float32Array(V);
  for (let i = 0; i < V; i++) {
    xs[i] = CX + warp(-1 + (2 * i) / N);
    zs[i] = CZ + warp(-1 + (2 * i) / N);
  }
  const H = new Float32Array(V * V);
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) H[j * V + i] = height(xs[i], zs[j]);

  const at = (x: number, z: number) => {
    const fu = ((unwarp(x - CX) + 1) * N) / 2;
    const fv = ((unwarp(z - CZ) + 1) * N) / 2;
    const i = Math.min(N - 1, Math.max(0, Math.floor(fu)));
    const j = Math.min(N - 1, Math.max(0, Math.floor(fv)));
    const a = (x - xs[i]) / (xs[i + 1] - xs[i]);
    const b = (z - zs[j]) / (zs[j + 1] - zs[j]);
    const h00 = H[j * V + i];
    const h10 = H[j * V + i + 1];
    const h01 = H[(j + 1) * V + i];
    const h11 = H[(j + 1) * V + i + 1];
    // same diagonal as the index buffer below
    return a + b <= 1 ? h00 + a * (h10 - h00) + b * (h01 - h00) : h11 + (1 - a) * (h01 - h11) + (1 - b) * (h10 - h11);
  };
  const slope = (x: number, z: number) => {
    const d = 4;
    return Math.hypot(height(x + d, z) - height(x - d, z), height(x, z + d) - height(x, z - d)) / (2 * d);
  };

  const pos = new Float32Array(V * V * 3);
  const col = new Float32Array(V * V * 3);
  const terr = new Float32Array(V * V);
  const c = new THREE.Color();
  for (let j = 0; j < V; j++) {
    for (let i = 0; i < V; i++) {
      const k = j * V + i;
      const x = xs[i];
      const z = zs[j];
      const h = H[k];
      pos.set([x, h, z], k * 3);
      const s = slope(x, z);
      const n1 = ridged(x / 180 + 11.3, z / 180 + 2.7);
      const n2 = ridged(x / 70 + 5.1, z / 70 + 9.9);
      const city = inPoly(CITY, x, z);
      const onTerrace = TERRACES.some((r) => inRect(r, x, z, 10));
      const [dk, bedK] = valleyNear(KIDRON, x, z);
      const [dt] = valleyNear(TYROPOEON, x, z);
      const [dh] = valleyNear(HINNOM, x, z);
      const e = smooth(-40, 120, x - valleyX(KIDRON, z));

      c.copy(COL.dry).lerp(COL.rossa, smooth(0.35, 0.8, n1) * 0.8);
      c.lerp(COL.olive, e * 0.45);
      // dark scrub on the steeper unworked slopes
      c.lerp(COL.scrub, smooth(0.35, 0.7, s) * smooth(0.3, 0.6, n2) * 0.8);
      // bare limestone where it's steep
      c.lerp(COL.lime, smooth(0.75, 1.4, s) * smooth(0.45, 0.75, n2));
      // olive yards (the same patches the trees are scattered by)
      c.lerp(COL.grove, smooth(0.35, 0.55, ridged(x / 160 + 2.2, z / 160 + 2.2 * 1.7)) * (0.35 + 0.35 * e) * (city ? 0 : 1));
      // gardens on the valley floors; the king's garden where the valleys meet (Neh 3:15)
      const wet = Math.max(
        (1 - smooth(KIDRON.floor, KIDRON.floor + 70, dk)) * smooth(-120, 400, z),
        (1 - smooth(TYROPOEON.floor, TYROPOEON.floor + 40, dt)) * smooth(900, 1250, z),
        (1 - smooth(HINNOM.floor, HINNOM.floor + 45, dh)) * 0.7,
        gauss(x, z, 470, 1380, 140, 120),
      );
      c.lerp(COL.green, wet * 0.85);
      if (city) c.lerp(COL.trodden, 0.75);
      col.set([c.r, c.g, c.b], k * 3);

      const t =
        smooth(0.05, 0.12, s) *
        (1 - smooth(0.8, 1.1, s)) *
        smooth(0.38, 0.52, ridged(x / 260 + 7.7, z / 260 + 1.3)) *
        (1 - wet) *
        smooth(8, 30, h - bedK);
      terr[k] = city || onTerrace ? 0 : t;
    }
  }
  const idx = new Uint32Array(N * N * 6);
  let o = 0;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const p = j * V + i;
      const q = p + V;
      idx.set([p, q, p + 1, p + 1, q, q + 1], o);
      o += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('terr', new THREE.BufferAttribute(terr, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  terrainCache = { geo, at, slope };
  return terrainCache;
}

/** Toon ground with terraces: pale dry-stone walls along the contours, drawn in the shader. */
function terrainMaterial() {
  const m = new THREE.MeshToonMaterial({ gradientMap: toonRamp(), vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader =
      'attribute float terr;\nvarying float vTerr;\nvarying vec3 vTW;\n' +
      sh.vertexShader.replace(
        '#include <fog_vertex>',
        `#include <fog_vertex>
        vTW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vTerr = terr;`,
      );
    sh.fragmentShader =
      'varying float vTerr;\nvarying vec3 vTW;\n' +
      sh.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float tq = vTW.y / 6.0 + 0.35 * sin(vTW.x * 0.021 + vTW.z * 0.017);
          float tf = fwidth(tq);
          float fade = vTerr * (1.0 - smoothstep(0.35, 0.8, tf));
          float ph = fract(tq);
          float wallLine = 1.0 - smoothstep(0.07, 0.07 + tf * 1.5, ph);
          diffuseColor.rgb *= 1.0 - 0.16 * smoothstep(0.45, 0.98, ph) * fade;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.88, 0.78), wallLine * 0.5 * fade);
        }`,
      );
  };
  m.customProgramCacheKey = () => 'temple-terrain';
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
    return boxesGeometry([...palaceBoxes(), ...wallBoxes(at)]);
  }, []);
  const mat = useMemo(() => toon('t-built', { color: '#ffffff', vertexColors: true }), []);
  return <mesh geometry={geo} material={mat} castShadow receiveShadow />;
}

// ---------------------------------------------------------------------------------------------
// Instanced houses and trees.

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

/** Flat-roofed stone houses packed on the terraces of the City of David, stepping down the spur. */
function Houses() {
  const meshes = useMemo(() => {
    const { at } = terrain();
    seed = 11;
    const walls: THREE.Matrix4[] = [];
    const wallC: THREE.Color[] = [];
    const roofs: THREE.Matrix4[] = [];
    const roofC: THREE.Color[] = [];
    const placed: [number, number, number][] = [];
    const q = new THREE.Quaternion();
    const tones = ['#e0cfa9', '#d8c49c', '#e6d9bd', '#cdb893', '#d9c8a6'].map((s) => new THREE.Color(s));
    const roofTones = ['#b9a07a', '#c4ab84', '#a99372', '#c9b38c'].map((s) => new THREE.Color(s));
    for (let tries = 0; tries < 20000 && walls.length < 680; tries++) {
      const x = -175 + rnd() * 510;
      const z = 120 + rnd() * 1080;
      if (!inPoly(CITY, x, z) || distToPoly(WALL, x, z) < 9) continue;
      if (TERRACES.some((r) => inRect(r, x, z, 8))) continue;
      const w = 7 + rnd() * 7;
      const d = 7 + rnd() * 7;
      const rad = Math.max(w, d) * 0.5;
      if (placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + rad + 1.5)) continue;
      placed.push([x, z, rad]);
      // face along the contour
      const gx = at(x + 3, z) - at(x - 3, z);
      const gz = at(x, z + 3) - at(x, z - 3);
      const rot = -Math.atan2(gz, gx) + (rnd() - 0.5) * 0.3;
      const ca = Math.cos(rot);
      const sa = Math.sin(rot);
      const hs = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].map(([u, v]) => {
        const lx = (u * w) / 2;
        const lz = (v * d) / 2;
        return at(x + lx * ca + lz * sa, z - lx * sa + lz * ca);
      });
      const base = Math.min(...hs) - 3;
      const top = Math.max(...hs) + 6 + rnd() * 3;
      q.setFromAxisAngle(UP, rot);
      walls.push(new THREE.Matrix4().compose(new THREE.Vector3(x, (base + top) / 2, z), q, new THREE.Vector3(w, top - base, d)));
      wallC.push(tones[Math.floor(rnd() * tones.length)]);
      roofs.push(new THREE.Matrix4().compose(new THREE.Vector3(x, top + 0.3, z), q, new THREE.Vector3(w + 0.6, 0.7, d + 0.6)));
      roofC.push(roofTones[Math.floor(rnd() * roofTones.length)]);
      // an upper room on some roofs (2 Kgs 4:10)
      if (rnd() < 0.3) {
        const ox = (rnd() < 0.5 ? -1 : 1) * w * 0.22;
        walls.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(x + ox * ca, top + 2.4, z - ox * sa),
            q,
            new THREE.Vector3(w * 0.45, 4.8, d * 0.55),
          ),
        );
        wallC.push(tones[Math.floor(rnd() * tones.length)]);
        roofs.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(x + ox * ca, top + 5, z - ox * sa),
            q,
            new THREE.Vector3(w * 0.45 + 0.5, 0.5, d * 0.55 + 0.5),
          ),
        );
        roofC.push(roofTones[Math.floor(rnd() * roofTones.length)]);
      }
    }
    const box = new THREE.BoxGeometry(1, 1, 1);
    return [
      instanced(box, toon('t-houseWall', { color: '#ffffff' }), walls, wallC),
      instanced(box, toon('t-houseTop', { color: '#ffffff' }), roofs, roofC),
    ];
  }, []);
  return (
    <group>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
}

type Spot = { x: number; z: number; y: number; k: number };

/** Rejection-samples spots by a density function, standing them on the drawn ground. */
function scatter(n: number, s: number, x0: number, x1: number, z0: number, z1: number, dens: (x: number, z: number, y: number) => number) {
  const { at } = terrain();
  seed = s;
  const out: Spot[] = [];
  for (let tries = 0; tries < n * 60 && out.length < n; tries++) {
    const x = x0 + rnd() * (x1 - x0);
    const z = z0 + rnd() * (z1 - z0);
    if (TERRACES.some((r) => inRect(r, x, z, 14))) continue;
    if (inPoly(CITY, x, z) || distToPoly(WALL, x, z) < 14) continue;
    const y = at(x, z);
    if (rnd() < dens(x, z, y)) out.push({ x, z, y, k: 0.8 + rnd() * 0.5 });
  }
  return out;
}

function treeMatrices(spots: Spot[], scale: number, yOff: number, squash = 1) {
  const q = new THREE.Quaternion();
  return spots.map((p) => {
    q.setFromAxisAngle(UP, (p.x * 13.1 + p.z * 7.7) % 6.28);
    const k = p.k * scale;
    return new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y + yOff * k, p.z), q, new THREE.Vector3(k, k * squash, k));
  });
}

function tint(spots: Spot[], base: string, spread: number) {
  const c = new THREE.Color(base);
  return spots.map((p) => {
    const v = 1 + (((p.x * 3.7 + p.z * 1.3) % 1) - 0.5) * spread;
    return c.clone().multiplyScalar(v);
  });
}

function Trees() {
  const meshes = useMemo(() => {
    const { slope } = terrain();
    const patch = (x: number, z: number, f: number, o: number) => ridged(x / f + o, z / f + o * 1.7);
    const kidronSide = (x: number, z: number) => x - valleyX(KIDRON, z);
    const notFloor = (x: number, z: number) => {
      const [dk] = valleyNear(KIDRON, x, z);
      const [dt] = valleyNear(TYROPOEON, x, z);
      const [dh] = valleyNear(HINNOM, x, z);
      return Math.min(dk - KIDRON.floor, dt - TYROPOEON.floor, dh - HINNOM.floor) > 12;
    };

    // olive yards: thick on the Mount of Olives, patchy on the western hill and to the north
    const olives = scatter(1000, 77, -1500, 1650, -1500, 2300, (x, z) => {
      if (!notFloor(x, z)) return 0;
      const s = slope(x, z);
      if (s > 0.9) return 0;
      const groves = smooth(0.35, 0.55, patch(x, z, 160, 2.2));
      const east = kidronSide(x, z) > 40 && x < 1550 ? 1 : 0.4;
      const far = 1 - smooth(1700, 2300, Math.hypot(x - 40, z));
      return groves * east * far;
    });
    // fig and pomegranate in the gardens on the valley floors (Neh 3:15; Song 6:11)
    const figs = scatter(240, 31, -1200, 800, -400, 1700, (x, z) => {
      const [dk] = valleyNear(KIDRON, x, z);
      const [dt] = valleyNear(TYROPOEON, x, z);
      const [dh] = valleyNear(HINNOM, x, z);
      const kidron = (1 - smooth(10, 70, dk)) * smooth(0, 400, z);
      const tyro = (1 - smooth(6, 40, dt)) * smooth(900, 1200, z);
      const hinnom = (1 - smooth(8, 50, dh)) * 0.6;
      return Math.max(kidron, tyro, hinnom, gauss(x, z, 470, 1380, 160, 140));
    });
    // tall cypress and the odd great terebinth or oak (Isa 41:19; Hos 4:13)
    const cypress = scatter(90, 53, -1200, 1400, -1200, 1700, (x, z) => (notFloor(x, z) ? 0.25 + 0.5 * patch(x, z, 300, 4.1) : 0.15));
    const terebinth = scatter(80, 61, -1300, 1500, -1400, 1800, (x, z) => (notFloor(x, z) && slope(x, z) < 0.5 ? 0.4 : 0));
    // dry scrub on the rocky slopes
    const scrub = scatter(850, 97, -1400, 1600, -1400, 1900, (x, z) => {
      const s = slope(x, z);
      return smooth(0.25, 0.6, s) * smooth(0.3, 0.5, patch(x, z, 90, 6.6));
    });

    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.45, 3, 5, 1, true).translate(0, 1.5, 0);
    const oliveCrown = mergeGeometries([
      new THREE.IcosahedronGeometry(2.1, 0).translate(0, 3.9, 0),
      new THREE.IcosahedronGeometry(1.6, 0).translate(1.4, 3.4, 0.6),
    ])!;
    const figCrown = new THREE.IcosahedronGeometry(2.3, 0).scale(1, 0.75, 1).translate(0, 3.6, 0);
    const cypressGeo = new THREE.ConeGeometry(1.1, 10, 7, 1, true).translate(0, 6, 0);
    const tereCrown = mergeGeometries([
      new THREE.IcosahedronGeometry(3.2, 0).translate(0, 5.6, 0),
      new THREE.IcosahedronGeometry(2.4, 0).translate(2.2, 5, -1),
    ])!;
    const scrubGeo = new THREE.OctahedronGeometry(1, 0).scale(1.3, 0.8, 1.3);

    const trunkMat = toon('t-oliveTrunk', { color: '#6e5a44' });
    const leaf = toon('t-treeLeaf', { color: '#ffffff' });
    const allTrunks = [
      ...treeMatrices(olives, 2.5, 0),
      ...treeMatrices(figs, 2, 0),
      ...treeMatrices(terebinth, 2.8, 0),
      ...treeMatrices(cypress, 2, 0),
    ];
    return [
      instanced(trunkGeo, trunkMat, allTrunks),
      instanced(oliveCrown, leaf, treeMatrices(olives, 2.5, 0), tint(olives, '#8f9d6c', 0.18)),
      instanced(figCrown, leaf, treeMatrices(figs, 2, 0), tint(figs, '#6f914f', 0.2)),
      instanced(tereCrown, leaf, treeMatrices(terebinth, 2.8, 0), tint(terebinth, '#7b8f55', 0.15)),
      instanced(cypressGeo, leaf, treeMatrices(cypress, 2, 0), tint(cypress, '#556f45', 0.15)),
      instanced(scrubGeo, leaf, treeMatrices(scrub, 1.8, 0.3), tint(scrub, '#8f8e5c', 0.25)),
    ];
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
      <Platforms />
      <Terrain />
      <Built />
      <Houses />
      <Trees />
      {DEBUG && <DebugHook />}
    </>
  );
}
