import { Outlines } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { Cloth } from './Cloth';
import { TENT } from './dims';
import { bronze, cloth, gold, INK, silver, toon } from './materials';
import { DOOR_PILLAR_X, DOOR_PILLARS_Z, DOOR_SCREEN_X, VEIL_PILLAR_X, VEIL_PILLARS_Z } from './nav';
import { goatHairTexture, innerCurtainTexture, needleworkTexture, skinTexture, veilTexture } from './textures';

const T = TENT.boardThickness;
const HW = TENT.halfWidth;
const OUT = HW + T; // outer face of the side walls (z = ±6)
const BACK = TENT.backX - T; // outer face of the west wall (x = -31)
const TOP = TENT.height;
const BAR_CLEAR = 0.28; // coverings hang clear of the bars and rings

interface Board {
  x: number;
  z: number;
  w: number; // along the wall
  alongX: boolean;
}

/** 48 boards: 20 south, 20 north, 6 west + 2 corner boards (Ex 26:18-23). */
function boards(): Board[] {
  const out: Board[] = [];
  const bw = TENT.boardWidth;
  for (let i = 0; i < TENT.boardsPerSide; i++) {
    const x = TENT.frontX - bw / 2 - i * bw;
    out.push({ x, z: HW + T / 2, w: bw, alongX: true });
    out.push({ x, z: -HW - T / 2, w: bw, alongX: true });
  }
  for (let i = 0; i < TENT.westBoards; i++) {
    out.push({ x: TENT.backX - T / 2, z: -4.5 + bw / 2 + i * bw, w: bw, alongX: false });
  }
  // corner boards: ½ cubit closes the interior, 1 cubit covers the end of the side wall
  out.push({ x: TENT.backX - T / 2, z: 4.5 + bw / 2, w: bw, alongX: false });
  out.push({ x: TENT.backX - T / 2, z: -4.5 - bw / 2, w: bw, alongX: false });
  return out;
}

function useInstances(ref: React.RefObject<THREE.InstancedMesh>, mats: THREE.Matrix4[]) {
  useLayoutEffect(() => {
    mats.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [mats, ref]);
}

function Walls() {
  const list = useMemo(boards, []);
  const boardRef = useRef<THREE.InstancedMesh>(null);
  const socketRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.InstancedMesh>(null);
  const tenonRef = useRef<THREE.InstancedMesh>(null);

  const { boardM, socketM, ringM, tenonM } = useMemo(() => {
    const boardM: THREE.Matrix4[] = [];
    const socketM: THREE.Matrix4[] = [];
    const ringM: THREE.Matrix4[] = [];
    const tenonM: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    for (const b of list) {
      const rot = b.alongX ? q : qy;
      // board: unit box scaled to 1.5 wide x 10 high x 1 thick, sitting on its sockets
      boardM.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(b.x, 0.45 + (TOP - 0.45) / 2, b.z),
          rot,
          new THREE.Vector3(b.w - 0.03, TOP - 0.45, T),
        ),
      );
      // two tenons -> two silver sockets per board (Ex 26:19)
      for (const s of [-0.375, 0.375]) {
        const off = b.alongX ? new THREE.Vector3(s, 0, 0) : new THREE.Vector3(0, 0, s);
        socketM.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(b.x, 0.25, b.z).add(off),
            rot,
            new THREE.Vector3(0.72, 0.5, T + 0.08),
          ),
        );
        tenonM.push(
          new THREE.Matrix4().compose(new THREE.Vector3(b.x, 0.47, b.z).add(off), rot, new THREE.Vector3(0.3, 0.1, 0.4)),
        );
      }
      // gold rings for the bars, on the outside face (Ex 26:29)
      const outward = b.alongX ? new THREE.Vector3(0, 0, Math.sign(b.z) * (T / 2 + 0.05)) : new THREE.Vector3(-(T / 2 + 0.05), 0, 0);
      for (const y of [2, 5, 8]) {
        ringM.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(b.x, y, b.z).add(outward),
            b.alongX ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2) : q,
            new THREE.Vector3(1, 1, 1),
          ),
        );
      }
    }
    // the two veil pillars' silver sockets complete the hundred (Ex 38:27)
    for (const z of VEIL_PILLARS_Z) {
      socketM.push(new THREE.Matrix4().compose(new THREE.Vector3(VEIL_PILLAR_X, 0.25, z), q, new THREE.Vector3(0.72, 0.5, 0.72)));
    }
    return { boardM, socketM, ringM, tenonM };
  }, [list]);

  useInstances(boardRef, boardM);
  useInstances(socketRef, socketM);
  useInstances(ringRef, ringM);
  useInstances(tenonRef, tenonM);

  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const ring = useMemo(() => new THREE.TorusGeometry(0.16, 0.04, 6, 14), []);

  // Five bars per side: middle bar end to end, the others in two lengths (Ex 26:26-28)
  const bars = useMemo(() => {
    const r = 0.09;
    const out: { p: [number, number, number]; len: number; alongX: boolean }[] = [];
    const len = TENT.boardsPerSide * TENT.boardWidth;
    for (const side of [1, -1]) {
      const z = side * (OUT + 0.12);
      out.push({ p: [-len / 2, 5, z], len, alongX: true });
      for (const y of [2, 8]) {
        out.push({ p: [-len / 4, y, z], len: len / 2 - 0.1, alongX: true });
        out.push({ p: [(-len * 3) / 4, y, z], len: len / 2 - 0.1, alongX: true });
      }
    }
    const wx = BACK - 0.12;
    out.push({ p: [wx, 5, 0], len: OUT * 2, alongX: false });
    for (const y of [2, 8]) {
      out.push({ p: [wx, y, -OUT / 2], len: OUT - 0.1, alongX: false });
      out.push({ p: [wx, y, OUT / 2], len: OUT - 0.1, alongX: false });
    }
    return { r, out };
  }, []);

  return (
    <group userData={{ feature: 'boards' }}>
      <instancedMesh ref={boardRef} args={[box, gold(), boardM.length]} castShadow receiveShadow>
        <Outlines thickness={1.2} color={INK} />
      </instancedMesh>
      <instancedMesh ref={socketRef} args={[box, silver(), socketM.length]} castShadow receiveShadow>
        <Outlines thickness={1.2} color={INK} />
      </instancedMesh>
      <instancedMesh ref={tenonRef} args={[box, toon('acaciaDark', { color: '#7a4a26' }), tenonM.length]} />
      <instancedMesh ref={ringRef} args={[ring, gold(), ringM.length]} />
      {bars.out.map((b, i) => (
        <mesh
          key={i}
          position={b.p}
          rotation={b.alongX ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}
          material={gold()}
          castShadow
        >
          <cylinderGeometry args={[bars.r, bars.r, b.len, 8]} />
        </mesh>
      ))}
      {/* corner boards coupled together at the top in one ring (Ex 26:24) */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[BACK + 0.05, TOP - 0.4, s * (OUT - 0.05)]} rotation={[0, Math.PI / 4, 0]} material={gold()}>
          <torusGeometry args={[0.22, 0.05, 6, 16]} />
        </mesh>
      ))}
    </group>
  );
}

