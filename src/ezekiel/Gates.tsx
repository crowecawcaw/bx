import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { toon } from '../scene/materials';
import { useStore } from '../store';
import { Mason } from '../temple/mason';
import { bronzeDoorTexture, tex } from '../temple/textures';
import { CHAMBERS_U, GATE, GATE_PARTS, GATES, SIDE_ROT, gateToWorld, type GateDef, type GateKind } from './dims';
import { ezekielMaterials, TILES } from './materials';
import { stonePalmTexture } from './textures';

/**
 * One gate in its own frame: u runs inward from the end you enter by, v across. Heights are above
 * the gate's floor. Built once for each kind and drawn three times, turned to face its side.
 */
function buildGate(kind: GateKind) {
  const m = new Mason(TILES);
  const P = GATE_PARTS[kind];
  const H = GATE.height;
  const half = GATE.half;
  // u in this kind's order: the parts' spans are given in the order you pass them
  const box = (key: string, u0: number, u1: number, y0: number, y1: number, v0: number, v1: number) => m.box(key, u0, u1, y0, y1, v0, v1);
  const sides = (key: string, u0: number, u1: number, y0: number, y1: number, inner: number, outer = half) => {
    box(key, u0, u1, y0, y1, inner, outer);
    box(key, u0, u1, y0, y1, -outer, -inner);
  };
  // the floor slab, down to the court or ground below
  box('stone', 0, GATE.len, -8, 0, -half, half);
  // thresholds: the entry 10 cubits broad between walls (40:6-7, 11)
  for (const t of [P.threshold1, P.threshold2]) sides('stone', t[0], t[1], 0, H, GATE.entry);
  // the little chambers, a reed square, three a side, with posts of 5 between (40:7, 10)
  const [c0] = P.chambers;
  sides('stone', P.chambers[0], P.chambers[1], 0, H, half - 1); // the back walls
  for (let i = 0; i < 2; i++) sides('stone', c0 + CHAMBERS_U[i][1], c0 + CHAMBERS_U[i + 1][0], 0, H, GATE.passage);
  // the border a cubit before the chambers (40:12), and their roofs (40:13)
  sides('white', P.chambers[0], P.chambers[1], 0, 1, GATE.passage, GATE.passage + 0.5);
  sides('roof', P.chambers[0], P.chambers[1], 10, 11, GATE.passage, half - 1);
  // the porch, 8 cubits, and its posts, 2 (40:9), roofed
  sides('stone', P.porch[0], P.porch[1], 0, H, GATE.porch);
  sides('stone', P.posts[0], P.posts[1], 0, H + 4, GATE.mouth);
  box('stone', P.porch[0], P.porch[1], H - 2, H, -GATE.porch, GATE.porch);
  box('stone', P.posts[0], P.posts[1], H - 4, H + 4, -GATE.mouth, GATE.mouth);
  // a lintel over the outer entry
  const t1 = P.threshold1;
  box('stone', t1[0], t1[1], H - 4, H, -GATE.entry, GATE.entry);
  // copings
  box('white', -0.4, GATE.len + 0.4, H, H + 0.8, half - 1.4, half + 0.4);
  box('white', -0.4, GATE.len + 0.4, H, H + 0.8, -half - 0.4, -half + 1.4);
  box('white', P.posts[0] - 0.4, P.posts[1] + 0.4, H + 4, H + 4.8, -half - 0.4, half + 0.4);
  // narrow windows to the little chambers (40:16): dark slits on the outside
  for (const [a, b] of CHAMBERS_U) {
    const u = c0 + (a + b) / 2;
    sides('dark', u - 0.35, u + 0.35, 4, 8, half, half + 0.05);
  }
  return m.build();
}

/** Where palm trees stand on the posts (40:16, 26, 31): [u, v, facing +v?, width]. */
function palmSpots(kind: GateKind): [number, number, boolean, number][] {
  const P = GATE_PARTS[kind];
  const c0 = P.chambers[0];
  const out: [number, number, boolean, number][] = [];
  for (let i = 0; i < 2; i++) {
    const u = c0 + (CHAMBERS_U[i][1] + CHAMBERS_U[i + 1][0]) / 2;
    out.push([u, GATE.passage - 0.03, false, 4], [u, -GATE.passage + 0.03, true, 4]);
  }
  const pu = (P.posts[0] + P.posts[1]) / 2;
  out.push([pu, GATE.mouth - 0.03, false, 1.9], [pu, -GATE.mouth + 0.03, true, 1.9]);
  return out;
}

