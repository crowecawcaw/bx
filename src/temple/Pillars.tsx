import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lathe } from '../scene/Furniture';
import { toon } from '../scene/materials';
import { hammeredTexture } from '../scene/textures';
import { PILLAR } from './dims';
import { checkerNetTexture } from './textures';

const R = PILLAR.radius; // 12 cubits round (1 Kgs 7:15)
const TOP = PILLAR.height; // 18 cubits
const BOWL_TOP = TOP + 1; // the belly (bowl) of the chapiter, under the four cubits of lily work (1 Kgs 7:19)
const CAP_TOP = TOP + PILLAR.chapiter; // 5-cubit chapiter (1 Kgs 7:16)

export function brightBronze() {
  // "of bright brass" (1 Kgs 7:45)
  return toon('brightBronze', { color: '#d08a46', emissive: '#2c1300', emissiveIntensity: 0.35, map: hammeredTexture() });
}

/** Radius of the chapiter profile at height y (the bowl swells, then the lily opens). */
function capRadius(y: number) {
  const t = (y - TOP) / (BOWL_TOP - TOP);
  if (y <= BOWL_TOP) return R + 0.42 * Math.sin(Math.min(1, Math.max(0, t)) * Math.PI) + 0.05;
  return R + 0.05;
}

/** Instanced pomegranates: 2 rows of 100 round each chapiter, 400 in all (1 Kgs 7:20, 42). */
function pomegranateGeometry() {
  const body = new THREE.SphereGeometry(0.075, 8, 6);
  body.scale(1, 0.92, 1);
  const crown = new THREE.ConeGeometry(0.035, 0.06, 5, 1, true);
  crown.translate(0, 0.085, 0);
  const g = mergeGeometries([body.toNonIndexed(), crown.toNonIndexed()].map((p) => (p.deleteAttribute('uv'), p)))!;
  g.computeVertexNormals();
  return g;
}

/** One lily petal of the lily work (1 Kgs 7:19, 22): a curved, pointed blade. */
function petalGeometry() {
  const g = new THREE.SphereGeometry(1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(0.5, 2.6, 0.2);
  g.rotateX(0.32); // lean outward
  g.deleteAttribute('uv');
  return g;
}

function Pillar({ z }: { z: number }) {
  const b = brightBronze();
  const net = useMemo(
    () => toon('chapiterNet', { map: checkerNetTexture(), transparent: true, alphaTest: 0.45, side: THREE.DoubleSide }),
    [],
  );
  const parts = useMemo(() => {
    const ys = [TOP, TOP + 0.2, TOP + 0.5, BOWL_TOP - 0.25, BOWL_TOP];
    const bowl = lathe(ys.map((y) => [capRadius(y), y]), 40, 24);
    const netGeo = lathe(ys.map((y) => [capRadius(y) + 0.04, y]), 40, 24);
    // the lily: a cup that opens from the neck to the top of the chapiter, four cubits (1 Kgs 7:19)
    const lily = lathe(
      [
        [R - 0.1, BOWL_TOP - 0.05],
        [R - 0.35, BOWL_TOP + 0.8],
        [R - 0.2, BOWL_TOP + 2],
        [R + 0.3, CAP_TOP - 0.4],
        [R + 0.55, CAP_TOP],
      ],
      40,
      24,
    );
    // seven wreaths of chain work hung round the bowl (1 Kgs 7:17)
    const chains: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const a0 = (i / 7) * Math.PI * 2;
      const a1 = ((i + 1) / 7) * Math.PI * 2;
      const pts = Array.from({ length: 13 }, (_, k) => {
        const t = k / 12;
        const a = a0 + (a1 - a0) * t;
        const y = BOWL_TOP - 0.1 - Math.sin(t * Math.PI) * 0.5;
        const r = capRadius(y) + 0.1;
        return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      });
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.055, 5, false);
      g.deleteAttribute('uv');
      chains.push(g);
    }
    const chainGeo = mergeGeometries(chains)!;
    // two rows of pomegranates: one below the bowl's belly, one above it
    const pom: THREE.Matrix4[] = [];
    for (const y of [TOP + 0.18, BOWL_TOP - 0.18]) {
      const r = capRadius(y) + 0.09;
      for (let i = 0; i < 100; i++) {
        const a = ((i + (y > TOP + 0.5 ? 0.5 : 0)) / 100) * Math.PI * 2;
        pom.push(new THREE.Matrix4().makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r));
      }
    }
    // a ring of lily petals round the top
    const petals: THREE.Matrix4[] = [];
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 18; i++) {
        const a = ((i + row * 0.5) / 18) * Math.PI * 2;
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, 0, 'YXZ'));
        const r = R - 0.15 + row * 0.12;
        petals.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(Math.cos(a) * r, BOWL_TOP + 0.4 + row * 0.4, Math.sin(a) * r),
            q,
            new THREE.Vector3(1, 1 - row * 0.15, 1),
          ),
        );
      }
    }
    return { bowl, netGeo, lily, chainGeo, pom, petals };
  }, []);
  const pomRef = useRef<THREE.InstancedMesh>(null);
  const petalRef = useRef<THREE.InstancedMesh>(null);
  const pomGeo = useMemo(pomegranateGeometry, []);
  const petalGeo = useMemo(petalGeometry, []);
  useLayoutEffect(() => {
    parts.pom.forEach((m, i) => pomRef.current!.setMatrixAt(i, m));
    pomRef.current!.instanceMatrix.needsUpdate = true;
    pomRef.current!.computeBoundingSphere();
    parts.petals.forEach((m, i) => petalRef.current!.setMatrixAt(i, m));
    petalRef.current!.instanceMatrix.needsUpdate = true;
    petalRef.current!.computeBoundingSphere();
  }, [parts]);
  return (
    <group position={[PILLAR.x, 0, z]}>
      {/* hollow cast bronze, four fingers thick (Jer 52:21) */}
      <mesh position={[0, TOP / 2, 0]} material={b} castShadow receiveShadow>
        <cylinderGeometry args={[R, R * 1.02, TOP, 40]} />
      </mesh>
      <mesh position={[0, 0.15, 0]} material={b} castShadow>
        <cylinderGeometry args={[R + 0.12, R + 0.18, 0.3, 40]} />
      </mesh>
      <mesh geometry={parts.bowl} material={b} castShadow />
      <mesh geometry={parts.netGeo} material={net} />
      <mesh geometry={parts.chainGeo} material={b} castShadow />
      <mesh geometry={parts.lily} material={b} castShadow />
      <instancedMesh ref={pomRef} args={[pomGeo, b, parts.pom.length]} castShadow />
      <instancedMesh ref={petalRef} args={[petalGeo, b, parts.petals.length]} castShadow />
    </group>
  );
}

/** Jachin on the right (south) and Boaz on the left (north) (1 Kgs 7:21; 2 Chr 3:17). */
export function Pillars() {
  return (
    <group userData={{ feature: 'pillars' }}>
      <Pillar z={PILLAR.z} />
      <Pillar z={-PILLAR.z} />
    </group>
  );
}
