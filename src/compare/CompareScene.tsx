import { Html, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { Courtyard } from '../scene/Courtyard';
import { SkyDome, Wind } from '../scene/Environment';
import { Ark, BronzeAltar, IncenseAltar, Laver, Menorah, Table } from '../scene/Furniture';
import { TOON, toon } from '../scene/materials';
import { SkyLight } from '../scene/Sky';
import { Tent } from '../scene/Tent';
import { sandTexture } from '../scene/textures';
import { Courts as SecondCourts, Mount } from '../second/Courts';
import { Y as SY } from '../second/dims';
import { House as SecondHouse } from '../second/House';
import { Altar as SecondAltar, Laver as SecondLaver, Slaughter } from '../second/Vessels';
import { Courts as TempleCourts } from '../temple/Court';
import { PLAT } from '../temple/dims';
import { House as TempleHouse } from '../temple/House';
import { Interior } from '../temple/Interior';
import { Pillars } from '../temple/Pillars';
import { Platform } from '../temple/Platform';
import { pavementTexture, tex } from '../temple/textures';
import { Bases, BrassAltar, MoltenSea } from '../temple/Vessels';
import { useCompare, type Focus, type Shrine } from './state';

type Box3 = [x0: number, x1: number, z0: number, z1: number, h: number];

interface Layout {
  name: string;
  /** Moves the Most Holy Place of each onto x = 0, so the houses line up. */
  x: number;
  /** Where each stands, north to south, with its courts and without them. */
  courts: { z: number; y: number; box: Box3 };
  houses: { z: number; y: number; box: Box3 };
  /** Height for the label, above the house's floor level. */
  label: number;
  sub: string;
}

/** Local bounds (before the shift) are what the camera frames when you fly to one. */
export const LAYOUT: Record<Shrine, Layout> = {
  tabernacle: {
    name: 'The Tabernacle',
    x: 25,
    courts: { z: -175, y: 0, box: [-50, 50, -25, 25, 12] },
    houses: { z: -52, y: 0, box: [-32, 2, -8, 8, 12] },
    label: 18,
    sub: 'Tent 30 × 10 · court 100 × 50',
  },
  solomon: {
    name: 'Solomon’s Temple',
    x: 40,
    courts: { z: 0, y: 0, box: [-150, 230, -110, 110, 30] },
    houses: { z: 0, y: 0, box: [-69, 49, -29, 29, 36] },
    label: 46,
    sub: 'House 60 × 20 × 30',
  },
  second: {
    name: 'The Second Temple',
    x: 73,
    courts: { z: 340, y: 0, box: [-160, 340, -250, 310, 116] },
    houses: { z: 98, y: -SY.priests, box: [-100, 18, -50, 50, 100] },
    label: 125,
    sub: 'House 100 × 100 × 100',
  },
};
const SHRINES: Shrine[] = ['tabernacle', 'solomon', 'second'];

/** World-space bounds of one shrine, or all of them, in the current mode. */
function boundsOf(f: Focus, houses: boolean) {
  const list = f === 'all' ? SHRINES : [f];
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  let h = 0;
  for (const s of list) {
    const L = LAYOUT[s];
    const m = houses ? L.houses : L.courts;
    x0 = Math.min(x0, m.box[0] + L.x);
    x1 = Math.max(x1, m.box[1] + L.x);
    z0 = Math.min(z0, m.box[2] + m.z);
    z1 = Math.max(z1, m.box[3] + m.z);
    h = Math.max(h, m.box[4] + m.y + (houses && s === 'second' ? SY.priests : 0));
  }
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, r: Math.hypot(x1 - x0, z1 - z0) / 2, h };
}

