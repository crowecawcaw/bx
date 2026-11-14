import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { Mason, worldUV } from '../temple/mason';
import { HOUSE, PILLAR, PILLARS, STEPS, WOOD_ALTAR, Y } from './dims';
import { ezekielMaterials, TILES } from './materials';

const H = HOUSE;
/** The foundation: the house stands six cubits above the inner court (41:8). */
const RISE = Y.house - Y.inner;
/** Not given: the height of the porch's entrance and of the two doors, and the porch's ceiling. */
const PORCH_OPEN = 22;
const DOOR_H = 20;
const INNER_DOOR_H = 14;
const PORCH_CEIL = 28;
/** Narrow windows high in the temple's walls, above the side chambers (41:16, 26). */
const WINDOWS_X = Array.from({ length: 7 }, (_, i) => H.partition + 5 + i * 5.5);
const WIN: [number, number] = [H.chamberRoof + 2.5, H.holyHeight - 2];

function buildHouse() {
  const m = new Mason(TILES);
  const { front, porchIn, porchBack, holyX, partition, holiestX, holiestBack, wallBack, back, inner: IN, porchHalf: PH, wall: WL, outer: OUT, platform: PL, roof: R } = H;
  const across = (s: number, a: number, b: number): [number, number] => (s > 0 ? [a, b] : [-b, -a]);

  // the foundation, a full reed of six great cubits (41:8), and the place left round about (41:9-11)
  m.box('white', back - 1, front, -RISE, 0, -PL, PL);
  m.box('white', back - 1.4, front + 0.4, -0.6, 0, -PL - 0.4, PL + 0.4);

  // ── the porch: posts 5 a side, its gate 14 broad, 20 long and 11 broad within (40:48-49)
  const door: [number, number, number, number] = [-H.porchDoor, H.porchDoor, -1, PORCH_OPEN];
  m.wall('stone', 'z', -PH, PH, 0, R, porchIn, front, [door]);
  for (const s of [1, -1]) m.box('stone', porchBack, porchIn, 0, R, ...across(s, IN, PH));
  m.box('cedar', porchBack, porchIn, PORCH_CEIL, PORCH_CEIL + 0.6, -IN, IN);
  m.box('stone', porchBack, porchIn, PORCH_CEIL + 0.6, R, -IN, IN);
  // the porch's walls within: palm trees on its sides (41:26)
  for (const s of [1, -1]) m.box('carved', porchBack, porchIn, 0, PORCH_CEIL, ...across(s, IN - 0.05, IN));
  // thick planks upon the face of the porch without (41:25)
  m.box('wood', front - 0.2, front + 2.4, PORCH_OPEN + 0.4, PORCH_OPEN + 1.4, -H.porchDoor - 2, H.porchDoor + 2);
  for (const s of [1, -1]) m.box('wood', front, front + 2.4, PORCH_OPEN - 2, PORCH_OPEN + 0.4, ...across(s, H.porchDoor + 1.2, H.porchDoor + 2));

  // ── the temple: its east wall 6 thick with a door 10 broad (41:1-2)
  const hdoor: [number, number, number, number] = [-H.door, H.door, -1, DOOR_H];
  m.wall('stone', 'z', -WL, WL, 0, R, holyX, porchBack, [hdoor]);
  m.wall('carved', 'z', -IN, IN, 0, H.holyHeight, holyX, holyX + 0.05, [hdoor]);
  // its side walls, with narrow windows above the chambers
  const windows = WINDOWS_X.map((x): [number, number, number, number] => [x - 0.5, x + 0.5, WIN[0], WIN[1]]);
  for (const s of [1, -1]) {
    m.wall('stone', 'x', wallBack, holyX, 0, R, ...across(s, IN, WL), windows);
    m.wall('carved', 'x', partition, holyX, 0, H.holyHeight, ...across(s, IN - 0.05, IN), windows);
    m.box('carved', holiestBack, holiestX, 0, H.holiestHeight, ...across(s, IN - 0.05, IN));
  }
  // the post of the door, 2 cubits, and the door 6 (41:3)
  const idoor: [number, number, number, number] = [-H.holiestDoor, H.holiestDoor, -1, INNER_DOOR_H];
  m.wall('stone', 'z', -IN, IN, 0, H.holyHeight, holiestX, partition, [idoor]);
  m.wall('carved', 'z', -IN, IN, 0, H.holyHeight, partition, partition + 0.05, [idoor]);
  m.wall('carved', 'z', -IN, IN, 0, H.holiestHeight, holiestX - 0.05, holiestX, [idoor]);
  // the back wall
  m.box('stone', wallBack, holiestBack, 0, R, -WL, WL);
  m.box('carved', holiestBack, holiestBack + 0.05, 0, H.holiestHeight, -IN, IN);
  // ceilings of wood (41:16), the most holy place lower, and the mass above
  m.box('cedar', partition, holyX, H.holyHeight, H.holyHeight + 0.6, -IN, IN);
  m.box('stone', partition, holyX, H.holyHeight + 0.6, R, -IN, IN);
  m.box('cedar', holiestBack, holiestX, H.holiestHeight, H.holiestHeight + 0.6, -IN, IN);
  m.box('stone', holiestBack, holiestX, H.holiestHeight + 0.6, R, -IN, IN);
  m.box('stone', holiestX, partition, H.holyHeight, R, -IN, IN);
  // floors of stone
  m.box('pave', holiestBack, porchIn, -0.05, 0.02, -IN, IN);
  m.box('pave', porchIn, front, -0.05, 0.02, -H.porchDoor, H.porchDoor);

  // ── the side chambers, three storeys round the house on the north, south and west (41:5-11)
  const chamberEast = porchBack;
  for (const s of [1, -1]) {
    m.box('stone', back, chamberEast, 0, H.chamberRoof, ...across(s, WL, OUT));
    // one door toward the north and another toward the south, onto the place left (41:11)
    m.box('dark', -98, -94, 0, 7, ...across(s, OUT, OUT + 0.05));
    // narrow windows in each storey (41:26)
    for (let x = back + 6; x < chamberEast - 3; x += 7) {
      for (const y of [2.5, 9.5, 16.5]) m.box('dark', x - 0.3, x + 0.3, y, y + 3, ...across(s, OUT, OUT + 0.05));
    }
  }
  m.box('stone', back, wallBack, 0, H.chamberRoof, -OUT, OUT);
  for (const z of [-15, -5, 5, 15]) for (const y of [2.5, 9.5, 16.5]) m.box('dark', back - 0.05, back, y, y + 3, z - 0.3, z + 0.3);
  // the chambers' roof, and a ledge at each storey where the wall narrows (41:7): on the sides and across the back
  for (const [y0, y1, key] of [[H.chamberRoof, H.chamberRoof + 0.6, 'roof'], [6.6, 7, 'white'], [13.6, 14, 'white']] as const) {
    for (const s of [1, -1]) m.box(key, back - 0.3, chamberEast, y0, y1, ...across(s, WL, OUT + 0.3));
    m.box(key, back - 0.3, wallBack, y0, y1, -WL, WL);
  }

  // the roof, with a parapet and cornice (not described)
  m.box('roof', wallBack, front, R, R + 0.5, -WL, WL);
  m.box('roof', porchBack, front, R, R + 0.5, -PH, PH);
  for (const s of [1, -1]) {
    m.box('white', wallBack - 0.4, porchBack, R + 0.5, R + 2, ...across(s, WL - 1, WL + 0.4));
    m.box('white', porchBack, front + 0.4, R + 0.5, R + 2, ...across(s, PH - 1, PH + 0.4));
    m.box('white', porchBack - 0.4, porchBack + 0.6, R + 0.5, R + 2, ...across(s, WL - 1, PH));
  }
  m.box('white', wallBack - 0.4, wallBack + 0.6, R + 0.5, R + 2, -WL, WL);
  m.box('white', front - 0.6, front + 0.4, R + 0.5, R + 2, -PH, PH);

  // ── the steps up to the porch (40:49; ten in the Greek), with cheek walls
  const run = (STEPS.x1 - STEPS.x0) / STEPS.n;
  const rise = RISE / STEPS.n;
  for (let i = 0; i < STEPS.n; i++) m.box('white', front, STEPS.x1 - i * run, -RISE, -RISE + (i + 1) * rise, -STEPS.half, STEPS.half);
  for (const s of [1, -1]) m.box('white', front, STEPS.x1, -RISE, 0.8, ...across(s, STEPS.half, STEPS.half + 1));
  return m.build();
}