/** One layer of covering: drapes over the sides and top, extruded along the length. */
function drapeGeometry(opts: {
  off: number;
  sideBottom: number;
  backBottom: number;
  frontX: number;
  /** cubits of cloth per texture repeat along the length (curtain width = 4) */
  uScale: number;
  /** cubits of cloth per texture repeat across the drape */
  vScale: number;
  folds: number;
}) {
  const { off, sideBottom, backBottom, frontX, uScale, vScale, folds } = opts;
  const z0 = OUT + BAR_CLEAR + off;
  const top = TOP + off;
  const back = BACK - BAR_CLEAR - off;
  // cross-section profile (z, y), from south hem over the top to north hem
  const sideLen = top - sideBottom;
  const profile: [number, number, number][] = []; // z, y, s (arc length)
  const sideSegs = Math.max(2, Math.ceil(sideLen * 1.5));
  for (let i = 0; i <= sideSegs; i++) profile.push([z0, sideBottom + (sideLen * i) / sideSegs, (sideLen * i) / sideSegs]);
  const topSegs = 12;
  for (let i = 1; i <= topSegs; i++) profile.push([z0 - (2 * z0 * i) / topSegs, top, sideLen + (2 * z0 * i) / topSegs]);
  for (let i = 1; i <= sideSegs; i++)
    profile.push([-z0, top - (sideLen * i) / sideSegs, sideLen + 2 * z0 + (sideLen * i) / sideSegs]);

  const length = frontX - back;
  const xs = Math.ceil(length * 4);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const cols = profile.length;
  for (let i = 0; i <= xs; i++) {
    const d = (length * i) / xs; // distance from the front
    const x = frontX - d;
    for (const [z, y, s] of profile) {
      // vertical folds on the hanging sides, deeper toward the hem
      const hang = y < top - 0.01 ? (top - y) / sideLen : 0;
      const f = folds * hang * Math.sin(d * 5.2) * (0.6 + 0.4 * Math.sin(d * 1.3));
      pos.push(x, y, z + Math.sign(z) * f);
      uv.push(d / uScale, s / vScale);
    }
  }
  for (let i = 0; i < xs; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      const b = a + cols;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();

  // back drape hanging over the west end
  const backLen = top - backBottom;
  const bw = 2 * z0;
  const bg = new THREE.PlaneGeometry(bw, backLen, 24, Math.ceil(backLen * 1.5));
  const bp = bg.attributes.position as THREE.BufferAttribute;
  const buv = bg.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) {
    const lx = bp.getX(i);
    const ly = bp.getY(i);
    const down = (backLen / 2 - ly) / backLen;
    const f = folds * down * Math.sin(lx * 5.2);
    // plane in yz at x = back; u continues the length, v follows the cross-profile
    bp.setXYZ(i, back - f, top - backLen / 2 + ly, lx);
    buv.setXY(i, (length + (backLen / 2 - ly)) / uScale, (sideLen + (z0 - lx)) / vScale);
  }
  bg.computeVertexNormals();
  return { wrap: g, back: bg };
}