function Palms({ kind }: { kind: GateKind }) {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: stonePalmTexture(), transparent: true, alphaTest: 0.4, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    [],
  );
  return (
    <>
      {palmSpots(kind).map(([u, v, pos, w], i) => (
        <mesh key={i} position={[u, 7, v]} rotation={[0, pos ? 0 : Math.PI, 0]} material={mat}>
          <planeGeometry args={[w, 12]} />
        </mesh>
      ))}
    </>
  );
}

/**
 * Doors of bronze in an entry 10 broad, two leaves hinged on its sides. The east gate of the outer
 * court is shut for ever (44:1-2); the inner gate toward the east opens on the sabbath and the new
 * moon (46:1), so it can be tapped.
 */
function Doors({ u, id, feature }: { u: number; id?: string; feature: string }) {
  const open = useStore((s) => (id ? s.open[id] : false)) ?? false;
  const mat = useMemo(() => toon('t-bronzeDoor', { map: tex(bronzeDoorTexture()), emissive: '#2a1200', emissiveIntensity: 0.3 }), []);
  const h = GATE.height - 4.1;
  const w = GATE.entry;
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(0.35, h, w - 0.05);
    g.translate(0, h / 2, -w / 2);
    return g;
  }, [h, w]);
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
      if (l) l.rotation.y = s * (Math.PI / 2) * 0.95 * e;
    });
  });
  return (
    <group userData={id ? { curtain: id, feature } : { feature }}>
      {[1, -1].map((s, i) => (
        <group key={s} ref={(r) => (leaves.current[i] = r)} position={[u, 0.05, s * w]} scale={[1, 1, s]}>
          <mesh geometry={geo} material={mat} castShadow receiveShadow />
        </group>
      ))}
    </group>
  );
}

/** The steps up into a gate: seven for the outer gates, eight for the inner (40:22, 26, 31). */
function stepsGeometry(g: GateDef) {
  const m = new Mason(TILES);
  const { n, run, from } = g.steps;
  const rise = (g.floor - from) / n;
  for (let i = 0; i < n; i++) {
    m.box('white', -run + (i * run) / n, 0, from - 0.5 - g.floor, from + (i + 1) * rise - g.floor, -GATE.stepsHalf - 0.6, GATE.stepsHalf + 0.6);
  }
  return m.build().white;
}

const FEATURE: Record<string, string> = {
  outerEast: 'eastgate',
  outerNorth: 'gate',
  outerSouth: 'gate',
  innerEast: 'sabbath',
  innerNorth: 'innergates',
  innerSouth: 'innergates',
};

function OneGate({ g, geos }: { g: GateDef; geos: Record<string, THREE.BufferGeometry> }) {
  const mats = ezekielMaterials();
  const steps = useMemo(() => stepsGeometry(g), [g]);
  const [x, z] = gateToWorld(g, 0, 0);
  const P = GATE_PARTS[g.kind];
  return (
    <group position={[x, g.floor, z]} rotation={[0, SIDE_ROT[g.side], 0]} userData={{ feature: FEATURE[g.id] }}>
      {Object.entries(geos).map(([k, geo]) => (
        <mesh key={k} geometry={geo} material={mats[k]} castShadow receiveShadow />
      ))}
      <mesh geometry={steps} material={mats.white} castShadow receiveShadow />
      <Palms kind={g.kind} />
      {g.id === 'outerEast' && <Doors u={(P.threshold1[0] + P.threshold1[1]) / 2} feature="eastgate" />}
      {g.id === 'innerEast' && <Doors u={(P.threshold2[0] + P.threshold2[1]) / 2} id="sabbath" feature="sabbath" />}
    </group>
  );
}

export function Gates() {
  const outer = useMemo(() => buildGate('outer'), []);
  const inner = useMemo(() => buildGate('inner'), []);
  return (
    <>
      {GATES.map((g) => (
        <OneGate key={g.id} g={g} geos={g.kind === 'outer' ? outer : inner} />
      ))}
    </>
  );
}

/** Instanced mesh from a list of matrices. */
export function Instanced({ geo, mat, mats, shadow = true }: { geo: THREE.BufferGeometry; mat: THREE.Material; mats: THREE.Matrix4[]; shadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    mats.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [mats]);
  return <instancedMesh ref={ref} args={[geo, mat, mats.length]} castShadow={shadow} receiveShadow />;
}
