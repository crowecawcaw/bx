import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Cloth } from '../scene/Cloth';
import { cloth, pureGold, toon } from '../scene/materials';
import { veilTexture } from '../scene/textures';
import { useStore } from '../store';
import {
  CHAMBER_BACK,
  CHAMBER_IN,
  CHAMBER_OUT,
  CHAMBER_TOP,
  DOOR,
  HOUSE,
  ORACLE_DOOR,
  OUT,
  PORCH,
} from './dims';
import { Mason, worldUV } from './mason';
import {
  ashlarTexture,
  carvedGoldTexture,
  cedarTexture,
  ceilingTexture,
  goldFloorTexture,
  plainGoldTexture,
  tex,
} from './textures';

const { halfWidth: HW, oracleX, partitionX, frontX, height: H, oracleHeight: OH, partition } = HOUSE;
const P0 = partitionX - partition / 2;
const P1 = partitionX + partition / 2;
const REST1 = 6; // first narrowed rest: top of the nethermost storey and its floor
const REST2 = 12;
const TOWER = PORCH.height;

/** Eight narrow windows a side, high in the walls of the Holy Place (1 Kgs 6:4). */
export const WINDOWS_X = Array.from({ length: 8 }, (_, i) => P1 + 2.5 + i * 5);
const WIN: [number, number] = [19.5, 27];

export const TILES: Record<string, [number, number]> = {
  stone: [8, 3],
  carved: [5, 10],
  floor: [4, 4],
  ceiling: [5, 5],
  gold: [3, 3],
  roof: [6, 6],
  cedar: [2, 6],
};

let mats: Record<string, THREE.Material> | null = null;
export function templeMaterials() {
  if (mats) return mats;
  const goldish = { emissive: '#3c2600', emissiveIntensity: 0.4 };
  mats = {
    stone: toon('t-stone', { map: tex(ashlarTexture()) }),
    carved: toon('t-carved', { map: tex(carvedGoldTexture()), ...goldish }),
    floor: toon('t-floor', { map: tex(goldFloorTexture()), ...goldish }),
    ceiling: toon('t-ceiling', { map: tex(ceilingTexture()), ...goldish }),
    gold: toon('t-gold', { map: tex(plainGoldTexture()), ...goldish }),
    roof: toon('t-roof', { color: '#cbb894' }),
    cedar: toon('t-cedar', { map: tex(cedarTexture()) }),
  };
  return mats;
}

