import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Cloth } from '../scene/Cloth';
import { IncenseAltar, Menorah, Table } from '../scene/Furniture';
import { cloth, pureGold, toon } from '../scene/materials';
import { needleworkTexture } from '../scene/textures';
import { useStore } from '../store';
import { Mason, worldUV } from '../temple/mason';
import { pavementTexture, plainGoldTexture, tex } from '../temple/textures';
import { secondMaterials } from './Courts';
import { HEKAL_DOOR, HOUSE, PORCH_DOOR, POS, STEPS, Y } from './dims';

const { frontX, porchIn, porchBack, hekalX, veilEast, veilWest, holiestX, backX, inner: IN, body: BODY, porch: PORCH, porchInner: PIN, hekalHeight: HH, roof: ROOF, parapet: PAR } = HOUSE;
/** The porch hall's ceiling, under the roof (not given). */
const PORCH_CEIL = 80;
const RISE = Y.house - Y.priests;

const TILES: Record<string, [number, number]> = { white: [8, 3], gold: [3, 3], ceiling: [5, 5], roof: [6, 6], cedar: [2, 6], marble: [6, 6] };

function buildHouse() {
  const m = new Mason(TILES);
  // the foundation, six cubits (Middot 4:6), under the whole house
  m.box('white', hekalX, frontX, -RISE, 0, -PORCH, PORCH);
  m.box('white', backX, hekalX, -RISE, 0, -BODY, BODY);
  m.box('white', backX - 0.5, frontX + 0.5, -RISE, -RISE + 1, -BODY - 0.5, BODY + 0.5);
  m.box('white', hekalX - 0.5, frontX + 0.5, -RISE, -RISE + 1, -PORCH - 0.5, PORCH + 0.5);

  // ── the porch: 100 broad, standing out 15 cubits each side of the house (Middot 4:7)
  const door: [number, number, number, number] = [-PORCH_DOOR.half, PORCH_DOOR.half, -1, PORCH_DOOR.height];
  m.wall('white', 'z', -PORCH, PORCH, 0, ROOF, porchIn, frontX - 0.1, [door]);
  // its face overlaid with gold (Josephus, War 5.5.4)
  m.wall('gold', 'z', -PORCH, PORCH, 0, ROOF, frontX - 0.1, frontX, [door]);
  for (const s of [1, -1]) {
    const z: [number, number] = s > 0 ? [PIN, PORCH] : [-PORCH, -PIN];
    m.box('white', hekalX, porchIn, 0, ROOF, ...z);
  }
  // the porch hall's ceiling and the mass above it
  m.box('ceiling', porchBack, porchIn, PORCH_CEIL, PORCH_CEIL + 1, -PIN, PIN);
  m.box('white', hekalX, porchIn, PORCH_CEIL + 1, ROOF, -PIN, PIN);
  // the east wall of the hekal, across the porch, with its door 20 high and 10 broad (Middot 4:1)
  const hdoor: [number, number, number, number] = [-HEKAL_DOOR.half, HEKAL_DOOR.half, -1, HEKAL_DOOR.height];
  m.wall('white', 'z', -PIN, PIN, 0, PORCH_CEIL, hekalX, porchBack, [hdoor]);
  // five beams of oak over the porch's entrance, each a cubit longer each side (Middot 3:7)
  for (let i = 0; i < 5; i++) {
    const y = PORCH_DOOR.height + i * 1.6;
    const half = PORCH_DOOR.half + 1 + i;
    m.box('cedar', frontX - 0.2, frontX + 0.5, y + 0.2, y + 1.4, -half, half);
  }
  // the reveal of the entrance, gold within
  for (const s of [1, -1]) m.box('gold', porchIn, frontX, 0, PORCH_DOOR.height, s > 0 ? PORCH_DOOR.half - 0.05 : -PORCH_DOOR.half, s > 0 ? PORCH_DOOR.half : -PORCH_DOOR.half + 0.05);
  m.box('gold', porchIn, frontX, PORCH_DOOR.height - 0.05, PORCH_DOOR.height, -PORCH_DOOR.half, PORCH_DOOR.half);

  // ── the house behind it: the hekal, the amah traksin and the Holy of Holies, with chambers round them
  for (const s of [1, -1]) {
    const z: [number, number] = s > 0 ? [IN, BODY] : [-BODY, -IN];
    m.box('white', backX, hekalX, 0, ROOF, ...z);
    // gold within (Middot 4:1 speaks of the house overlaid with gold)
    m.box('gold', holiestX, hekalX, 0, HH, ...(s > 0 ? [IN - 0.05, IN] : [-IN, -IN + 0.05]) as [number, number]);
  }
  m.box('white', backX, holiestX, 0, ROOF, -IN, IN);
  m.box('gold', holiestX, holiestX + 0.05, 0, HH, -IN, IN);
  m.wall('gold', 'z', -IN, IN, 0, HH, hekalX - 0.05, hekalX, [hdoor]);
  // ceiling, and the upper storey above it (Middot 4:5-6), solid here
  m.box('ceiling', holiestX, hekalX, HH, HH + 1, -IN, IN);
  m.box('white', holiestX, hekalX, HH + 1, ROOF, -IN, IN);
  // the floor
  m.box('marble', holiestX, porchIn, -0.05, 0.03, -IN, IN);
  m.box('marble', porchBack, porchIn, -0.05, 0.03, -PIN, PIN);
  m.box('marble', hekalX, porchBack, -0.05, 0.03, -HEKAL_DOOR.half, HEKAL_DOOR.half);
  m.box('marble', porchIn, frontX, -0.05, 0.03, -PORCH_DOOR.half, PORCH_DOOR.half);

  // the roof, a parapet three cubits high, and cornices
  m.box('roof', backX, hekalX, ROOF, ROOF + 0.5, -BODY, BODY);
  m.box('roof', hekalX, frontX, ROOF, ROOF + 0.5, -PORCH, PORCH);
  const parapet = (x0: number, x1: number, z0: number, z1: number) => m.box('white', x0, x1, ROOF, ROOF + PAR, z0, z1);
  parapet(backX, hekalX, -BODY, -BODY + 1);
  parapet(backX, hekalX, BODY - 1, BODY);
  parapet(backX, backX + 1, -BODY, BODY);
  parapet(hekalX, frontX, -PORCH, -PORCH + 1);
  parapet(hekalX, frontX, PORCH - 1, PORCH);
  parapet(frontX - 1, frontX, -PORCH, PORCH);
  parapet(hekalX, hekalX + 1, -PORCH, -BODY);
  parapet(hekalX, hekalX + 1, BODY, PORCH);
  for (const y of [HH + 4, ROOF - 2]) {
    m.box('white', backX - 0.5, hekalX, y, y + 1, -BODY - 0.5, BODY + 0.5);
    m.box('white', hekalX, frontX + 0.5, y, y + 1, -PORCH - 0.5, PORCH + 0.5);
  }

  // ── the twelve steps from the court up to the porch (Middot 3:6), with cheek walls
  const run = STEPS.run / STEPS.n;
  const rise = RISE / STEPS.n;
  for (let i = 0; i < STEPS.n; i++) {
    m.box('white', frontX, frontX + STEPS.run - i * run, -RISE + i * rise, -RISE + (i + 1) * rise, -STEPS.half, STEPS.half);
  }
  for (const s of [1, -1]) {
    const z: [number, number] = s > 0 ? [STEPS.half, STEPS.half + 1] : [-STEPS.half - 1, -STEPS.half];
    m.box('white', frontX, frontX + STEPS.run, -RISE, 1, ...z);
  }
  return m.build();
}

