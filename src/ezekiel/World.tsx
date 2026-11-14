import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { SkyDome, Wind } from '../scene/Environment';
import { DEBUG } from '../scene/dims';
import { TOON, toon } from '../scene/materials';
import { SkyLight } from '../scene/Sky';
import {
  axis,
  broadleafGeometry,
  fbm,
  houseGeometry,
  instanced,
  oliveGeometry,
  plantMatrices,
  ridged,
  rockGeometry,
  scrubGeometry,
  seek,
  smooth,
  terrainMaterial,
  tone,
  vnoise,
  type Plant,
} from '../temple/TempleWorld';
import { ribbon, resample, water } from './Altar';
import { RIVER_PATH, WALL } from './dims';

/*
 * "In the visions of God brought he me into the land of Israel, and set me upon a very high mountain,
 * by which was as the frame of a city on the south" (40:2).
 *
 * The house stands on a flat summit. The ground falls away on every side; the river runs out from the
 * east gate and down the long eastern slope toward the sea, growing as it goes (47:3-5), with trees on
 * both its banks (47:7, 12). South, far below, lies the city with its twelve gates (48:30-35).
 *
 * Distances in the land are compressed, as for Jerusalem, so the city and the sea fit inside the fog:
 * Ezekiel's city is 4,500 measures square (48:16) and lies some miles from the sanctuary.
 */

/** The flat summit: just room to walk round the wall. */
const PLATEAU = 330;
/** The city: drawn smaller and nearer than its 4,500 measures, with three gates on each side (48:30-34). */
const CITY = { x: 0, z: 1900, half: 520, y: -560, wall: 10 };
const SEA_Y = -700;

/** The river beyond the wall: down the east slope, meandering, toward the sea (47:8). */
const RIVER_OUT: [number, number][] = [
  [WALL.half + 8, 4],
  [300, 5],
  [360, 12],
  [470, 8],
  [620, -12],
  [820, -8],
  [1050, 22],
  [1330, 12],
  [1650, -26],
  [2000, -6],
  [2400, 18],
  [2900, 4],
];

/** Breadth of the river by its distance from the gate: to the ankles, the knees, the loins, then a river to swim in (47:3-5). */
function riverWidth(s: number) {
  const T: [number, number][] = [
    [0, 0.9],
    [60, 2.5],
    [1000, 10],
    [2000, 22],
    [3000, 48],
    [3600, 100],
  ];
  for (let i = 1; i < T.length; i++) {
    if (s <= T[i][0]) return T[i - 1][1] + ((T[i][1] - T[i - 1][1]) * (s - T[i - 1][0])) / (T[i][0] - T[i - 1][0]);
  }
  return T[T.length - 1][1];
}

/** The mountain without the river cut into it. */
function landHeight(x: number, z: number) {
  // squarish near the summit (the walkable strip round the wall is flat), rounder further down
  const sq = Math.max(Math.abs(x), Math.abs(z)) * 0.8 + Math.hypot(x, z) * 0.2;
  // a square summit, its edge wandering a little, falling away steeply and then more gently
  const d = sq + (fbm(x / 140 + 8.1, z / 140 + 2.2, 2) - 0.5) * 40 * smooth(PLATEAU - 4, PLATEAU + 60, sq);
  const t = Math.max(0, d - PLATEAU);
  const tt = (t * t) / (t + 25);
  let h = -650 * (1 - Math.exp(-tt / 420));
  const rough = smooth(PLATEAU + 5, 420, d);
  h += (ridged(x / 650 + 3.1, z / 650 + 7.7) - 0.4) * 140 * rough;
  h += (fbm(x / 170 + 1.3, z / 170 + 4.1, 3) - 0.5) * 34 * rough;
  // the long eastern slope down to the sea
  h -= 200 * smooth(1700, 2700, x) * (1 - smooth(1600, 2600, Math.abs(z)));
  // the city's ground, levelled
  const dc = Math.max(Math.abs(x - CITY.x), Math.abs(z - CITY.z));
  h += (CITY.y - h) * (1 - smooth(CITY.half, CITY.half + 260, dc));
  return h;
}