/** A paved pad for a house when its courts are hidden, or sand under the tabernacle. */
function Pad({ w, d, kind, x }: { w: number; d: number; kind: 'sand' | 'pave'; x: number }) {
  const mat = useMemo(
    () =>
      kind === 'sand'
        ? toon('ground', { map: sandTexture(), color: TOON ? '#ffffff' : '#ffe0b4' })
        : toon('c-pad', { map: tex(pavementTexture('c-pad', '#ddd0b2')) }),
    [kind],
  );
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.translate(x, 0, 0);
    if (kind === 'pave') {
      const p = g.attributes.position as THREE.BufferAttribute;
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 6, -p.getZ(i) / 6);
    }
    return g;
  }, [w, d, x, kind]);
  return <mesh geometry={geo} material={mat} receiveShadow />;
}

/** One shrine on the ground: its house, and its courts unless only the houses are shown. Slides between the two layouts. */
function Placed({ id, house, courts, pad }: { id: Shrine; house: ReactNode; courts: ReactNode; pad?: ReactNode }) {
  const housesOnly = useCompare((s) => s.housesOnly);
  const L = LAYOUT[id];
  const g = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  useFrame((_, dt) => {
    const m = housesOnly ? L.houses : L.courts;
    const o = g.current;
    if (!o) return;
    const k = Math.min(1, dt * 3);
    const dz = m.z - o.position.z;
    const dy = m.y - o.position.y;
    if (Math.abs(dz) + Math.abs(dy) < 0.01) return;
    o.position.z += Math.abs(dz) < 0.05 ? dz : dz * k;
    o.position.y += Math.abs(dy) < 0.05 ? dy : dy * k;
    gl.shadowMap.needsUpdate = true;
  });
  return (
    <group ref={g} position={[L.x, L.courts.y, L.courts.z]}>
      {house}
      <group visible={!housesOnly}>{courts}</group>
      {housesOnly && pad}
      <Label id={id} />
    </group>
  );
}

