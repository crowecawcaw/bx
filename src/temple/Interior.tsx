import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { Ark, IncenseAltar, Menorah, Table } from '../scene/Furniture';
import { HOUSE, POS } from './dims';
import { Replicate } from './Replicate';
import { TempleCherub } from './TempleCherub';

/** Ten lampstands, five on the right (south) and five on the left (1 Kgs 7:49), facing the middle. */
const LAMPS = POS.lampX.flatMap((x) => [
  { x, z: POS.lampZ, rotY: 0 },
  { x, z: -POS.lampZ, rotY: Math.PI },
]);
/** Ten tables, five on each side (2 Chr 4:8). */
const TABLES = POS.lampX.flatMap((x) => [
  { x, z: POS.tableZ, rotY: 0 },
  { x, z: -POS.tableZ, rotY: 0 },
]);

/**
 * "The cloud filled the house of the LORD" (1 Kgs 8:10). Soft puffs drift high in the Holy Place
 * and the oracle, faint enough to see through.
 */
function GloryCloud() {
  const N = 90;
  const { geo, mat } = useMemo(() => {
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    const seed = new Float32Array(N * 4);
    let s = 17;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < N; i++) seed.set([rnd(), rnd(), rnd(), rnd()], i * 4);
    g.setAttribute('seed', new THREE.InstancedBufferAttribute(seed, 4));
    g.instanceCount = N;
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec4 seed;
        uniform float time;
        varying vec2 vUv;
        varying float vA;
        void main() {
          // spread through the house: x from the oracle's west wall to the door, high up
          float x = mix(${HOUSE.oracleX.toFixed(1)} + 3.0, ${HOUSE.frontX.toFixed(1)} - 4.0, seed.x);
          float inOracle = step(x, ${HOUSE.partitionX.toFixed(1)});
          float ceil = mix(${HOUSE.height.toFixed(1)}, ${HOUSE.oracleHeight.toFixed(1)}, inOracle);
          float y = ceil - 2.5 - seed.y * 6.0 + sin(time * 0.2 + seed.z * 6.28) * 0.6;
          float z = (seed.z - 0.5) * 15.0 + sin(time * 0.13 + seed.w * 6.28) * 1.2;
          x += sin(time * 0.1 + seed.y * 6.28) * 1.5;
          float size = 2.6 + seed.w * 2.4;
          vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
          mv.xy += position.xy * size * 2.0;
          vUv = uv;
          vA = 0.13 + 0.08 * sin(time * 0.3 + seed.x * 12.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying float vA;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r2 = dot(p, p);
          if (r2 > 1.0) discard;
          float a = (1.0 - smoothstep(0.2, 1.0, r2)) * vA;
          gl_FragColor = vec4(vec3(1.0, 0.97, 0.88), a);
        }`,
      transparent: true,
      depthWrite: false,
    });
    return { geo: g, mat };
  }, []);
  useFrame(({ clock }) => {
    mat.uniforms.time.value = clock.elapsedTime;
  });
  return <mesh geometry={geo} material={mat} frustumCulled={false} raycast={() => null} userData={{ feature: 'glory' }} />;
}

export function Interior() {
  return (
    <group>
      <Replicate at={LAMPS} feature="lampstands">
        <Menorah at={[0, 0]} rotY={0} light={false} feature="lampstands" />
      </Replicate>
      <Replicate at={TABLES} feature="tables">
        <Table at={[0, 0]} feature="tables" />
      </Replicate>
      <IncenseAltar at={POS.incense} feature="incense" />
      {/* lamplight along each side of the Holy Place */}
      {[1, -1].map((s) => (
        <pointLight key={s} position={[-8, 5, s * 6.5]} color="#ffbe6a" intensity={26} distance={42} decay={1.2} />
      ))}
      <pointLight position={[-24, 4, 0]} color="#ffcf8a" intensity={4} distance={14} decay={1.4} />

      {/* the oracle: the ark beneath the wings of the two cherubim (1 Kgs 8:6-7) */}
      <Ark at={POS.ark} rotY={Math.PI / 2} />
      <TempleCherub position={[POS.ark[0], 0, POS.cherubZ]} />
      <TempleCherub position={[POS.ark[0], 0, -POS.cherubZ]} />
      <pointLight position={[POS.ark[0] + 3, 13, 0]} color="#fff0c8" intensity={9} distance={30} decay={1.3} />
      <GloryCloud />
    </group>
  );
}