/** Golden spikes along the parapet, to keep birds off the roof (the "scarecrow", Middot 4:6). */
function spikeMatrices() {
  const out: THREE.Matrix4[] = [];
  const y = ROOF + PAR;
  const along = (x0: number, z0: number, x1: number, z1: number) => {
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 2);
    for (let i = 0; i <= n; i++) out.push(new THREE.Matrix4().makeTranslation(x0 + ((x1 - x0) * i) / n, y, z0 + ((z1 - z0) * i) / n));
  };
  along(backX + 0.5, -BODY + 0.5, hekalX, -BODY + 0.5);
  along(backX + 0.5, BODY - 0.5, hekalX, BODY - 0.5);
  along(backX + 0.5, -BODY + 0.5, backX + 0.5, BODY - 0.5);
  along(hekalX, -PORCH + 0.5, frontX - 0.5, -PORCH + 0.5);
  along(hekalX, PORCH - 0.5, frontX - 0.5, PORCH - 0.5);
  along(frontX - 0.5, -PORCH + 0.5, frontX - 0.5, PORCH - 0.5);
  along(hekalX + 0.5, -PORCH + 0.5, hekalX + 0.5, -BODY);
  along(hekalX + 0.5, BODY, hekalX + 0.5, PORCH - 0.5);
  return out;
}

function useInstances(ref: React.RefObject<THREE.InstancedMesh>, mats: THREE.Matrix4[]) {
  useLayoutEffect(() => {
    mats.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [mats, ref]);
}

function Spikes() {
  const mats = useMemo(spikeMatrices, []);
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.12, 1.2, 6);
    g.translate(0, 0.6, 0);
    return g;
  }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useInstances(ref, mats);
  return <instancedMesh ref={ref} args={[geo, pureGold(), mats.length]} userData={{ feature: 'house' }} />;
}

