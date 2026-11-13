import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bronze, toon } from '../scene/materials';
import { useStore } from '../store';
import { templeMaterials } from '../temple/House';
import { Mason, worldUV } from '../temple/mason';
import { bronzeDoorTexture, cedarTexture, pavementTexture, tex } from '../temple/textures';
import {
  ANTONIA,
  AZARAH,
  CHEL,
  COLUMN_R,
  DUCHAN,
  GATE,
  MOUNT,
  MOUNT_GATES,
  NICANOR,
  NICANOR_R,
  PORTICO,
  PRIESTS_X,
  SOREG,
  SOREG_GAPS_X,
  STOA,
  WOMEN,
  WOMEN_SIDE_X,
  Y,
  columns,
} from './dims';

/** Hewn stone, a little whiter than Solomon's limestone, for Herod's courts. */
export function secondMaterials() {
  const t = templeMaterials();
  const st = t.stone as THREE.MeshStandardMaterial;
  return {
    stone: t.stone,
    white: toon('s-white', { map: st.map ?? undefined, bumpMap: st.bumpMap ?? undefined, bumpScale: 0.6, emissive: '#4c463c', emissiveIntensity: 0.32 }),
    gold: t.gold,
    ceiling: t.ceiling,
    cedar: toon('s-cedarCeiling', { map: tex(cedarTexture()) }),
    roof: toon('s-roof', { color: '#d7c9ad' }),
  };
}

/** x of the three gates in each of the court's north and south walls. */
const AZARAH_GATES_X = [-60, -10, 40];

const TILES: Record<string, [number, number]> = { stone: [8, 3], white: [8, 3], cedar: [2, 6], roof: [6, 6], gold: [3, 3] };

/** A floor: a horizontal plane of pavement, UVs one tile per 6 cubits. */
function floorGeometry(x0: number, x1: number, z0: number, z1: number, y: number) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 6, -p.getZ(i) / 6);
  return g;
}

/** Walls along x or z from a to b, leaving gaps. */
function wallRun(m: Mason, key: string, axis: 'x' | 'z', a: number, b: number, y0: number, y1: number, t0: number, t1: number, gaps: [number, number][] = []) {
  m.wall(key, axis, a, b, y0, y1, t0, t1, gaps.map(([g0, g1]): [number, number, number, number] => [g0, g1, y0 - 1, y0 + GATE.height]));
}

/** A gatehouse: piers either side of the opening rising above the wall, and a lintel over it. */
function gateHouse(m: Mason, key: string, axis: 'x' | 'z', mid: number, y0: number, top: number, t0: number, t1: number) {
  const h = GATE.half;
  const along = (a: number, b: number, ya: number, yb: number, ta: number, tb: number) =>
    axis === 'x' ? m.box(key, a, b, ya, yb, ta, tb) : m.box(key, ta, tb, ya, yb, a, b);
  along(mid - h - 4, mid - h, y0, top, t0 - 1, t1 + 1);
  along(mid + h, mid + h + 4, y0, top, t0 - 1, t1 + 1);
  along(mid - h, mid + h, y0 + GATE.height, top, t0 - 1, t1 + 1);
  along(mid - h - 4.4, mid + h + 4.4, top, top + 1, t0 - 1.4, t1 + 1.4);
}