type RiverPt = { x: number; z: number; s: number; y: number; w: number };
let riverCache: RiverPt[] | null = null;
/** The river's course every 6 cubits, with its distance from the gate, its surface and its breadth. */
function riverPoints() {
  if (riverCache) return riverCache;
  const pts = resample(RIVER_OUT, 6);
  let s = 0;
  let y = 0;
  riverCache = pts.map(([x, z], i) => {
    if (i) s += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
    const w = riverWidth(s);
    // always running downhill, a little below the banks
    const ground = Math.min(landHeight(x, z), landHeight(x, z + w / 2), landHeight(x, z - w / 2)) - (x > PLATEAU ? 0.6 + w * 0.06 : 0);
    y = i ? Math.min(y - 0.02, ground) : 0.06;
    return { x, z, s, y, w };
  });
  return riverCache;
}

/** Distance to the river's course and the nearest point on it. */
function nearRiver(x: number, z: number) {
  const pts = riverPoints();
  let best = Infinity;
  let at = pts[0];
  // a coarse search, then nothing finer: the points are 6 apart
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) {
      best = d;
      at = p;
    }
  }
  return { d: Math.sqrt(best), p: at };
}

function height(x: number, z: number) {
  const h = landHeight(x, z);
  if (x < WALL.half) return h;
  const { d, p } = nearRiver(x, z);
  const bank = 24 + p.w * 1.2;
  if (d > p.w / 2 + 8 + bank) return h;
  const bed = p.y - 0.4 - Math.min(6, p.w * 0.08);
  // a trough at least a grid cell broad, so the ground's coarse mesh never covers the water
  return bed + (Math.max(h, p.y + 0.5) - bed) * smooth(p.w / 2 + 8, p.w / 2 + 8 + bank, d);
}

const COL = {
  straw: new THREE.Color('#c9ae7c'),
  rossa: new THREE.Color('#bb8761'),
  marl: new THREE.Color('#dacdae'),
  scrub: new THREE.Color('#888a5a'),
  rock: new THREE.Color('#c9b896'),
  green: new THREE.Color('#7fa055'),
  deep: new THREE.Color('#5e8a44'),
  trodden: new THREE.Color('#bba57f'),
};

type Terrain = { geo: THREE.BufferGeometry; at: (x: number, z: number) => number; slope: (x: number, z: number) => number; wet: (x: number, z: number) => number };
let terrainCache: Terrain | null = null;

/** How much the river waters the ground here, 0..1: everything lives where it comes (47:9). */
function wetness(x: number, z: number) {
  if (x < WALL.half) return 0;
  const { d, p } = nearRiver(x, z);
  return 1 - smooth(p.w / 2 + 10, p.w / 2 + 70 + p.w, d);
}

