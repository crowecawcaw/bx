import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Smoke } from '../scene/Furniture';
import { Mason } from '../temple/mason';
import { ALTAR, ALTAR_STAIRS, RIVER_PATH, Y, heightAt } from './dims';
import { ezekielMaterials, TILES } from './materials';
import { waterTexture } from './textures';

/**
 * The altar (43:13-17), measured "after the cubits": a bottom a cubit high and a cubit broad with a
 * border of a span at its edge; two cubits up to the lesser settle and four more to the greater, each
 * a cubit in, with a border of half a cubit; the hearth four cubits high and twelve square, and four
 * horns. Its stairs look toward the east.
 */
export function Altar() {
  const geos = useMemo(() => {
    const m = new Mason(TILES);
    const sq = (half: number, y0: number, y1: number, key = 'white') => m.box(key, -half, half, y0, y1, -half, half);
    const [t0, t1, t2, t3] = ALTAR.tops;
    sq(ALTAR.base, 0, t0);
    sq(ALTAR.lower, t0, t1);
    sq(ALTAR.upper, t1, t2);
    sq(ALTAR.hearth, t2, t3);
    // the borders: a span round the bottom, half a cubit round the greater settle
    const rim = (half: number, w: number, y: number, h: number) => {
      m.box('white', -half, half, y, y + h, -half, -half + w);
      m.box('white', -half, half, y, y + h, half - w, half);
      m.box('white', -half, -half + w, y, y + h, -half + w, half - w);
      m.box('white', half - w, half, y, y + h, -half + w, half - w);
    };
    rim(ALTAR.base, 0.25, t0, 0.5);
    rim(ALTAR.upper, 0.25, t2, 0.5);
    // four horns from the hearth upward (43:15)
    const hh = ALTAR.hearth;
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      const x = sx * (hh - 0.5);
      const z = sz * (hh - 0.5);
      m.box('white', x - 0.5, x + 0.5, t3, t3 + ALTAR.horn, z - 0.5, z + 0.5);
    }
    // the stairs on the east, up to the greater settle
    const S = ALTAR_STAIRS;
    const n = 14;
    for (let i = 0; i < n; i++) m.box('white', S.x0, S.x1 - (i * (S.x1 - S.x0)) / n, 0, ((i + 1) * t2) / n, -S.half, S.half);
    for (const s of [1, -1]) m.box('stone', S.x0, S.x1, 0, t2 + 0.6, s > 0 ? S.half : -S.half - 0.5, s > 0 ? S.half + 0.5 : -S.half);
    return m.build();
  }, []);
  const mats = ezekielMaterials();
  const coal = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff6a1f', toneMapped: false }), []);
  const flame = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb340', toneMapped: false }), []);
  const fire = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    fire.current?.children.forEach((c, i) => {
      c.scale.y = 1 + Math.sin(t * 5 + i * 1.7) * 0.25;
    });
  });
  const top = ALTAR.tops[3];
  return (
    <group position={[0, Y.inner, 0]} userData={{ feature: 'altar' }}>
      {Object.entries(geos).map(([k, g]) => (
        <mesh key={k} geometry={g} material={mats[k]} castShadow receiveShadow />
      ))}
      <mesh position={[0, top + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} material={coal}>
        <circleGeometry args={[3.6, 20]} />
      </mesh>
      <group ref={fire} position={[0, top, 0]}>
        {[
          [0, 0, 2.4],
          [1.4, 0.8, 1.7],
          [-1.3, 0.5, 1.9],
          [0.5, -1.4, 1.5],
          [-0.7, -1.1, 1.3],
        ].map(([x, z, h], i) => (
          <mesh key={i} position={[x, h / 2, z]} material={flame}>
            <coneGeometry args={[0.6, h, 7]} />
          </mesh>
        ))}
      </group>
      <group position={[0, top + 1, 0]}>
        <Smoke y={0} spread={2} count={14} color="#d9d2c8" scale={3} />
      </group>
    </group>
  );
}

/** A ribbon of water along a path: width and height given for each point. */
export function ribbon(pts: { x: number; z: number; y: number; w: number }[], uvScale = 4) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let along = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b.x - a.x;
    let dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    if (i) along += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
    const nx = -dz * (p.w / 2);
    const nz = dx * (p.w / 2);
    pos.push(p.x + nx, p.y, p.z + nz, p.x - nx, p.y, p.z - nz);
    uv.push(-p.w / 2 / uvScale, along / uvScale, p.w / 2 / uvScale, along / uvScale);
    if (i) {
      const o = (i - 1) * 2;
      idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Points every `step` cubits along a polyline. */
export function resample(path: [number, number][], step: number): [number, number][] {
  const out: [number, number][] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1];
    const [bx, bz] = path[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}

let waterMat: THREE.MeshStandardMaterial | null = null;
/** Clear water that runs: its ripples drift along the stream. */
export function water() {
  if (waterMat) return waterMat;
  const map = waterTexture();
  waterMat = new THREE.MeshStandardMaterial({ map, color: '#cfe6ea', roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -3 });
  return waterMat;
}

/**
 * "Waters issued out from under the threshold of the house eastward... at the south side of the altar"
 * and ran out "on the right side" of the outer gate toward the east (47:1-2): a trickle across the courts.
 */
export function Stream() {
  const geo = useMemo(() => {
    const pts = resample(RIVER_PATH, 0.8).map(([x, z], i, a) => ({ x, z, y: heightAt(x, z) + 0.05, w: 0.7 + 0.6 * (i / a.length) }));
    return ribbon(pts, 3);
  }, []);
  return <mesh geometry={geo} material={water()} receiveShadow userData={{ feature: 'river' }} />;
}