function buildCourts() {
  const m = new Mason(TILES);
  const A = AZARAH;
  const W = WOMEN;
  const aw = A.wall;
  const ww = W.wall;
  const aTop = Y.priests + A.height;
  const wTop = Y.women + W.height;

  // the raised court: a solid block from the chel up to its floor, and its walls round about
  m.box('stone', A.minX - aw, PRIESTS_X, Y.women - 0.5, Y.priests, -A.half - aw, A.half + aw);
  m.box('stone', PRIESTS_X, A.maxX + aw, Y.women - 0.5, Y.israel, -A.half - aw, A.half + aw); // under the Court of Israel
  // the north and south walls, each with three gates (Middot 1:4), shown shut
  const sideGates = AZARAH_GATES_X.map((x): [number, number, number, number] => [x - GATE.half, x + GATE.half, Y.priests, Y.priests + GATE.height]);
  m.wall('stone', 'x', A.minX - aw, A.maxX + aw, Y.women, aTop, -A.half - aw, -A.half, sideGates);
  m.wall('stone', 'x', A.minX - aw, A.maxX + aw, Y.women, aTop, A.half, A.half + aw, sideGates);
  m.box('stone', A.minX - aw, A.minX, Y.women, aTop, -A.half, A.half);
  // the east wall, with the Nicanor gate, and a gatehouse above the court's walls
  m.wall('stone', 'z', -A.half, A.half, Y.israel, aTop, A.maxX, A.maxX + aw, [[-GATE.half, GATE.half, Y.israel - 1, Y.israel + GATE.height]]);
  gateHouse(m, 'white', 'z', 0, Y.israel, aTop + 8, A.maxX, A.maxX + aw);
  for (const s of [1, -1]) {
    for (const x of AZARAH_GATES_X) gateHouse(m, 'white', 'x', x, Y.priests, aTop + 5, s > 0 ? A.half : -A.half - aw, s > 0 ? A.half + aw : -A.half);
  }
  // a coping
  m.box('white', A.minX - aw - 0.4, A.maxX + aw + 0.4, aTop, aTop + 0.8, -A.half - aw - 0.4, -A.half + 0.4);
  m.box('white', A.minX - aw - 0.4, A.maxX + aw + 0.4, aTop, aTop + 0.8, A.half - 0.4, A.half + aw + 0.4);
  m.box('white', A.minX - aw - 0.4, A.minX + 0.4, aTop, aTop + 0.8, -A.half, A.half);
  m.box('white', A.maxX - 0.4, A.maxX + aw + 0.4, aTop, aTop + 0.8, -A.half, A.half);

  // the step up to the Court of the Priests, five half-cubit steps (Middot 2:6)
  for (let i = 0; i < 5; i++) {
    const x1 = PRIESTS_X + DUCHAN - (i * DUCHAN) / 5;
    m.box('white', PRIESTS_X, x1, Y.israel, Y.israel + (i + 1) * 0.5, -A.half, A.half);
  }

  // the Court of the Women: walls with gates east, north and south, and its four corner chambers
  const side: [number, number][] = [[WOMEN_SIDE_X - GATE.half, WOMEN_SIDE_X + GATE.half]];
  wallRun(m, 'stone', 'x', W.minX, W.maxX + ww, Y.women, wTop, -W.half - ww, -W.half, side);
  wallRun(m, 'stone', 'x', W.minX, W.maxX + ww, Y.women, wTop, W.half, W.half + ww, side);
  wallRun(m, 'stone', 'z', -W.half, W.half, Y.women, wTop, W.maxX, W.maxX + ww, [[-GATE.half, GATE.half]]);
  gateHouse(m, 'white', 'z', 0, Y.women, wTop + 6, W.maxX, W.maxX + ww);
  for (const s of [1, -1]) gateHouse(m, 'white', 'x', WOMEN_SIDE_X, Y.women, wTop + 3, s > 0 ? W.half : -W.half - ww, s > 0 ? W.half + ww : -W.half);
  m.box('white', W.minX, W.maxX + ww + 0.4, wTop, wTop + 0.8, -W.half - ww - 0.4, -W.half + 0.4);
  m.box('white', W.minX, W.maxX + ww + 0.4, wTop, wTop + 0.8, W.half - 0.4, W.half + ww + 0.4);
  m.box('white', W.maxX - 0.4, W.maxX + ww + 0.4, wTop, wTop + 0.8, -W.half, W.half);
  const C = W.corner;
  const ch = 12;
  for (const x0 of [W.minX, W.maxX - C]) {
    for (const z0 of [-W.half, W.half - C]) {
      const xIn = x0 === W.minX ? x0 + C : x0; // the side facing into the court
      const zIn = z0 < 0 ? z0 + C : z0;
      // two inner walls, each with a doorway, and a cornice; unroofed (Middot 2:5)
      m.wall('stone', 'z', z0, z0 + C, Y.women, Y.women + ch, xIn - 0.75, xIn + 0.75, [[z0 + C / 2 - 2, z0 + C / 2 + 2, Y.women - 1, Y.women + 7]]);
      m.wall('stone', 'x', x0, x0 + C, Y.women, Y.women + ch, zIn - 0.75, zIn + 0.75, [[x0 + C / 2 - 2, x0 + C / 2 + 2, Y.women - 1, Y.women + 7]]);
      m.box('white', xIn - 1.1, xIn + 1.1, Y.women + ch, Y.women + ch + 0.6, z0, z0 + C);
      m.box('white', x0, x0 + C, Y.women + ch, Y.women + ch + 0.6, zIn - 1.1, zIn + 1.1);
    }
  }

  // the fifteen steps, round about the Nicanor gate (Middot 2:5)
  const rise = (Y.israel - Y.women) / NICANOR.n;
  const stepParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < NICANOR.n; i++) {
    const r = NICANOR_R - i * NICANOR.tread;
    const g = new THREE.CylinderGeometry(r, r, rise, 48, 1, false, 0, Math.PI);
    g.translate(0, Y.women + rise * (i + 0.5), 0);
    g.rotateY(0); // the half facing east (+x)
    stepParts.push(g);
  }
  const steps = mergeGeometries(stepParts.map((g) => g.toNonIndexed()))!;
  steps.translate(NICANOR.x, 0, 0);
  worldUV(steps, [8, 3]);

  // the chel and its twelve steps down to the soreg, all round (Middot 2:3)
  const n = CHEL.steps;
  for (let i = 0; i < n; i++) {
    const d = n - i; // outer edge of this step, from the chel's edge
    m.box('white', CHEL.minX - d, CHEL.maxX + d, Y.women * (i / n), Y.women * ((i + 1) / n), -CHEL.half - d, CHEL.half + d);
  }

  // the soreg: posts and rails of a lattice ten handbreadths high, open where the ways go in
  const sh = SOREG.height;
  const gaps = SOREG_GAPS_X.map((x): [number, number] => [x - 6, x + 6]);
  const rail = (axis: 'x' | 'z', a: number, b: number, at: number, gs: [number, number][]) => {
    const holes = gs.map(([g0, g1]): [number, number, number, number] => [g0, g1, -1, sh + 1]);
    m.wall('white', axis, a, b, sh - 0.25, sh, at - 0.15, at + 0.15, holes);
    m.wall('white', axis, a, b, 0, 0.3, at - 0.15, at + 0.15, holes);
  };
  rail('x', SOREG.minX, SOREG.maxX, -SOREG.half, gaps);
  rail('x', SOREG.minX, SOREG.maxX, SOREG.half, gaps);
  rail('z', -SOREG.half, SOREG.half, SOREG.minX, []);
  rail('z', -SOREG.half, SOREG.half, SOREG.maxX, [[-8, 8]]);
  return { geos: m.build(), steps };
}