function terrain(): Terrain {
  if (terrainCache) return terrainCache;
  const xs = axis(-3200, 3600, -520, 560, 14, 1.11);
  const zs = axis(-3200, 3400, -520, 520, 14, 1.11);
  const NX = xs.length;
  const NZ = zs.length;
  const Hs = new Float32Array(NX * NZ);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) Hs[j * NX + i] = height(xs[i], zs[j]);
  const at = (x: number, z: number) => {
    const i = seek(xs, x);
    const j = seek(zs, z);
    const a = Math.min(1, Math.max(0, (x - xs[i]) / (xs[i + 1] - xs[i])));
    const b = Math.min(1, Math.max(0, (z - zs[j]) / (zs[j + 1] - zs[j])));
    const h00 = Hs[j * NX + i];
    const h10 = Hs[j * NX + i + 1];
    const h01 = Hs[(j + 1) * NX + i];
    const h11 = Hs[(j + 1) * NX + i + 1];
    return a + b <= 1 ? h00 + a * (h10 - h00) + b * (h01 - h00) : h11 + (1 - a) * (h01 - h11) + (1 - b) * (h10 - h11);
  };
  const slope = (x: number, z: number) => {
    const d = 7;
    return Math.hypot(at(x + d, z) - at(x - d, z), at(x, z + d) - at(x, z - d)) / (2 * d);
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
      pos.set([x, Hs[k], z], k * 3);
      const s = slope(x, z);
      const wet = wetness(x, z);
      const rock = smooth(0.35, 0.9, s) * (1 - wet);
      const scrub = smooth(0.45, 0.62, fbm(x / 110 + 60.1, z / 110 + 3.7, 2)) * (1 - wet);
      c.copy(COL.straw);
      c.lerp(COL.rossa, smooth(0.42, 0.66, fbm(x / 400 + 11.3, z / 400 + 2.7, 2)) * 0.7);
      c.lerp(COL.marl, smooth(0.55, 0.72, fbm(x / 170 + 3.1, z / 170 + 8.8, 2)) * 0.3);
      c.lerp(COL.scrub, scrub * 0.6);
      c.lerp(COL.rock, rock * 0.75);
      c.lerp(COL.green, wet * 0.85);
      c.lerp(COL.deep, smooth(0.6, 1, wet) * 0.5);
      const dc = Math.max(Math.abs(x - CITY.x), Math.abs(z - CITY.z));
      if (dc < CITY.half) c.lerp(COL.trodden, 0.7);
      c.multiplyScalar(0.95 + 0.1 * vnoise(x / 19 + 3.3, z / 19 + 7.7));
      col.set([c.r, c.g, c.b], k * 3);
      aux.set([0, Math.min(1, scrub + 0.3), rock], k * 3);
    }
  }
  const idx = new Uint32Array((NX - 1) * (NZ - 1) * 6);
  let o = 0;
  for (let j = 0; j < NZ - 1; j++) {
    for (let i = 0; i < NX - 1; i++) {
      const p = j * NX + i;
      const q = p + NX;
      idx.set([p, q, p + 1, p + 1, q, q + 1], o);
      o += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aux', new THREE.BufferAttribute(aux, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  terrainCache = { geo, at, slope, wet: wetness };
  return terrainCache;
}

function Terrain() {
  const { geo } = terrain();
  const mat = useMemo(terrainMaterial, []);
  return <mesh geometry={geo} material={mat} receiveShadow />;
}

/** The river from the east gate down to the sea. */
function River() {
  const geo = useMemo(() => {
    const pts = riverPoints().map((p) => ({ x: p.x, z: p.z, y: p.y + 0.05, w: p.w }));
    return ribbon(pts, 6);
  }, []);
  const mat = water();
  return <mesh geometry={geo} material={mat} receiveShadow />;
}

/** The sea, healed (47:8-10). */
function Sea() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5f8f99', roughness: 0.15, metalness: 0.1 }), []);
  return (
    <mesh position={[4000, SEA_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <planeGeometry args={[5000, 9000]} />
    </mesh>
  );
}

let seed = 9;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

/** "Very many trees on the one side and on the other" (47:7), and scrub and rock on the dry slopes. */
function Vegetation() {
  const meshes = useMemo(() => {
    const { at, slope } = terrain();
    seed = 9;
    const trees: Plant[] = [];
    const olives: Plant[] = [];
    const scrub: Plant[] = [];
    const rocks: Plant[] = [];
    const FRUIT = [new THREE.Color('#4f7a36'), new THREE.Color('#7da44a')];
    const OLIVE = [new THREE.Color('#76835a'), new THREE.Color('#a3a985')];
    const SCRUB = [new THREE.Color('#6f7448'), new THREE.Color('#a29e78')];
    const ROCK = [new THREE.Color('#bdb39e'), new THREE.Color('#e6dcc6')];
    // the trees along the river, thicker as it grows
    for (const p of riverPoints()) {
      if (p.s < 130) continue;
      const n = p.s < 400 ? 1 : 2;
      for (let k = 0; k < n; k++) {
        for (const side of [1, -1]) {
          if (rnd() > 0.75) continue;
          const off = p.w / 2 + 3 + rnd() * (14 + p.w * 0.6);
          const x = p.x + (rnd() - 0.5) * 6;
          const z = p.z + side * off;
          trees.push({ x, z, y: at(x, z) - 0.4, s: 1.1 + rnd() * 0.7, sy: 0.9 + rnd() * 0.4, sxz: 0.85 + rnd() * 0.3, lean: rnd() * 0.12, c: tone(FRUIT[0], FRUIT[1], rnd(), 0.9 + rnd() * 0.2), pri: 0 });
        }
      }
    }
    // olive yards round the city, scrub and rocks on the slopes
    for (let z = -2600; z < 2800; z += 22) {
      for (let x = -2600; x < 3000; x += 22) {
        const px = x + rnd() * 22;
        const pz = z + rnd() * 22;
        if (Math.max(Math.abs(px), Math.abs(pz)) * 0.8 + Math.hypot(px, pz) * 0.2 < PLATEAU + 30) continue;
        const dc = Math.max(Math.abs(px - CITY.x), Math.abs(pz - CITY.z));
        if (dc < CITY.half + 20) continue;
        const r = rnd();
        const s = slope(px, pz);
        if (dc < CITY.half + 300 && r < 0.35 && s < 0.6) {
          olives.push({ x: px, z: pz, y: at(px, pz) - 0.3, s: 1 + rnd() * 0.5, sy: 0.85 + rnd() * 0.3, sxz: 0.85 + rnd() * 0.3, lean: rnd() * 0.15, c: tone(OLIVE[0], OLIVE[1], rnd(), 0.9 + rnd() * 0.18), pri: 0 });
        } else if (r < 0.07 + 0.12 * smooth(0.45, 0.6, fbm(px / 110 + 60.1, pz / 110 + 3.7, 2))) {
          scrub.push({ x: px, z: pz, y: at(px, pz) - 0.2, s: 0.8 + rnd(), sy: 0.7 + rnd() * 0.6, sxz: 0.7 + rnd() * 0.6, lean: rnd() * 0.15, c: tone(SCRUB[0], SCRUB[1], rnd(), 0.9 + rnd() * 0.15), pri: 0 });
        } else if (r > 0.97 - 0.1 * smooth(0.4, 0.9, s)) {
          const sz = 0.8 + rnd() * rnd() * 5;
          rocks.push({ x: px, z: pz, y: at(px, pz) - sz * 0.25, s: sz, sy: 0.6 + rnd() * 0.6, sxz: 0.7 + rnd() * 0.6, lean: rnd() * 0.4, c: tone(ROCK[0], ROCK[1], rnd(), 0.95 + rnd() * 0.08), pri: 0 });
        }
      }
    }
    const foliage = toon('t-foliage', { color: '#ffffff', vertexColors: true });
    const stone = toon('t-boulder', { color: '#ffffff', vertexColors: true });
    const build = (geo: THREE.BufferGeometry, mat: THREE.Material, list: Plant[], n: number) => {
      const { mats, cols } = plantMatrices(list.slice(0, n));
      return instanced(geo, mat, mats, cols);
    };
    return [
      build(broadleafGeometry(), foliage, trees, 1600),
      build(oliveGeometry(), foliage, olives, 900),
      build(scrubGeometry(), foliage, scrub, 1400),
      build(rockGeometry(), stone, rocks, 700),
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

/** The city, foursquare, with three gates on each side named for the tribes (48:30-35). */
function City() {
  const parts = useMemo(() => {
    const boxes: THREE.BufferGeometry[] = [];
    const { x: cx, z: cz, half, y, wall } = CITY;
    const add = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
      const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      g.deleteAttribute('uv');
      boxes.push(g.toNonIndexed());
    };
    const H = 22;
    for (const s of [1, -1]) {
      add(cx - half, cx + half, y - 4, y + H, cz + s * half - wall / 2, cz + s * half + wall / 2);
      add(cx + s * half - wall / 2, cx + s * half + wall / 2, y - 4, y + H, cz - half, cz + half);
    }
    // the twelve gates: a pair of towers each
    for (const t of [-half / 2, 0, half / 2]) {
      for (const s of [1, -1]) {
        for (const o of [-14, 14]) {
          add(cx + t + o - 7, cx + t + o + 7, y - 4, y + H + 12, cz + s * half - 9, cz + s * half + 9);
          add(cx + s * half - 9, cx + s * half + 9, y - 4, y + H + 12, cz + t + o - 7, cz + t + o + 7);
        }
      }
    }
    const walls = new THREE.BufferGeometry();
    const merged = boxes.map((b) => b.attributes.position.array as Float32Array);
    const n = merged.reduce((a, b) => a + b.length, 0);
    const pos = new Float32Array(n);
    let o = 0;
    for (const a of merged) {
      pos.set(a, o);
      o += a.length;
    }
    walls.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    walls.computeVertexNormals();
    // houses in blocks, with streets between
    const mats: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];
    seed = 41;
    const tones = ['#e3d4b4', '#d9c7a1', '#cdb88f', '#e8dcc2'].map((t) => new THREE.Color(t));
    for (let bz = cz - half + 30; bz < cz + half - 30; bz += 46) {
      for (let bx = cx - half + 30; bx < cx + half - 30; bx += 46) {
        if (Math.abs(bx - cx) < 40 && Math.abs(bz - cz) < 40) continue; // an open place in the midst
        for (let k = 0; k < 5; k++) {
          const w = 8 + rnd() * 8;
          const d = 8 + rnd() * 8;
          const h = 7 + rnd() * 7;
          const x = bx + (rnd() - 0.5) * 24;
          const z = bz + (rnd() - 0.5) * 24;
          mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y - 0.5, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)));
          cols.push(tones[Math.floor(rnd() * tones.length)].clone().multiplyScalar(0.92 + rnd() * 0.12));
        }
      }
    }
    const houses = instanced(houseGeometry(), toon('t-house', { color: '#ffffff', vertexColors: true }), mats, cols);
    return { walls, houses };
  }, []);
  const mat = useMemo(() => toon('e-cityWall', { color: '#dccaa4' }), []);
  return (
    <group>
      <mesh geometry={parts.walls} material={mat} receiveShadow />
      <primitive object={parts.houses} />
    </group>
  );
}

function Flow() {
  // the river's ripples drift downstream (the stream in the courts shares the material)
  useFrame((_, dt) => {
    const m = water().map;
    if (m) m.offset.y -= dt * 0.12;
  });
  return null;
}

/** ?debug: expose the scene so screenshots can be rendered from an overview camera. */
function DebugHook() {
  const { scene, camera, gl } = useThree();
  useEffect(() => {
    if (DEBUG) (window as unknown as Record<string, unknown>).__templeView = { scene, camera, gl, THREE };
  }, [scene, camera, gl]);
  return null;
}

export function EzekielWorld() {
  return (
    <>
      {TOON ? <SkyDome /> : <SkyLight sun={[240, 160, 135]} haze="#ecdcbf" ground="#c09a68" light={0.45} />}
      <fog attach="fog" args={['#ecdcbf', 420, 2900]} />
      <hemisphereLight args={['#a9b6e8', '#c49460', TOON ? 1.05 : 0.45]} />
      {/* morning sun from the east-southeast */}
      <directionalLight
        position={[240, 160, 135]}
        intensity={TOON ? 2.5 : 3.1}
        color="#ffdcae"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-bottom={-300}
        shadow-camera-near={10}
        shadow-camera-far={1000}
        shadow-bias={-0.0006}
        shadow-normalBias={0.06}
      />
      <Wind />
      <Flow />
      <group name="landscape">
        <Terrain />
        <River />
        <Sea />
        <City />
        <Vegetation />
      </group>
      {DEBUG && <DebugHook />}
    </>
  );
}

/** For the map: the river's course outside the wall. */
export const RIVER_COURSE = RIVER_OUT;
export { RIVER_PATH };