function Label({ id }: { id: Shrine }) {
  const L = LAYOUT[id];
  const setFocus = useCompare((s) => s.setFocus);
  const focus = useCompare((s) => s.focus);
  const y = L.label + (id === 'second' ? SY.house - SY.priests : 0);
  return (
    <Html position={[L.houses.box[0] + (L.houses.box[1] - L.houses.box[0]) / 2, y, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <button
        className={`cmp-label ${focus === id ? 'on' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setFocus(id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <b>{L.name}</b>
        <span>{L.sub}</span>
      </button>
    </Html>
  );
}

/**
 * The camera: it circles the scene on its own (pause it with the Orbit button), and you can drag to
 * turn, pinch or scroll to zoom, and two-finger drag to pan. Choosing a shrine flies there.
 */
function Camera() {
  const controls = useRef<OrbitImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const { focus, focusTick, orbit, housesOnly } = useCompare();
  const goal = useRef<{ target: THREE.Vector3; dist: number } | null>(null);

  useEffect(() => {
    const b = boundsOf(focus, housesOnly);
    const aspect = size.width / Math.max(1, size.height);
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const fov = Math.min(vfov, hfov);
    const r = Math.max(b.r, b.h * 0.8);
    goal.current = { target: new THREE.Vector3(b.x, b.h * 0.25, b.z), dist: (r / Math.sin(fov / 2)) * 0.95 };
  }, [focus, focusTick, housesOnly, size, camera]);

  // start from the east, a little south, so the three stand across the view
  useEffect(() => {
    const b = boundsOf('all', false);
    camera.position.set(b.x + 900, 480, b.z + 260);
    camera.lookAt(b.x, 0, b.z);
  }, [camera]);

  useFrame((_, dtRaw) => {
    const c = controls.current;
    if (!c) return;
    const g = goal.current;
    if (g) {
      // by real time, so a slow device still arrives in a second or two
      const k = Math.min(1, Math.min(dtRaw, 0.5) * 2.2);
      c.target.lerp(g.target, k);
      const off = camera.position.clone().sub(c.target);
      const len = off.length();
      const want = len + (g.dist - len) * k;
      camera.position.copy(c.target).add(off.multiplyScalar(want / len));
      if (c.target.distanceTo(g.target) < 0.5 && Math.abs(want - g.dist) < 0.5) goal.current = null;
    }
    // keep depth precision where the camera is: the nearer it is, the nearer the near plane
    const d = camera.position.distanceTo(c.target);
    const near = THREE.MathUtils.clamp(d / 400, 0.3, 4);
    if (Math.abs(camera.near - near) > 0.05) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      autoRotate={orbit}
      autoRotateSpeed={-0.5}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2 - 0.06}
      minDistance={12}
      maxDistance={2600}
      onStart={() => (goal.current = null)}
    />
  );
}

/** Sun and shadow, sized to whatever is in view (all three with their courts, or the houses). */
function Sun() {
  const housesOnly = useCompare((s) => s.housesOnly);
  const light = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    const b = boundsOf('all', housesOnly);
    const dir = new THREE.Vector3(240, 160, 135).normalize();
    l.target.position.set(b.x, 0, b.z);
    l.position.set(b.x, 0, b.z).addScaledVector(dir, 900);
    scene.add(l.target);
    const r = b.r + 30;
    const cam = l.shadow.camera;
    cam.left = -r;
    cam.right = r;
    cam.top = r;
    cam.bottom = -r;
    cam.near = 100;
    cam.far = 2000;
    cam.updateProjectionMatrix();
    gl.shadowMap.needsUpdate = true;
    return () => {
      scene.remove(l.target);
    };
  }, [housesOnly, scene, gl]);
  return (
    <directionalLight
      ref={light}
      intensity={TOON ? 2.5 : 3.1}
      color="#ffdcae"
      castShadow
      shadow-mapSize={[4096, 4096]}
      shadow-bias={-0.0006}
      shadow-normalBias={0.08}
    />
  );
}

function Ground() {
  const mat = useMemo(() => toon('ground', { map: sandTexture(), color: TOON ? '#ffffff' : '#ffe0b4' }), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[150, -0.4, 150]} receiveShadow material={mat}>
      <planeGeometry args={[9000, 9000]} />
    </mesh>
  );
}

/**
 * The tabernacle, Solomon's Temple and the second temple side by side, all at one scale (a cubit is
 * a world unit), facing east with their Most Holy Places on one north–south line.
 */
export function CompareWorld() {
  return (
    <>
      {TOON ? <SkyDome /> : <SkyLight sun={[240, 160, 135]} haze="#ecdcbf" ground="#c09a68" light={0.45} />}
      <fog attach="fog" args={['#ecdcbf', 1600, 6000]} />
      <hemisphereLight args={['#a9b6e8', '#c49460', TOON ? 1.05 : 0.45]} />
      <Sun />
      <Wind />
      <Ground />
      <Camera />
      <Placed
        id="tabernacle"
        house={
          <>
            <Tent />
            <Ark />
            <Table />
            <Menorah />
            <IncenseAltar />
            <Pad w={130} d={80} kind="sand" x={0} />
          </>
        }
        courts={
          <>
            <Courtyard />
            <BronzeAltar />
            <Laver />
          </>
        }
      />
      <Placed
        id="solomon"
        house={
          <>
            <Platform />
            <group position={[0, PLAT.h, 0]}>
              <TempleHouse />
              <Pillars />
              <Interior />
            </group>
          </>
        }
        courts={
          <>
            <TempleCourts />
            <BrassAltar />
            <MoltenSea />
            <Bases />
          </>
        }
        pad={<Pad w={150} d={84} kind="pave" x={-10} />}
      />
      <Placed
        id="second"
        house={<SecondHouse />}
        courts={
          <>
            <Mount />
            <SecondCourts />
            <SecondAltar />
            <SecondLaver />
            <Slaughter />
          </>
        }
        pad={
          <group position={[0, SY.priests, 0]}>
            <Pad w={150} d={130} kind="pave" x={-41} />
          </group>
        }
      />
    </>
  );
}