/**
 * Two doors of two turning leaves apiece (41:23-24), carved with cherubim and palm trees (41:25):
 * each leaf folds back on itself as it opens.
 */
function FoldingDoors({ x, half, height, id, feature }: { x: number; half: number; height: number; id: string; feature: string }) {
  const open = useStore((s) => s.open[id]) ?? false;
  const mats = ezekielMaterials();
  const w = half / 2;
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(0.25, height - 0.05, w - 0.04);
    g.translate(0, (height - 0.05) / 2, -w / 2);
    worldUV(g, TILES.carved);
    return g;
  }, [height, w]);
  const k = useRef(open ? 1 : 0);
  const outer = useRef<(THREE.Group | null)[]>([]);
  const fold = useRef<(THREE.Group | null)[]>([]);
  const gl = useThree((s) => s.gl);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const target = open ? 1 : 0;
    if (Math.abs(target - k.current) < 0.0005) k.current = target;
    else {
      k.current += Math.sign(target - k.current) * Math.min(Math.abs(target - k.current), dt * 0.7);
      gl.shadowMap.needsUpdate = true;
    }
    const e = k.current * k.current * (3 - 2 * k.current);
    for (let i = 0; i < 2; i++) {
      const a = outer.current[i];
      const b = fold.current[i];
      if (a) a.rotation.y = (Math.PI / 2) * 0.92 * e;
      if (b) b.rotation.y = -Math.PI * 0.9 * e;
    }
  });
  return (
    <group userData={{ curtain: id, feature }}>
      {[1, -1].map((s, i) => (
        <group key={s} position={[x, 0.03, s * half]} scale={[1, 1, s]}>
          <group ref={(r) => (outer.current[i] = r)}>
            <mesh geometry={geo} material={mats.carved} castShadow receiveShadow />
            <group ref={(r) => (fold.current[i] = r)} position={[0, 0, -w]}>
              <mesh geometry={geo} material={mats.carved} castShadow receiveShadow />
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

/** "The altar of wood was three cubits high, and the length thereof two cubits... This is the table that is before the LORD" (41:22). */
function WoodenAltar() {
  const mats = ezekielMaterials();
  const geos = useMemo(() => {
    const m = new Mason(TILES);
    const { x, half: a, height: h } = WOOD_ALTAR;
    m.box('wood', x - a, x + a, 0, h - 0.3, -a, a);
    m.box('wood', x - a - 0.08, x + a + 0.08, h - 0.3, h - 0.1, -a - 0.08, a + 0.08);
    // its corners standing up a little
    for (const sx of [1, -1]) for (const sz of [1, -1]) m.box('wood', x + sx * a - (sx > 0 ? 0.3 : 0), x + sx * a + (sx > 0 ? 0 : 0.3), h - 0.1, h + 0.25, sz * a - (sz > 0 ? 0.3 : 0), sz * a + (sz > 0 ? 0 : 0.3));
    return m.build();
  }, []);
  return (
    <group userData={{ feature: 'woodaltar' }}>
      {Object.entries(geos).map(([k, g]) => (
        <mesh key={k} geometry={g} material={mats[k]} castShadow receiveShadow />
      ))}
    </group>
  );
}

/** Pillars by the posts of the porch, one on this side and another on that (40:49). */
function Pillars() {
  const mats = ezekielMaterials();
  const geo = useMemo(() => {
    const shaft = new THREE.CylinderGeometry(PILLAR.r * 0.92, PILLAR.r, PILLAR.height - 2.4, 20);
    shaft.translate(0, 1 + (PILLAR.height - 2.4) / 2, 0);
    return shaft;
  }, []);
  return (
    <group userData={{ feature: 'porch' }}>
      {PILLARS.map(([x, z]) => (
        <group key={z} position={[x, -RISE, z]}>
          <mesh position={[0, 0.5, 0]} material={mats.white} castShadow receiveShadow>
            <boxGeometry args={[PILLAR.r * 2.6, 1, PILLAR.r * 2.6]} />
          </mesh>
          <mesh geometry={geo} material={mats.white} castShadow receiveShadow />
          <mesh position={[0, PILLAR.height - 0.7, 0]} material={mats.white} castShadow>
            <cylinderGeometry args={[PILLAR.r * 1.6, PILLAR.r * 0.95, 1.4, 20]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * "The glory of the LORD filled the house" (43:5; 44:4): a soft brightness in the most holy place.
 * Nothing stands there: Ezekiel names no ark, cherubim or mercy seat.
 */
function Glory() {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    [],
  );
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.14 + 0.03 * Math.sin(clock.elapsedTime * 0.7);
  });
  const cx = (H.holiestX + H.holiestBack) / 2;
  return (
    <group userData={{ feature: 'holiest' }}>
      <mesh ref={ref} position={[cx, H.holiestHeight / 2, 0]} material={mat} raycast={() => null}>
        <boxGeometry args={[19.6, H.holiestHeight - 0.4, 19.6]} />
      </mesh>
      <pointLight position={[cx, 10, 0]} color="#fff0cf" intensity={60} distance={30} decay={1.2} />
    </group>
  );
}

export function House() {
  const geos = useMemo(buildHouse, []);
  const mats = ezekielMaterials();
  return (
    <group position={[0, Y.house, 0]}>
      <group userData={{ feature: 'house' }}>
        {Object.entries(geos).map(([k, g]) => (
          <mesh key={k} geometry={g} material={mats[k]} castShadow={k !== 'pave'} receiveShadow userData={k === 'carved' ? { feature: 'holy' } : undefined} />
        ))}
      </group>
      <Pillars />
      <FoldingDoors x={H.holyX + 0.3} half={H.door} height={DOOR_H} id="doors" feature="holy" />
      <FoldingDoors x={H.holiestX + 0.3} half={H.holiestDoor} height={INNER_DOOR_H} id="holiest" feature="holiest" />
      <WoodenAltar />
      <Glory />
      {/* light through the narrow windows and from lamps */}
      <pointLight position={[-92, 18, 0]} color="#ffd9a0" intensity={26} distance={50} decay={1.2} />
      <pointLight position={[-60, 14, 0]} color="#ffe2b8" intensity={10} distance={24} decay={1.2} />
    </group>
  );
}