function Covering({
  material,
  off,
  sideBottom,
  backBottom,
  uScale,
  vScale,
  folds = 0.06,
}: {
  material: THREE.Material;
  off: number;
  sideBottom: number;
  backBottom: number;
  uScale: number;
  vScale: number;
  folds?: number;
}) {
  const g = useMemo(
    () => drapeGeometry({ off, sideBottom, backBottom, frontX: TENT.frontX + off * 0.5, uScale, vScale, folds }),
    [off, sideBottom, backBottom, uScale, vScale, folds],
  );
  return (
    <group>
      <mesh geometry={g.wrap} material={material} castShadow receiveShadow />
      <mesh geometry={g.back} material={material} castShadow receiveShadow />
    </group>
  );
}

/** Clasps joining the two sets of curtains, following the drape profile (Ex 26:6, 11). */
function Clasps({ x, off, bottom, count, material }: { x: number; off: number; bottom: number; count: number; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(() => {
    const z0 = OUT + BAR_CLEAR + off;
    const top = TOP + off;
    const side = top - bottom;
    const total = side * 2 + z0 * 2;
    const out: THREE.Matrix4[] = [];
    for (let i = 0; i < count; i++) {
      const s = ((i + 0.5) / count) * total;
      let p: THREE.Vector3;
      let rot = new THREE.Euler(0, 0, 0);
      if (s < side) {
        p = new THREE.Vector3(x, bottom + s, z0 + 0.03);
      } else if (s < side + 2 * z0) {
        p = new THREE.Vector3(x, top + 0.03, z0 - (s - side));
        rot = new THREE.Euler(Math.PI / 2, 0, 0);
      } else {
        p = new THREE.Vector3(x, top - (s - side - 2 * z0), -z0 - 0.03);
      }
      out.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(rot), new THREE.Vector3(1, 1, 1)));
    }
    return out;
  }, [x, off, bottom, count]);
  useInstances(ref, mats);
  const geo = useMemo(() => new THREE.BoxGeometry(0.22, 0.12, 0.06), []);
  return <instancedMesh ref={ref} args={[geo, material, count]} />;
}

function Coverings() {
  const layers = useStore((s) => s.layers);
  const m = useMemo(() => {
    const inner = innerCurtainTexture();
    const goat = goatHairTexture();
    const ram = skinTexture('ram', '#9c2a22', '#5e140f', 81);
    const tachash = skinTexture('tachash', '#5d6670', '#2f353c', 91);
    return {
      inner: cloth('inner', inner, 1.1),
      goat: cloth('goat', goat, 2),
      ram: toon('ram', { map: ram, side: THREE.DoubleSide }),
      tachash: toon('tachash', { map: tachash, side: THREE.DoubleSide }),
    };
  }, []);
  return (
    <group userData={{ feature: 'coverings' }}>
      {/* 1. Ten linen curtains with cherubim, each 28 x 4: 8 down each side + 12 over the top (Ex 26:1-2) */}
      {layers >= 1 && (
        <>
          <Covering material={m.inner} off={0.02} sideBottom={TOP + 0.02 - 8} backBottom={TOP - 9} uScale={4} vScale={28} folds={0.03} />
          {/* 50 gold clasps 20 cubits from the front, above the veil (Ex 26:6, 33) */}
          <Clasps x={TENT.veilX} off={0.02} bottom={TOP + 0.02 - 8} count={50} material={gold()} />
        </>
      )}
      {/* 2. Eleven goats'-hair curtains, 30 x 4, a cubit lower on each side (Ex 26:7-13) */}
      {layers >= 2 && (
        <>
          <Covering material={m.goat} off={0.08} sideBottom={TOP + 0.08 - 9} backBottom={0} uScale={4} vScale={4} folds={0.05} />
          {/* the doubled sixth curtain at the front (Ex 26:9) */}
          <mesh position={[TENT.frontX - 1, TOP + 0.13, 0]} material={m.goat} castShadow>
            <boxGeometry args={[2, 0.05, (OUT + BAR_CLEAR + 0.1) * 2]} />
          </mesh>
          {/* 50 bronze clasps where the sets of five and six meet (Ex 26:11) */}
          <Clasps x={TENT.frontX - 22} off={0.08} bottom={TOP + 0.08 - 9} count={50} material={bronze()} />
        </>
      )}
      {/* 3. Rams' skins dyed red (Ex 26:14) */}
      {layers >= 3 && (
        <Covering material={m.ram} off={0.18} sideBottom={0.4} backBottom={0.4} uScale={6} vScale={6} folds={0.03} />
      )}
      {/* 4. Tachash skins, the outermost covering (Ex 26:14) */}
      {layers >= 4 && (
        <Covering material={m.tachash} off={0.26} sideBottom={0} backBottom={0} uScale={7} vScale={7} folds={0.02} />
      )}
    </group>
  );
}