/** The soreg's lattice: posts, and diagonal slats between them, instanced. */
function sorgePosts() {
  const posts: THREE.Matrix4[] = [];
  const slats: THREE.Matrix4[] = [];
  const gaps = SOREG_GAPS_X.map((x): [number, number] => [x - 6, x + 6]);
  const q = new THREE.Quaternion();
  const add = (x: number, z: number, along: 'x' | 'z') => {
    posts.push(new THREE.Matrix4().makeTranslation(x, SOREG.height / 2, z));
    for (const s of [1, -1]) {
      const rot = new THREE.Euler(along === 'x' ? 0 : 0, along === 'x' ? 0 : Math.PI / 2, s * 0.7);
      q.setFromEuler(rot);
      const c = new THREE.Vector3(along === 'x' ? x + 0.75 : x, SOREG.height / 2, along === 'x' ? z : z + 0.75);
      slats.push(new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 1)));
    }
  };
  const inGap = (v: number, gs: [number, number][]) => gs.some(([a, b]) => v > a - 0.5 && v < b + 0.5);
  for (let x = SOREG.minX; x < SOREG.maxX; x += 1.5) {
    for (const z of [-SOREG.half, SOREG.half]) if (!inGap(x, gaps)) add(x, z, 'x');
  }
  for (let z = -SOREG.half; z < SOREG.half; z += 1.5) {
    add(SOREG.minX, z, 'z');
    if (!inGap(z, [[-8, 8]])) add(SOREG.maxX, z, 'z');
  }
  return { posts, slats };
}