function buildHouse() {
  const m = new Mason(TILES);
  const windows = WINDOWS_X.map((x): [number, number, number, number] => [x - 0.6, x + 0.6, WIN[0], WIN[1]]);
  for (const s of [1, -1]) {
    const across = (a: number, b: number): [number, number] => (s > 0 ? [a, b] : [-b, -a]);
    // the side walls step in a cubit at each storey of chambers (1 Kgs 6:6)
    m.wall('stone', 'x', BACK_AT(0), PORCH.backX, 0, REST1, ...across(HW, OUT));
    m.wall('stone', 'x', BACK_AT(1), PORCH.backX, REST1, REST2, ...across(HW, OUT - 1));
    m.wall('stone', 'x', BACK_AT(2), PORCH.backX, REST2, H, ...across(HW, OUT - 2), windows);
    // cedar lined, carved and overlaid with gold within (1 Kgs 6:15-18, 29)
    m.wall('carved', 'x', P1, frontX, 0, H, ...across(HW - 0.05, HW), windows);
    m.wall('carved', 'x', oracleX, P0, 0, OH, ...across(HW - 0.05, HW));
    // window reveals lined with gold
    for (const [a0, a1] of windows) {
      m.box('gold', a0, a1, WIN[0] - 0.05, WIN[0], ...across(HW, OUT - 2));
      m.box('gold', a0 - 0.05, a0, WIN[0], WIN[1], ...across(HW, OUT - 2));
      m.box('gold', a1, a1 + 0.05, WIN[0], WIN[1], ...across(HW, OUT - 2));
    }

    // the chambers round about (1 Kgs 6:5-10): outer wall, east end wall and roof
    m.box('stone', CHAMBER_BACK, OUT, 0, CHAMBER_TOP + 0.8, ...across(CHAMBER_IN, CHAMBER_OUT));
    m.box('stone', OUT - 3, OUT, 0, CHAMBER_TOP + 0.8, ...across(OUT - 2, CHAMBER_IN));
    m.box('roof', CHAMBER_BACK, OUT - 3, CHAMBER_TOP, CHAMBER_TOP + 0.8, ...across(OUT - 2, CHAMBER_IN));
    m.box('stone', CHAMBER_BACK - 0.3, OUT + 0.3, CHAMBER_TOP + 0.8, CHAMBER_TOP + 1.3, ...across(CHAMBER_IN + 1.5, CHAMBER_OUT + 0.3));

    // porch side walls rising into the tower (2 Chr 3:4), gold within
    m.box('stone', PORCH.backX, PORCH.faceX, 0, TOWER, ...across(HW, OUT));
    m.box('gold', PORCH.backX, PORCH.faceX, 0, PORCH.opening, ...across(HW - 0.05, HW));
  }
  // west wall behind the oracle, stepping in like the sides
  m.box('stone', BACK_AT(0), oracleX, 0, REST1, -HW, HW);
  m.box('stone', BACK_AT(1), oracleX, REST1, REST2, -HW, HW);
  m.box('stone', BACK_AT(2), oracleX, REST2, H, -HW, HW);
  m.box('carved', oracleX, oracleX + 0.05, 0, OH, -HW, HW);
  // west chambers and roof
  m.box('stone', CHAMBER_BACK, CHAMBER_BACK + 3, 0, CHAMBER_TOP + 0.8, -CHAMBER_OUT, CHAMBER_OUT);
  m.box('roof', CHAMBER_BACK + 3, BACK_AT(2), CHAMBER_TOP, CHAMBER_TOP + 0.8, -(OUT - 2), OUT - 2);
  m.box('stone', CHAMBER_BACK - 0.3, CHAMBER_BACK + 1.5, CHAMBER_TOP + 0.8, CHAMBER_TOP + 1.3, -CHAMBER_OUT - 0.3, CHAMBER_OUT + 0.3);

  // east wall with the door of the temple; it rises on as the back of the tower
  const door: [number, number, number, number] = [-DOOR.half, DOOR.half, 0, DOOR.height];
  m.wall('stone', 'z', -HW, HW, 0, TOWER, frontX, PORCH.backX, [door]);
  m.wall('stone', 'z', -OUT, -HW, H, TOWER, frontX, PORCH.backX);
  m.wall('stone', 'z', HW, OUT, H, TOWER, frontX, PORCH.backX);
  m.wall('carved', 'z', -HW, HW, 0, H, frontX - 0.05, frontX, [door]);
  m.wall('gold', 'z', -HW, HW, 0, PORCH.opening, PORCH.backX, PORCH.backX + 0.05, [door]);
  // olive-wood posts overlaid with gold (1 Kgs 6:33; 2 Chr 3:7)
  for (const s of [1, -1]) m.box('gold', frontX - 0.15, PORCH.backX + 0.15, 0, DOOR.height, ...(s > 0 ? [DOOR.half - 0.12, DOOR.half] : [-DOOR.half, -DOOR.half + 0.12]) as [number, number]);
  m.box('gold', frontX - 0.15, PORCH.backX + 0.15, DOOR.height - 0.12, DOOR.height + 0.2, -DOOR.half - 0.1, DOOR.half + 0.1);
  m.box('gold', frontX, PORCH.backX, -0.02, 0.04, -DOOR.half, DOOR.half);

  // the cedar partition before the oracle, carved and overlaid with gold on both faces
  const odoor: [number, number, number, number] = [-ORACLE_DOOR.half, ORACLE_DOOR.half, 0, ORACLE_DOOR.height];
  m.wall('carved', 'z', -HW, HW, 0, H, P0, P1, [odoor]);
  for (const s of [1, -1]) m.box('gold', P0 - 0.1, P1 + 0.1, 0, ORACLE_DOOR.height, ...(s > 0 ? [ORACLE_DOOR.half - 0.1, ORACLE_DOOR.half] : [-ORACLE_DOOR.half, -ORACLE_DOOR.half + 0.1]) as [number, number]);
  m.box('gold', P0 - 0.1, P1 + 0.1, ORACLE_DOOR.height - 0.1, ORACLE_DOOR.height + 0.25, -ORACLE_DOOR.half - 0.1, ORACLE_DOOR.half + 0.1);

  // floors of fir overlaid with gold (1 Kgs 6:15, 30), ceilings, roof
  m.box('floor', oracleX, frontX, -0.05, 0.02, -HW, HW);
  m.box('ceiling', oracleX, P0, OH, OH + 0.4, -HW, HW);
  m.box('ceiling', P1, frontX, H - 0.05, H, -HW, HW);
  m.box('roof', BACK_AT(2), frontX, H, H + 1, -(OUT - 2), OUT - 2);
  m.box('stone', BACK_AT(2) - 0.4, frontX, H + 0.6, H + 1.4, -(OUT - 2) - 0.4, OUT - 2 + 0.4);

  // the porch: open front with the tower above, a gold ceiling, cornices
  m.box('stone', PORCH.frontX, PORCH.faceX, PORCH.opening, TOWER, -HW, HW);
  m.box('gold', PORCH.backX, PORCH.frontX, PORCH.opening, PORCH.opening + 0.5, -HW, HW);
  m.box('gold', PORCH.frontX, PORCH.faceX, PORCH.opening - 0.6, PORCH.opening, -HW, HW);
  m.box('roof', frontX, PORCH.faceX, TOWER - 0.5, TOWER, -OUT, OUT);
  m.box('stone', frontX - 0.6, PORCH.faceX + 0.6, TOWER - 3, TOWER - 1.8, -OUT - 0.6, OUT + 0.6);
  m.box('stone', frontX - 0.9, PORCH.faceX + 0.9, TOWER, TOWER + 0.8, -OUT - 0.9, OUT + 0.9);
  m.box('stone', frontX - 0.4, PORCH.faceX + 0.4, H, H + 0.8, -OUT - 0.4, OUT + 0.4);

  // door of the middle chamber, on the right (south) side (1 Kgs 6:8)
  m.box('cedar', -21.5, -18.5, 0, 5.5, CHAMBER_OUT, CHAMBER_OUT + 0.12);
  m.box('stone', -22.2, -17.8, 5.5, 6.3, CHAMBER_OUT, CHAMBER_OUT + 0.3);
  return m.build();
}