function GoldPillar({ x, z, socket, capital }: { x: number; z: number; socket: THREE.Material; capital: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]} material={socket} castShadow>
        <boxGeometry args={[0.6, 0.5, 0.6]} />
        <Outlines thickness={1.2} color={INK} />
      </mesh>
      <mesh position={[0, TOP / 2, 0]} material={gold()} castShadow>
        <cylinderGeometry args={[0.16, 0.18, TOP, 10]} />
        <Outlines thickness={1.2} color={INK} />
      </mesh>
      {capital && (
        <mesh position={[0, TOP - 0.2, 0]} material={gold()}>
          <cylinderGeometry args={[0.26, 0.18, 0.4, 10]} />
        </mesh>
      )}
      {/* gold hook */}
      <mesh position={[0.18, TOP - 0.45, 0]} rotation={[Math.PI / 2, 0, 0]} material={gold()}>
        <torusGeometry args={[0.08, 0.025, 5, 10, Math.PI]} />
      </mesh>
    </group>
  );
}

export function Tent() {
  const open = useStore((s) => s.open);
  const doorMat = useMemo(() => cloth('door', needleworkTexture('doorTex', 1024, 1024, 5)), []);
  const veilMat = useMemo(() => cloth('veil', veilTexture()), []);
  return (
    <group>
      <Walls />
      <Coverings />

      {/* Door of the tent: five gold pillars on bronze sockets (Ex 26:37; 36:38) */}
      <group userData={{ feature: 'door' }}>
        {DOOR_PILLARS_Z.map((z) => (
          <GoldPillar key={z} x={DOOR_PILLAR_X} z={z} socket={bronze()} capital />
        ))}
        {/* gold-overlaid fillet joining the capitals (Ex 36:38) */}
        <mesh position={[DOOR_PILLAR_X, TOP - 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={gold()}>
          <cylinderGeometry args={[0.05, 0.05, 9.6, 6]} />
        </mesh>
        <group position={[DOOR_SCREEN_X, TOP - 0.3, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Cloth
            width={TENT.halfWidth * 2}
            height={TOP - 0.35}
            material={doorMat}
            open={open.door ? 1 : 0}
            foldWidth={0.75}
            foldDepth={0.12}
            userData={{ curtain: 'door', feature: 'door' }}
          />
        </group>
      </group>

      {/* The veil on four gold pillars with silver sockets (Ex 26:31-33) */}
      <group userData={{ feature: 'veil' }}>
        {VEIL_PILLARS_Z.map((z) => (
          <GoldPillar key={z} x={VEIL_PILLAR_X} z={z} socket={silver()} capital={false} />
        ))}
        <mesh position={[VEIL_PILLAR_X + 0.1, TOP - 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={gold()}>
          <cylinderGeometry args={[0.04, 0.04, 9.8, 6]} />
        </mesh>
        <group position={[TENT.veilX, TOP - 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Cloth
            width={TENT.halfWidth * 2}
            height={TOP - 0.1}
            material={veilMat}
            open={open.veil ? 1 : 0}
            foldWidth={0.8}
            foldDepth={0.1}
            userData={{ curtain: 'veil', feature: 'veil' }}
          />
        </group>
      </group>
    </group>
  );
}
