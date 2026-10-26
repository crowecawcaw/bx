import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useStore } from '../store';
import { Cloth } from './Cloth';
import { COURT } from './dims';
import { acacia, bronze, cloth, silver } from './materials';
import { linenTexture, needleworkTexture } from './textures';

const H = COURT.height;

/** The 60 pillar positions: one every 5 cubits around the 300-cubit perimeter. */
export function courtPillars(): [number, number][] {
  const out: [number, number][] = [];
  const { minX, maxX, minZ, maxZ, pillarSpacing: s } = COURT;
  for (let x = minX; x <= maxX; x += s) out.push([x, minZ], [x, maxZ]); // north & south incl. corners: 42
  for (let z = minZ + s; z < maxZ; z += s) out.push([minX, z], [maxX, z]); // west & east: 18
  return out;
}

function Instanced({
  positions,
  geometry,
  material,
  y,
}: {
  positions: [number, number][];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  y: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    positions.forEach(([x, z], i) => {
      m.makeTranslation(x, y, z);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [positions, y]);
  return (
    <instancedMesh ref={ref} args={[geometry, material, positions.length]} castShadow receiveShadow />
  );
}

export function Courtyard() {
  const gateOpen = useStore((s) => s.open.gate);
  const pillars = useMemo(courtPillars, []);
  const geo = useMemo(
    () => ({
      shaft: new THREE.CylinderGeometry(0.2, 0.22, H, 10),
      base: new RoundedBoxGeometry(0.7, 0.5, 0.7, 2, 0.06), // bronze socket (Ex 27:10)
      cap: new THREE.CylinderGeometry(0.3, 0.24, 0.35, 10), // silver-overlaid chapiter (Ex 38:17)
      peg: new THREE.ConeGeometry(0.06, 0.5, 5),
    }),
    [],
  );

  const linenMat = useMemo(() => {
    const t = linenTexture();
    t.repeat.set(1, 2.5);
    return cloth('courtLinen', t, 1.4, 0.16);
  }, []);
  const gateMat = useMemo(() => cloth('gate', needleworkTexture('gateTex', 2048, 512, 8), 1.2, 0.12), []);

  // Bronze pins with cords, staked out from every pillar on both faces (Ex 27:19; 35:18)
  const { pegs, cords } = useMemo(() => {
    const pegs: [number, number][] = [];
    const pts: number[] = [];
    for (const [x, z] of pillars) {
      const out: [number, number][] = [];
      if (z === COURT.minZ || z === COURT.maxZ) out.push([0, Math.sign(z)]);
      if (x === COURT.minX || x === COURT.maxX) out.push([Math.sign(x), 0]);
      for (const [dx, dz] of out) {
        for (const side of [1, -1]) {
          const px = x + dx * 2.2 * side;
          const pz = z + dz * 2.2 * side;
          pegs.push([px, pz]);
          pts.push(x, H - 0.3, z, px, 0.15, pz);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return { pegs, cords: g };
  }, [pillars]);

  const { minX, maxX, minZ, maxZ, gateWidth } = COURT;
  const side = (maxZ - minZ - gateWidth) / 2; // 15 cubits each side of the gate (Ex 27:14-15)
  const hangH = H - 0.15;

  return (
    <group userData={{ feature: 'court' }}>
      <Instanced positions={pillars} geometry={geo.shaft} material={acacia()} y={H / 2} />
      <Instanced positions={pillars} geometry={geo.base} material={bronze()} y={0.25} />
      <Instanced positions={pillars} geometry={geo.cap} material={silver()} y={H + 0.1} />
      <Instanced positions={pegs} geometry={geo.peg} material={bronze()} y={0.2} />
      <lineSegments geometry={cords} raycast={() => null}>
        <lineBasicMaterial color="#8a7457" depthWrite={false} />
      </lineSegments>

      {/* silver fillets: rods joining the pillar tops, from which the hangings hang on silver hooks */}
      <SilverFillet from={[minX, minZ]} to={[maxX, minZ]} />
      <SilverFillet from={[minX, maxZ]} to={[maxX, maxZ]} />
      <SilverFillet from={[minX, minZ]} to={[minX, maxZ]} />
      <SilverFillet from={[maxX, minZ]} to={[maxX, maxZ]} />

      {/* fine twined linen hangings, 5 cubits high (Ex 27:9-18) */}
      <group position={[0, H - 0.05, minZ]}>
        <Cloth width={100} height={hangH} material={linenMat} uRepeat={50} foldWidth={0.9} />
      </group>
      <group position={[0, H - 0.05, maxZ]}>
        <Cloth width={100} height={hangH} material={linenMat} uRepeat={50} foldWidth={0.9} />
      </group>
      <group position={[minX, H - 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Cloth width={50} height={hangH} material={linenMat} uRepeat={25} foldWidth={0.9} />
      </group>
      <group position={[maxX, H - 0.05, minZ + side / 2]} rotation={[0, Math.PI / 2, 0]}>
        <Cloth width={side} height={hangH} material={linenMat} uRepeat={side / 2} foldWidth={0.9} />
      </group>
      <group position={[maxX, H - 0.05, maxZ - side / 2]} rotation={[0, Math.PI / 2, 0]}>
        <Cloth width={side} height={hangH} material={linenMat} uRepeat={side / 2} foldWidth={0.9} />
      </group>

      {/* the gate: 20-cubit embroidered screen (Ex 27:16) */}
      <group position={[maxX + 0.25, H - 0.05, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <Cloth
          width={gateWidth}
          height={hangH}
          material={gateMat}
          open={gateOpen ? 1 : 0}
          foldWidth={0.8}
          foldDepth={0.14}
          userData={{ curtain: 'gate', feature: 'gate' }}
        />
      </group>
    </group>
  );
}

function SilverFillet({ from, to }: { from: [number, number]; to: [number, number] }) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
  return (
    <mesh
      position={[(from[0] + to[0]) / 2, H - 0.12, (from[1] + to[1]) / 2]}
      rotation={[0, -ang, Math.PI / 2]}
      material={silver()}
    >
      <cylinderGeometry args={[0.06, 0.06, len, 6]} />
    </mesh>
  );
}