function Instanced({ geo, mat, mats, shadow = true }: { geo: THREE.BufferGeometry; mat: THREE.Material; mats: THREE.Matrix4[]; shadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    mats.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [mats]);
  return <instancedMesh ref={ref} args={[geo, mat, mats.length]} castShadow={shadow} receiveShadow />;
}

/** Bronze gate leaves hinged on a gateway's sides, opening inward (west). */
function GateLeaves({ x, y, id, fixedOpen = false, feature }: { x: number; y: number; id?: string; fixedOpen?: boolean; feature: string }) {
  const open = useStore((s) => (id ? s.open[id] : fixedOpen)) ?? false;
  const mat = useMemo(() => toon('t-bronzeDoor', { map: tex(bronzeDoorTexture()), emissive: '#2a1200', emissiveIntensity: 0.3 }), []);
  const h = GATE.height - 0.1;
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(GATE.half - 0.05, h, 0.35);
    g.translate(GATE.half / 2, h / 2, 0);
    worldUV(g, [5, h]);
    return g;
  }, [h]);
  const k = useRef(open ? 1 : 0);
  const leaves = useRef<(THREE.Group | null)[]>([]);
  const gl = useThree((s) => s.gl);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const target = open ? 1 : 0;
    if (Math.abs(target - k.current) < 0.0005) k.current = target;
    else {
      k.current += Math.sign(target - k.current) * Math.min(Math.abs(target - k.current), dt * 0.6);
      gl.shadowMap.needsUpdate = true;
    }
    const e = k.current * k.current * (3 - 2 * k.current);
    [1, -1].forEach((s, i) => {
      const l = leaves.current[i];
      if (l) l.rotation.y = s * (Math.PI / 2 + (Math.PI / 2) * e);
    });
  });
  return (
    <group userData={id ? { curtain: id, feature } : { feature }}>
      {[1, -1].map((s, i) => (
        <group key={s} ref={(r) => (leaves.current[i] = r)} position={[x, y + 0.05, s * GATE.half]}>
          <mesh geometry={geo} material={mat} castShadow receiveShadow />
        </group>
      ))}
    </group>
  );
}

/** Closed bronze doors in a gateway (for the gates you cannot pass). */
function ShutGate({ axis, x, z, y }: { axis: 'x' | 'z'; x: number; z: number; y: number }) {
  const mat = useMemo(() => toon('t-bronzeDoor', { map: tex(bronzeDoorTexture()), emissive: '#2a1200', emissiveIntensity: 0.3 }), []);
  return (
    <mesh position={[x, y + GATE.height / 2, z]} rotation={[0, axis === 'z' ? Math.PI / 2 : 0, 0]} material={mat} castShadow receiveShadow>
      <boxGeometry args={[GATE.half * 2, GATE.height, 0.4]} />
    </mesh>
  );
}