/** West face of the house wall at storey 0, 1, 2. */
function BACK_AT(storey: number) {
  return oracleX - HOUSE.wall + storey * HOUSE.rest;
}

/** Eased progress toward open (1) or closed (0); redraws shadows while moving. */
function useSwing(open: boolean, speed = 1.6) {
  const k = useRef(open ? 1 : 0);
  const gl = useThree((s) => s.gl);
  return (dt: number) => {
    const target = open ? 1 : 0;
    const d = target - k.current;
    if (Math.abs(d) < 0.0005) {
      k.current = target;
      return { k: k.current, moving: false };
    }
    k.current += Math.sign(d) * Math.min(Math.abs(d), dt * speed);
    gl.shadowMap.needsUpdate = true;
    return { k: k.current, moving: true };
  };
}

const ease = (t: number) => t * t * (3 - 2 * t);

/** A leaf hinged on its local origin, running along +x. UVs follow the leaf's own position on the door. */
function leafGeometry(w: number, h: number, t: number, uOffset: number, tile: [number, number]) {
  const g = new THREE.BoxGeometry(w, h, t);
  g.translate(uOffset + w / 2, h / 2, 0);
  worldUV(g, tile);
  g.translate(-uOffset, 0, 0);
  return g;
}

/** Two doors of fir, each of two folding leaves, in the door of the temple (1 Kgs 6:34). */
function TempleDoors() {
  const open = useStore((s) => s.open.doors);
  const swing = useSwing(open, 0.9);
  const m = templeMaterials();
  const lw = DOOR.half / 2;
  const geo = useMemo(
    () => [0, 1, 2, 3].map((i) => leafGeometry(lw - 0.02, DOOR.height - 0.05, 0.18, i * lw, TILES.carved)),
    [lw],
  );
  const doors = useRef<(THREE.Group | null)[]>([]);
  const folds = useRef<(THREE.Group | null)[]>([]);
  useFrame((_, dt) => {
    const { k } = swing(Math.min(dt, 0.05));
    const e = ease(k);
    [1, -1].forEach((s, i) => {
      const d = doors.current[i];
      const f = folds.current[i];
      if (d) d.rotation.y = s * (Math.PI / 2 + (Math.PI / 2) * e);
      if (f) f.rotation.y = s * -(Math.PI - 0.14) * e;
    });
  });
  return (
    <group userData={{ curtain: 'doors', feature: 'doors' }}>
      {[1, -1].map((s, i) => (
        <group key={s} ref={(r) => (doors.current[i] = r)} position={[frontX - 0.12, 0, s * DOOR.half]}>
          <mesh geometry={geo[s > 0 ? 0 : 3]} material={m.carved} castShadow />
          <group ref={(r) => (folds.current[i] = r)} position={[lw, 0, s * -0.17]}>
            <mesh geometry={geo[s > 0 ? 1 : 2]} material={m.carved} castShadow />
          </group>
          {/* hinges of gold (1 Kgs 7:50) */}
          {[1.2, DOOR.height / 2, DOOR.height - 1.2].map((y) => (
            <mesh key={y} position={[0.02, y, 0]} material={pureGold()}>
              <cylinderGeometry args={[0.09, 0.09, 0.7, 8]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Two doors of olive wood carved and overlaid with gold, opening into the Holy Place (1 Kgs 6:31-32). */
function OracleDoors() {
  const open = useStore((s) => s.open.oracleDoors);
  const swing = useSwing(open, 0.9);
  const m = templeMaterials();
  const w = ORACLE_DOOR.half;
  const geo = useMemo(() => [0, 1].map((i) => leafGeometry(w - 0.03, ORACLE_DOOR.height - 0.05, 0.16, i * w, [4, 8])), [w]);
  const leaves = useRef<(THREE.Group | null)[]>([]);
  useFrame((_, dt) => {
    const { k } = swing(Math.min(dt, 0.05));
    const e = ease(k);
    [1, -1].forEach((s, i) => {
      const l = leaves.current[i];
      if (l) l.rotation.y = s * (Math.PI / 2) * (1 - e);
    });
  });
  return (
    <group userData={{ curtain: 'oracleDoors', feature: 'entrance' }}>
      {[1, -1].map((s, i) => (
        <group key={s} ref={(r) => (leaves.current[i] = r)} position={[P1 + 0.1, 0, s * ORACLE_DOOR.half]}>
          <mesh geometry={geo[i]} material={m.carved} castShadow />
          {[1, ORACLE_DOOR.height - 1].map((y) => (
            <mesh key={y} position={[0.02, y, 0]} material={pureGold()}>
              <cylinderGeometry args={[0.08, 0.08, 0.6, 8]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** The veil of blue, purple, crimson and fine linen with cherubim (2 Chr 3:14), just inside the doors. */
function Veil() {
  const open = useStore((s) => s.open.veil);
  const mat = useMemo(() => cloth('templeVeil', veilTexture()), []);
  const w = ORACLE_DOOR.half * 2 + 0.8;
  const h = ORACLE_DOOR.height + 0.3;
  const x = P0 - 0.55;
  return (
    <group userData={{ feature: 'entrance' }}>
      <mesh position={[x, h + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={pureGold()}>
        <cylinderGeometry args={[0.05, 0.05, w + 0.4, 8]} />
      </mesh>
      <group position={[x, h, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Cloth
          width={w}
          height={h - 0.05}
          material={mat}
          open={open ? 1 : 0}
          foldWidth={0.6}
          foldDepth={0.08}
          userData={{ curtain: 'veil', feature: 'entrance' }}
        />
      </group>
    </group>
  );
}

/** "A partition by the chains of gold before the oracle" (1 Kgs 6:21): swags across the partition. */
function Chains() {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const x = P1 + 0.25;
    for (const [y, sag, n] of [
      [ORACLE_DOOR.height + 1.4, 1.1, 5],
      [ORACLE_DOOR.height + 3.6, 0.8, 4],
    ] as const) {
      const span = (HW * 2) / n;
      for (let i = 0; i < n; i++) {
        const z0 = -HW + i * span;
        const pts = Array.from({ length: 13 }, (_, k) => {
          const t = k / 12;
          return new THREE.Vector3(x + Math.sin(t * Math.PI) * 0.25, y - Math.sin(t * Math.PI) * sag, z0 + t * span);
        });
        parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 5, false));
      }
    }
    // pendant chains where the swags meet
    for (let i = 1; i < 5; i++) {
      const z = -HW + i * 4;
      const g = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 5);
      g.translate(x, ORACLE_DOOR.height + 0.6, z);
      parts.push(g.toNonIndexed());
    }
    const strip = parts.map((p) => {
      const n = p.index ? p.toNonIndexed() : p;
      return n;
    });
    const merged = new THREE.BufferGeometry();
    const pos: number[] = [];
    const nor: number[] = [];
    for (const p of strip) {
      pos.push(...(p.attributes.position.array as Float32Array));
      nor.push(...(p.attributes.normal.array as Float32Array));
    }
    merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return merged;
  }, []);
  return <mesh geometry={geo} material={pureGold()} userData={{ feature: 'entrance' }} />;
}

export function House() {
  const geos = useMemo(buildHouse, []);
  const m = templeMaterials();
  return (
    <group>
      {Object.entries(geos).map(([k, g]) => (
        <mesh key={k} geometry={g} material={m[k]} castShadow={k !== 'floor' && k !== 'ceiling'} receiveShadow userData={{ feature: k === 'carved' ? 'holy' : 'house' }} />
      ))}
      <TempleDoors />
      <OracleDoors />
      <Veil />
      <Chains />
    </group>
  );
}
