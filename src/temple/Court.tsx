import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { toon } from '../scene/materials';
import { useStore } from '../store';
import { GREAT, INNER } from './dims';
import { templeMaterials } from './House';
import { Mason, worldUV } from './mason';
import { bronzeDoorTexture, cedarTexture, pavementTexture, tex } from './textures';

type Court = typeof INNER;
const COURSE = 1.5; // three courses of hewn stone (1 Kgs 6:36)
const BEAM = 0.75; // and a course of cedar beams
const PIER = 8;

/** Walls of three courses of hewed stone and a course of cedar beams, with a gateway in the east (1 Kgs 6:36; 7:12). */
function walls(m: Mason, c: Court) {
  const t = c.wall / 2;
  const stoneTop = COURSE * 3;
  const runs: [number, number, number, number][] = [
    [c.minX - t, c.maxX + t, c.minZ - t, c.minZ + t],
    [c.minX - t, c.maxX + t, c.maxZ - t, c.maxZ + t],
    [c.minX - t, c.minX + t, c.minZ + t, c.maxZ - t],
    [c.maxX - t, c.maxX + t, c.minZ + t, -c.gate - 1.5],
    [c.maxX - t, c.maxX + t, c.gate + 1.5, c.maxZ - t],
  ];
  for (const [x0, x1, z0, z1] of runs) {
    m.box('stone', x0, x1, 0, stoneTop, z0, z1);
    m.box('beam', x0 - 0.08, x1 + 0.08, stoneTop, stoneTop + BEAM, z0 - 0.08, z1 + 0.08);
  }
  // gate piers
  for (const s of [1, -1]) {
    m.box('stone', c.maxX - t - 1, c.maxX + t + 1, 0, PIER, s > 0 ? c.gate : -c.gate - 2, s > 0 ? c.gate + 2 : -c.gate);
    m.box('beam', c.maxX - t - 1.2, c.maxX + t + 1.2, PIER, PIER + 0.6, s > 0 ? c.gate - 0.2 : -c.gate - 2.2, s > 0 ? c.gate + 2.2 : -c.gate + 0.2);
  }
}

/** Gate leaves overlaid with brass (2 Chr 4:9), hinged on the piers and opening inward. */
function GateLeaves({ c, id, fixedOpen }: { c: Court; id?: string; fixedOpen?: boolean }) {
  const open = useStore((s) => (id ? s.open[id] : fixedOpen)) ?? false;
  const mat = useMemo(() => toon('t-bronzeDoor', { map: tex(bronzeDoorTexture()), emissive: '#2a1200', emissiveIntensity: 0.3 }), []);
  const h = PIER - 1.4;
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(c.gate - 0.05, h, 0.3);
    g.translate(c.gate / 2, h / 2, 0);
    worldUV(g, [5, h]);
    return g;
  }, [c.gate, h]);
  const k = useRef(open ? 1 : 0);
  const leaves = useRef<(THREE.Group | null)[]>([]);
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
    [1, -1].forEach((s, i) => {
      const l = leaves.current[i];
      if (l) l.rotation.y = s * (Math.PI / 2 + (Math.PI / 2) * e);
    });
  });
  return (
    <group userData={id ? { curtain: id, feature: 'courts' } : { feature: 'courts' }}>
      {[1, -1].map((s, i) => (
        <group key={s} ref={(r) => (leaves.current[i] = r)} position={[c.maxX - c.wall / 2 - 0.2, 0.05, s * c.gate]}>
          <mesh geometry={geo} material={mat} castShadow receiveShadow />
        </group>
      ))}
    </group>
  );
}

export function Courts() {
  const geos = useMemo(() => {
    const m = new Mason({ stone: [8, 3], beam: [6, 1] });
    walls(m, INNER);
    walls(m, GREAT);
    return m.build();
  }, []);
  const mats = useMemo(() => {
    const beamTex = cedarTexture().clone();
    beamTex.wrapS = beamTex.wrapT = THREE.RepeatWrapping;
    beamTex.center.set(0.5, 0.5);
    beamTex.rotation = Math.PI / 2;
    beamTex.needsUpdate = true;
    return {
      stone: templeMaterials().stone,
      beam: toon('t-beam', { map: beamTex }),
      great: toon('t-paveGreat', { map: tex(pavementTexture('t-pave', '#d4c19a')) }),
      inner: toon('t-paveInner', { map: tex(pavementTexture('t-paveInner', '#e4d6b6')), polygonOffset: true, polygonOffsetFactor: -1 }),
    };
  }, []);
  const plane = (c: Court, inset = 0) => {
    const w = c.maxX - c.minX - inset;
    const d = c.maxZ - c.minZ - inset;
    const g = new THREE.PlaneGeometry(w, d);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 6, (uv.getY(i) * d) / 6);
    return g;
  };
  const greatGeo = useMemo(() => plane(GREAT), []);
  const innerGeo = useMemo(() => plane(INNER), []);
  return (
    <group>
      <group userData={{ feature: 'courts' }}>
        <mesh geometry={geos.stone} material={mats.stone} castShadow receiveShadow />
        <mesh geometry={geos.beam} material={mats.beam} castShadow receiveShadow />
      </group>
      {/* the pavement (2 Chr 7:3) */}
      <mesh
        geometry={greatGeo}
        material={mats.great}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[(GREAT.minX + GREAT.maxX) / 2, 0.01, (GREAT.minZ + GREAT.maxZ) / 2]}
        receiveShadow
      />
      <mesh
        geometry={innerGeo}
        material={mats.inner}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[(INNER.minX + INNER.maxX) / 2, 0.06, (INNER.minZ + INNER.maxZ) / 2]}
        receiveShadow
      />
      <GateLeaves c={INNER} id="gate" />
      <GateLeaves c={GREAT} fixedOpen />
    </group>
  );
}