/** The thirteen chests of the treasury, shaped like rams' horns (Mishnah Shekalim 6:5). */
function Treasury() {
  const geo = useMemo(() => {
    const pts: [number, number][] = [
      [0, 0],
      [0.85, 0],
      [0.9, 0.9],
      [0.7, 1.8],
      [0.45, 2.6],
      [0.28, 3.2],
      [0.34, 3.35],
      [0, 3.35],
    ];
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 12);
    // bend the narrow mouth toward the wall
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setZ(i, p.getZ(i) - 0.12 * Math.max(0, y - 1.4) ** 2);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mats = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const xs = Array.from({ length: 7 }, (_, i) => WOMEN.minX + 46 + i * ((WOMEN.maxX - WOMEN.minX - 92) / 6));
    xs.forEach((x, i) => {
      for (const s of [1, -1]) {
        if (s < 0 && i === 6) continue; // thirteen in all
        out.push(new THREE.Matrix4().compose(new THREE.Vector3(x, Y.women, s * (WOMEN.half - 1.6)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s > 0 ? Math.PI : 0), new THREE.Vector3(1, 1, 1)));
      }
    });
    return out;
  }, []);
  return (
    <group userData={{ feature: 'women' }}>
      <Instanced geo={geo} mat={bronze()} mats={mats} />
    </group>
  );
}

export function Courts() {
  const { geos, steps } = useMemo(buildCourts, []);
  const sm = secondMaterials();
  const pave = useMemo(
    () => ({
      women: toon('s-paveWomen', { map: tex(pavementTexture('s-paveWomen', '#e6dbc3')), polygonOffset: true, polygonOffsetFactor: -1 }),
      court: toon('s-paveCourt', { map: tex(pavementTexture('s-paveCourt', '#ece3cf')), polygonOffset: true, polygonOffsetFactor: -1 }),
    }),
    [],
  );
  const floors = useMemo(() => {
    const A = AZARAH;
    const W = WOMEN;
    return {
      women: mergeGeometries([
        floorGeometry(CHEL.minX, CHEL.maxX, -CHEL.half, CHEL.half, Y.women + 0.02),
      ])!,
      court: mergeGeometries([
        floorGeometry(A.minX, PRIESTS_X, -A.half, A.half, Y.priests + 0.02),
        floorGeometry(PRIESTS_X, A.maxX + A.wall, -A.half, A.half, Y.israel + 0.02),
      ])!,
      w: W,
    };
  }, []);
  const lattice = useMemo(sorgePosts, []);
  const postGeo = useMemo(() => new THREE.BoxGeometry(0.25, SOREG.height, 0.25), []);
  const slatGeo = useMemo(() => new THREE.BoxGeometry(0.08, SOREG.height * 1.25, 0.08), []);
  return (
    <group>
      <group userData={{ feature: 'israel' }}>
        {Object.entries(geos).map(([k, g]) => (
          <mesh key={k} geometry={g} material={sm[k as keyof typeof sm]} castShadow receiveShadow />
        ))}
      </group>
      <mesh geometry={steps} material={sm.white} castShadow receiveShadow userData={{ feature: 'nicanor' }} />
      <mesh geometry={floors.women} material={pave.women} receiveShadow userData={{ feature: 'women' }} />
      <mesh geometry={floors.court} material={pave.court} receiveShadow userData={{ feature: 'israel' }} />
      <group userData={{ feature: 'soreg' }}>
        <Instanced geo={postGeo} mat={sm.white} mats={lattice.posts} />
        <Instanced geo={slatGeo} mat={sm.white} mats={lattice.slats} shadow={false} />
      </group>
      <GateLeaves x={AZARAH.maxX + 0.4} y={Y.israel} id="nicanor" feature="nicanor" />
      <GateLeaves x={WOMEN.maxX + 0.4} y={Y.women} fixedOpen feature="beautiful" />
      {[1, -1].flatMap((s) => AZARAH_GATES_X.map((x) => <ShutGate key={`${s}${x}`} axis="x" x={x} z={s * (AZARAH.half + AZARAH.wall / 2)} y={Y.priests} />))}
      <Treasury />
    </group>
  );
}