/**
 * The golden vine over the door of the hekal, trained on posts (Middot 3:8): stems, leaves and
 * clusters of grapes, the clusters "the height of a man" (Josephus, Antiquities 15.11.3).
 */
function GoldenVine() {
  const x = porchBack + 0.35;
  const y0 = HEKAL_DOOR.height + 1.2;
  const { stems, leaves, grapes } = useMemo(() => {
    let seed = 41;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const stemParts: THREE.BufferGeometry[] = [];
    const leafM: THREE.Matrix4[] = [];
    const grapeM: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    // two trained posts beside the door, and a main stem running along over it in waves
    for (const s of [1, -1]) {
      const g = new THREE.CylinderGeometry(0.22, 0.28, y0 + 9, 8);
      g.translate(x, (y0 + 9) / 2, s * (HEKAL_DOOR.half + 1.2));
      stemParts.push(g.toNonIndexed());
    }
    const span = 15;
    const pts = Array.from({ length: 41 }, (_, i) => {
      const t = i / 40;
      return new THREE.Vector3(x, y0 + 3 + Math.sin(t * Math.PI * 5) * 1.6, -span + 2 * span * t);
    });
    stemParts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.2, 6, false).toNonIndexed());
    for (let i = 0; i < 90; i++) {
      const z = -span + rnd() * 2 * span;
      const y = y0 + 3 + Math.sin(((z + span) / (2 * span)) * Math.PI * 5) * 1.6 + (rnd() - 0.5) * 4.5;
      q.setFromEuler(new THREE.Euler(rnd() * 2 - 1, Math.PI / 2 + (rnd() - 0.5) * 0.6, rnd() * 6.28));
      const s = 1.1 + rnd() * 0.7;
      leafM.push(new THREE.Matrix4().compose(new THREE.Vector3(x + 0.15 + rnd() * 0.3, y, z), q, new THREE.Vector3(s, s, s * 0.25)));
    }
    // clusters hanging from the stem
    for (let c = 0; c < 9; c++) {
      const z = -span + 1.8 + c * ((2 * span - 3.6) / 8);
      const top = y0 + 3 + Math.sin(((z + span) / (2 * span)) * Math.PI * 5) * 1.6 - 0.4;
      for (let k = 0; k < 26; k++) {
        const t = k / 26;
        const yy = top - t * 3.4;
        const r = (1 - t) * 0.9 + 0.1;
        const a = rnd() * Math.PI * 2;
        grapeM.push(new THREE.Matrix4().makeTranslation(x + 0.45 + Math.cos(a) * r * 0.5, yy, z + Math.sin(a) * r));
      }
    }
    const stems = new THREE.BufferGeometry();
    const pos: number[] = [];
    const nor: number[] = [];
    for (const p of stemParts) {
      pos.push(...(p.attributes.position.array as Float32Array));
      nor.push(...(p.attributes.normal.array as Float32Array));
    }
    stems.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    stems.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return { stems, leaves: leafM, grapes: grapeM };
  }, [x, y0]);
  const leafGeo = useMemo(() => {
    // a five-lobed leaf: a flattened, scalloped disc
    const shape = new THREE.Shape();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 0.55 + 0.18 * Math.cos(a * 5);
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
  }, []);
  const grapeGeo = useMemo(() => new THREE.SphereGeometry(0.28, 8, 6), []);
  const lr = useRef<THREE.InstancedMesh>(null);
  const gr = useRef<THREE.InstancedMesh>(null);
  useInstances(lr, leaves);
  useInstances(gr, grapes);
  const m = pureGold();
  return (
    <group userData={{ feature: 'porch' }}>
      <mesh geometry={stems} material={m} castShadow />
      <instancedMesh ref={lr} args={[leafGeo, m, leaves.length]} castShadow />
      <instancedMesh ref={gr} args={[grapeGeo, m, grapes.length]} castShadow />
    </group>
  );
}

