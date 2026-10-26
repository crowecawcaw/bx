import { useMemo } from 'react';
import * as THREE from 'three';
import { toon } from '../scene/materials';
import { PLAT, STEPS } from './dims';
import { templeMaterials } from './House';
import { Mason } from './mason';
import { pavementTexture, tex } from './textures';

/** The raised platform the house stands on, its parapet, and the ten steps up to the porch (Ezek 40:49; 41:8). */
export function Platform() {
  const geos = useMemo(() => {
    const m = new Mason({ stone: [8, 3] });
    const { h, minX, maxX, halfZ: hz, parapet: p } = PLAT;
    const t = 0.5;
    m.box('stone', minX, maxX, 0, h, -hz, hz);
    // a base course and a coping
    m.box('stone', minX - 0.4, maxX + 0.4, 0, 0.8, -hz - 0.4, hz + 0.4);
    // the parapet, open at the head of the steps
    m.box('stone', minX, maxX, h, h + p, -hz, -hz + t);
    m.box('stone', minX, maxX, h, h + p, hz - t, hz);
    m.box('stone', minX, minX + t, h, h + p, -hz, hz);
    m.box('stone', maxX - t, maxX, h, h + p, -hz, -STEPS.halfZ - t);
    m.box('stone', maxX - t, maxX, h, h + p, STEPS.halfZ + t, hz);
    // the steps, with a cheek wall each side
    const rise = h / STEPS.n;
    const run = STEPS.run / STEPS.n;
    for (let i = 0; i < STEPS.n; i++) {
      m.box('stone', maxX, maxX + STEPS.run - i * run, i * rise, (i + 1) * rise, -STEPS.halfZ, STEPS.halfZ);
      for (const s of [1, -1]) {
        const z0 = s > 0 ? STEPS.halfZ : -STEPS.halfZ - t;
        m.box('stone', maxX + STEPS.run - (i + 1) * run, maxX + STEPS.run - i * run, 0, (STEPS.n - i) * rise + p, z0, z0 + t);
      }
    }
    return m.build();
  }, []);
  const top = useMemo(() => {
    const w = PLAT.maxX - PLAT.minX;
    const d = PLAT.halfZ * 2;
    const g = new THREE.PlaneGeometry(w, d);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 6, (uv.getY(i) * d) / 6);
    return g;
  }, []);
  const pave = useMemo(
    () => toon('t-pavePlat', { map: tex(pavementTexture('t-pavePlat', '#e8dcc0')), polygonOffset: true, polygonOffsetFactor: -1 }),
    [],
  );
  return (
    <group userData={{ feature: 'house' }}>
      <mesh geometry={geos.stone} material={templeMaterials().stone} castShadow receiveShadow />
      <mesh
        geometry={top}
        material={pave}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[(PLAT.minX + PLAT.maxX) / 2, PLAT.h + 0.01, 0]}
        receiveShadow
      />
    </group>
  );
}