// ───────────────────────── The mount: pavement, porticoes, gates, and the Antonia ─────────────────────────

/** A column with a base and a flared capital, 1 cubit tall (scaled per instance). */
function columnGeometry() {
  const shaft = new THREE.CylinderGeometry(COLUMN_R * 0.85, COLUMN_R, 1, 12, 1, true);
  shaft.translate(0, 0.5, 0);
  return shaft;
}

function buildMount() {
  const m = new Mason(TILES);
  const { minX, maxX, minZ, maxZ } = MOUNT;
  const H = PORTICO.height;
  const t = 2; // the outer wall
  const D = PORTICO.depth;
  const S = STOA.depth;
  const gatesOn = (axis: 'x' | 'z', at: number) =>
    MOUNT_GATES.filter((g) => g.axis === axis && (axis === 'x' ? g.z === at : g.x === at)).map((g): [number, number, number, number] => {
      const c = axis === 'x' ? g.x : g.z;
      return [c - GATE.half, c + GATE.half, -1, GATE.height];
    });
  // the outer walls, rising above the porticoes' roofs
  m.wall('stone', 'x', minX, maxX, -0.6, H + 3, minZ, minZ + t, gatesOn('x', minZ));
  m.wall('stone', 'x', minX, maxX, -0.6, STOA.height + 3, maxZ - t, maxZ, gatesOn('x', maxZ));
  m.wall('stone', 'z', minZ + t, maxZ - t, -0.6, H + 3, minX, minX + t, gatesOn('z', minX));
  m.wall('stone', 'z', minZ + t, maxZ - t, -0.6, H + 3, maxX - t, maxX, gatesOn('z', maxX));
  // a parapet along the tops
  m.box('white', minX - 0.4, maxX + 0.4, H + 3, H + 4, minZ - 0.4, minZ + t + 0.4);
  m.box('white', minX - 0.4, maxX + 0.4, STOA.height + 3, STOA.height + 4, maxZ - t - 0.4, maxZ + 0.4);
  m.box('white', minX - 0.4, minX + t + 0.4, H + 3, H + 4, minZ, maxZ - S);
  m.box('white', maxX - t - 0.4, maxX + 0.4, H + 3, H + 4, minZ, maxZ - S);

  // the porticoes' roofs: a cedar ceiling under a flat roof, and an architrave on the inner columns
  const roof = (x0: number, x1: number, z0: number, z1: number, y: number) => {
    m.box('cedar', x0, x1, y, y + 0.6, z0, z1);
    m.box('roof', x0, x1, y + 0.6, y + 1.6, z0, z1);
  };
  roof(minX + t, maxX - t, minZ + t, minZ + D, H);
  roof(minX + t, minX + D, minZ + D, maxZ - S, H);
  roof(maxX - D, maxX - t, minZ + D, maxZ - S, H);
  m.box('white', minX + D - 1.2, maxX - D + 1.2, H - 1.4, H, minZ + D - 1.2, minZ + D + 1.2);
  m.box('white', minX + D - 1.2, minX + D + 1.2, H - 1.4, H, minZ + D, maxZ - S);
  m.box('white', maxX - D - 1.2, maxX - D + 1.2, H - 1.4, H, minZ + D, maxZ - S);
  // the Royal Stoa: two lower aisles and a high nave with a clerestory between them
  const z0 = maxZ - S;
  const nave0 = maxZ - 30;
  const nave1 = maxZ - 14;
  roof(minX + t, maxX - t, z0, nave0, H);
  roof(minX + t, maxX - t, nave1, maxZ - t, H);
  m.box('white', minX + t, maxX - t, H, STOA.height - 1, nave0 - 1, nave0 + 0.6);
  m.box('white', minX + t, maxX - t, H, STOA.height - 1, nave1 - 0.6, nave1 + 1);
  roof(minX + t, maxX - t, nave0 - 1, nave1 + 1, STOA.height - 1);
  m.box('white', minX + t, maxX - t, H - 1.4, H, z0 + 0.8, z0 + 3.2);
  // the stoa's ends
  m.box('stone', minX + t, minX + t + 1, 0, STOA.height, z0, maxZ);
  m.box('stone', maxX - t - 1, maxX - t, 0, STOA.height, z0, maxZ);

  // the fortress Antonia, on its rock at the north-west corner (Acts 21:34)
  const a = ANTONIA;
  const ay = -10;
  m.box('stone', a.minX, a.maxX, ay, 40, a.minZ, a.maxZ);
  m.box('white', a.minX - 0.6, a.maxX + 0.6, 40, 41.5, a.minZ - 0.6, a.maxZ + 0.6);
  for (const [x, z, h] of [
    [a.minX, a.minZ, 60],
    [a.maxX, a.minZ, 60],
    [a.minX, a.maxZ, 60],
    [a.maxX, a.maxZ, 80],
  ]) {
    m.box('stone', x - 9, x + 9, ay, h, z - 9, z + 9);
    m.box('white', x - 9.8, x + 9.8, h, h + 1.6, z - 9.8, z + 9.8);
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
      m.box('white', x - 8 + i * 7, x - 6 + i * 7, h + 1.6, h + 3.2, z + s * 9.2 - 0.6, z + s * 9.2 + 0.6);
      m.box('white', x + s * 9.2 - 0.6, x + s * 9.2 + 0.6, h + 1.6, h + 3.2, z - 8 + i * 7, z - 6 + i * 7);
    }
  }
  return m.build();
}