/** Doors of gold folding back inside the hekal (Middot 4:1-2). */
function HekalDoors() {
  const open = useStore((s) => s.open.doors) ?? false;
  const mat = useMemo(() => toon('s-goldDoor', { map: tex(plainGoldTexture()), emissive: '#3c2600', emissiveIntensity: 0.4 }), []);
  const w = HEKAL_DOOR.half;
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(w - 0.05, HEKAL_DOOR.height - 0.05, 0.3);
    g.translate(w / 2, HEKAL_DOOR.height / 2, 0);
    worldUV(g, [3, 3]);
    return g;
  }, [w]);
  const k = useRef(open ? 1 : 0);
  const leaves = useRef<(THREE.Group | null)[]>([]);
  const gl = useThree((s) => s.gl);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const target = open ? 1 : 0;
    if (Math.abs(target - k.current) < 0.0005) k.current = target;
    else {
      k.current += Math.sign(target - k.current) * Math.min(Math.abs(target - k.current), dt * 0.8);
      gl.shadowMap.needsUpdate = true;
    }
    const e = k.current * k.current * (3 - 2 * k.current);
    [1, -1].forEach((s, i) => {
      const l = leaves.current[i];
      if (l) l.rotation.y = s * (Math.PI / 2 + (Math.PI / 2) * e);
    });
  });
  return (
    <group userData={{ curtain: 'doors', feature: 'holy' }}>
      {[1, -1].map((s, i) => (
        <group key={s} ref={(r) => (leaves.current[i] = r)} position={[hekalX + 0.2, 0, s * w]}>
          <mesh geometry={geo} material={mat} castShadow receiveShadow />
        </group>
      ))}
    </group>
  );
}

/**
 * The two curtains a cubit apart (Mishnah Yoma 5:1): the outer drawn back toward the south, the
 * inner toward the north. Each fills the room's 20 cubits of breadth and 40 of height.
 */
function Veils() {
  const open = useStore((s) => s.open.veil) ?? false;
  const mat = useMemo(() => cloth('secondVeil', needleworkTexture('secondVeilTex', 1024, 2048, 3)), []);
  const w = IN * 2 - 0.1;
  const h = HH - 0.6;
  return (
    <group userData={{ feature: 'veil' }}>
      {[
        [veilEast - 0.1, 'left'],
        [veilWest + 0.1, 'right'],
      ].map(([x, gather]) => (
        <group key={x as number}>
          <mesh position={[x as number, h + 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={pureGold()}>
            <cylinderGeometry args={[0.12, 0.12, w + 0.2, 8]} />
          </mesh>
          <group position={[x as number, h, 0]} rotation={[0, Math.PI / 2, 0]}>
            <Cloth
              width={w}
              height={h}
              material={mat}
              open={open ? 1 : 0}
              gather={gather as 'left' | 'right'}
              foldWidth={1.4}
              foldDepth={0.3}
              segmentsPerCubit={1.5}
              userData={{ curtain: 'veil', feature: 'veil' }}
            />
          </group>
        </group>
      ))}
    </group>
  );
}

/** The foundation stone, three fingers above the floor of the Holy of Holies (Mishnah Yoma 5:2). */
function FoundationStone() {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const n = 1 + 0.12 * Math.sin(x * 5.1 + z * 3.3) + 0.08 * Math.sin(z * 7.7 - y * 4);
      p.setXYZ(i, x * 3.2 * n, Math.max(-0.2, y) * 0.5 * n, z * 2.4 * n);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => toon('s-rock', { color: '#c8b79a' }), []);
  return <mesh geometry={geo} material={mat} position={[POS.stone[0], -0.1, POS.stone[1]]} castShadow receiveShadow userData={{ feature: 'holiest' }} />;
}

export function House() {
  const geos = useMemo(buildHouse, []);
  const sm = secondMaterials();
  const mats: Record<string, THREE.Material> = useMemo(
    () => ({ ...sm, marble: toon('s-marble', { map: tex(pavementTexture('s-marble', '#efe8da')) }) }),
    [sm],
  );
  return (
    <group position={[0, Y.house, 0]}>
      <group userData={{ feature: 'house' }}>
        {Object.entries(geos).map(([k, g]) => (
          <mesh key={k} geometry={g} material={mats[k]} castShadow={k !== 'marble' && k !== 'ceiling'} receiveShadow userData={k === 'gold' ? { feature: 'porch' } : undefined} />
        ))}
      </group>
      <Spikes />
      <GoldenVine />
      <HekalDoors />
      <Veils />
      <FoundationStone />
      <Table at={POS.table} rotY={0} feature="holy" />
      <Menorah at={POS.menorah} rotY={-Math.PI / 2} feature="holy" />
      <IncenseAltar at={POS.incense} feature="holy" />
      {/* lamplight in the hekal; the Holy of Holies is dark but for what comes past the veil */}
      <pointLight position={[-40, 10, 0]} color="#ffbe6a" intensity={30} distance={50} decay={1.2} />
      <pointLight position={[-28, 26, 0]} color="#ffcf8a" intensity={12} distance={40} decay={1.2} />
      <pointLight position={[-73, 12, 0]} color="#ffe2b0" intensity={5} distance={26} decay={1.3} />
    </group>
  );
}
