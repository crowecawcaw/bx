import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SkyDome, Wind, ridged } from '../scene/Environment';
import { toon, toonRamp } from '../scene/materials';
import { GREAT } from './dims';
import { hillGroundTexture } from './textures';

/** Mount of Olives to the east across the Kidron; lower hills round about (Ps 125:2). */
const OLIVET: [number, number] = [620, 40];

function Hills() {
  const geo = useMemo(() => {
    const A = 300;
    const R = 40;
    const r0 = 330;
    const r1 = 1100;
    const pos: number[] = [];
    const col: number[] = [];
    const low = new THREE.Color('#c8ab80');
    const mid = new THREE.Color('#a59a68');
    const high = new THREE.Color('#8c8a5c');
    const c = new THREE.Color();
    for (let j = 0; j <= R; j++) {
      const t = j / R;
      const r = r0 + (r1 - r0) * (t * t * 0.6 + t * 0.4);
      for (let i = 0; i <= A; i++) {
        const a = (i / A) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const env = THREE.MathUtils.smoothstep(r, r0, r0 + 180);
        const n = ridged(x / 260 + 3.1, z / 260 + 8.4);
        // rounded limestone hills rather than granite crags
        let h = env * (12 + 70 * Math.pow(n, 1.3));
        const dO = Math.hypot(x - OLIVET[0], z - OLIVET[1]);
        h += 95 * Math.exp(-((dO / 230) ** 2)) * env;
        // the Kidron valley runs north–south just east of the mount
        h -= 30 * Math.exp(-(((x - 380) / 60) ** 2)) * env;
        h = Math.max(h, env * 2);
        pos.push(x, h - 2, z);
        const k = Math.min(1, h / 120);
        c.copy(low).lerp(mid, THREE.MathUtils.smoothstep(k, 0.08, 0.4));
        c.lerp(high, THREE.MathUtils.smoothstep(k, 0.45, 1));
        col.push(c.r, c.g, c.b);
      }
    }
    const idx: number[] = [];
    for (let j = 0; j < R; j++) {
      for (let i = 0; i < A; i++) {
        const p = j * (A + 1) + i;
        const q = p + A + 1;
        idx.push(p, p + 1, q, p + 1, q + 1, q);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    return g.toNonIndexed();
  }, []);
  useLayoutEffect(() => geo.computeVertexNormals(), [geo]);
  const mat = useMemo(() => new THREE.MeshToonMaterial({ gradientMap: toonRamp(), vertexColors: true }), []);
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

let seed = 5;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

/** Flat-roofed houses of Jerusalem on the slopes to the south and west (the city of David lay south). */
function City() {
  const walls = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    seed = 5;
    const out: { x: number; z: number; w: number; d: number; h: number; r: number }[] = [];
    while (out.length < 340) {
      const a = rnd() * Math.PI * 2;
      const d = 255 + rnd() * 170;
      const x = Math.cos(a) * d * 1.05;
      const z = Math.sin(a) * d;
      if (x > 150) continue; // the Kidron and the Mount of Olives to the east
      if (Math.abs(x) < GREAT.maxX + 15 && Math.abs(z) < GREAT.maxZ + 15) continue;
      out.push({ x, z, w: 6 + rnd() * 8, d: 6 + rnd() * 8, h: 4 + rnd() * 5, r: rnd() * 0.5 - 0.25 });
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    spots.forEach((s, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.r);
      m.compose(new THREE.Vector3(s.x, s.h / 2, s.z), q, new THREE.Vector3(s.w, s.h, s.d));
      walls.current!.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(s.x, s.h + 0.3, s.z), q, new THREE.Vector3(s.w + 0.6, 0.6, s.d + 0.6));
      roofs.current!.setMatrixAt(i, m);
    });
    walls.current!.instanceMatrix.needsUpdate = true;
    roofs.current!.instanceMatrix.needsUpdate = true;
    walls.current!.computeBoundingSphere();
    roofs.current!.computeBoundingSphere();
  }, [spots]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return (
    <group>
      <instancedMesh ref={walls} args={[box, toon('t-house', { color: '#d8c5a0' }), spots.length]} castShadow receiveShadow />
      <instancedMesh ref={roofs} args={[box, toon('t-houseRoof', { color: '#b59f7a' }), spots.length]} />
    </group>
  );
}

/** Olive trees outside the great court, thickest toward the Mount of Olives. */
function Olives() {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(() => {
    seed = 77;
    const t: THREE.Matrix4[] = [];
    const c: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    while (t.length < 260) {
      const east = rnd() < 0.6;
      const x = east ? 240 + rnd() * 220 : (rnd() - 0.5) * 900;
      const z = (rnd() - 0.5) * (east ? 700 : 900);
      if (Math.abs(x) < GREAT.maxX + 20 && Math.abs(z) < GREAT.maxZ + 20) continue;
      if (Math.hypot(x, z) > 420) continue;
      const k = 0.8 + rnd() * 0.6;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6);
      t.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 1.4 * k, z), q, new THREE.Vector3(k, k, k)));
      c.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 3.6 * k, z), q, new THREE.Vector3(k * 1.2, k * 0.85, k * 1.2)));
    }
    return { t, c };
  }, []);
  useLayoutEffect(() => {
    mats.t.forEach((m, i) => trunks.current!.setMatrixAt(i, m));
    mats.c.forEach((m, i) => crowns.current!.setMatrixAt(i, m));
    trunks.current!.instanceMatrix.needsUpdate = true;
    crowns.current!.instanceMatrix.needsUpdate = true;
    trunks.current!.computeBoundingSphere();
    crowns.current!.computeBoundingSphere();
  }, [mats]);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.25, 0.4, 2.8, 6), []);
  const crownGeo = useMemo(() => {
    const parts = [
      [0, 0, 0, 1.8],
      [1.2, -0.3, 0.4, 1.3],
      [-1.1, -0.2, -0.5, 1.4],
      [0.2, 0.5, -1.0, 1.2],
    ].map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 0).translate(x, y, z));
    return mergeGeometries(parts)!;
  }, []);
  return (
    <group>
      <instancedMesh ref={trunks} args={[trunkGeo, toon('t-oliveTrunk', { color: '#6e5a44' }), mats.t.length]} castShadow />
      <instancedMesh ref={crowns} args={[crownGeo, toon('t-oliveLeaf', { color: '#8a9a68' }), mats.c.length]} castShadow />
    </group>
  );
}

export function TempleWorld() {
  const ground = useMemo(() => toon('t-ground', { map: hillGroundTexture() }), []);
  return (
    <>
      <SkyDome />
      <fog attach="fog" args={['#e8dcc6', 320, 1500]} />
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={ground}>
        <planeGeometry args={[3000, 3000]} />
      </mesh>
      <Wind />
      <Hills />
      <City />
      <Olives />
    </>
  );
}