export function Mount() {
  const geos = useMemo(buildMount, []);
  const sm = secondMaterials();
  const cols = useMemo(() => {
    const list = columns();
    const shafts: THREE.Matrix4[] = [];
    const caps: THREE.Matrix4[] = [];
    for (const [x, z, h] of list) {
      shafts.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(1, h - 1.6, 1)));
      caps.push(new THREE.Matrix4().makeTranslation(x, h - 1.6, z));
    }
    return { shafts, caps };
  }, []);
  const shaft = useMemo(columnGeometry, []);
  const cap = useMemo(() => {
    const g = new THREE.CylinderGeometry(COLUMN_R * 1.5, COLUMN_R * 0.95, 1.6, 12);
    g.translate(0, 0.8, 0);
    return g;
  }, []);
  const pave = useMemo(() => toon('s-paveMount', { map: tex(pavementTexture('s-paveMount', '#d8c9a6')) }), []);
  const floor = useMemo(() => floorGeometry(MOUNT.minX, MOUNT.maxX, MOUNT.minZ, MOUNT.maxZ, 0.01), []);
  return (
    <group>
      <group userData={{ feature: 'gentiles' }}>
        {Object.entries(geos).map(([k, g]) => (
          <mesh key={k} geometry={g} material={sm[k as keyof typeof sm]} castShadow receiveShadow />
        ))}
      </group>
      <mesh geometry={floor} material={pave} receiveShadow userData={{ feature: 'gentiles' }} />
      <group userData={{ feature: 'solomons' }}>
        <Instanced geo={shaft} mat={sm.white} mats={cols.shafts} />
        <Instanced geo={cap} mat={sm.white} mats={cols.caps} />
      </group>
      {MOUNT_GATES.map((g, i) => (
        <ShutGate key={i} axis={g.axis} x={g.axis === 'z' ? g.x + (g.x > 0 ? -1 : 1) : g.x} z={g.axis === 'x' ? g.z + (g.z > 0 ? -1 : 1) : g.z} y={0} />
      ))}
    </group>
  );
}
