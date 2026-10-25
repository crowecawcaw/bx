import { Outlines } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { toon } from './materials';
import { sandTexture } from './textures';

function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color('#5d93d1') },
          mid: { value: new THREE.Color('#bcd6ec') },
          bottom: { value: new THREE.Color('#f1dcb6') },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
          void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : bottom;
          c = mix(bottom, c, smoothstep(-0.02, 0.08, h)); gl_FragColor = vec4(c,1.0); }`,
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[900, 32, 16]} />
    </mesh>
  );
}

function Mountains() {
  const mat = toon('mountain', { color: '#a9805c' });
  const far = toon('mountainFar', { color: '#b99c86' });
  const peaks = useMemo(() => {
    const out: { p: [number, number, number]; r: number; h: number; far: boolean }[] = [];
    let s = 3;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rnd() * 0.2;
      const far = i % 2 === 0;
      const d = far ? 520 + rnd() * 80 : 330 + rnd() * 60;
      out.push({ p: [Math.cos(a) * d, 0, Math.sin(a) * d], r: 60 + rnd() * 70, h: 50 + rnd() * 90, far });
    }
    // Mount Sinai: a tall peak to the south-east
    out.push({ p: [260, 0, 300], r: 110, h: 200, far: false });
    return out;
  }, []);
  // a craggy unit peak: cone with position-hashed jitter (so seams stay closed), base y=0, top y=1
  const rock = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1, 8, 3);
    g.translate(0, 0.5, 0);
    const p = g.attributes.position as THREE.BufferAttribute;
    const hash = (x: number, y: number, z: number) => {
      const h = Math.sin(Math.round(x * 97) * 12.9898 + Math.round(y * 97) * 78.233 + Math.round(z * 97) * 37.719) * 43758.5453;
      return h - Math.floor(h);
    };
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      if (y > 0.99) continue;
      const n = 1 + (hash(x, y, z) - 0.5) * 0.3;
      p.setXYZ(i, x * n, y > 0.01 ? y + (hash(z, x, y) - 0.5) * 0.12 : y, z * n);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      {peaks.map((k, i) => (
        <mesh
          key={i}
          position={[k.p[0], -2, k.p[2]]}
          material={k.far ? far : mat}
          rotation={[0, i * 1.3, 0]}
          scale={[k.r, k.h, k.r * (0.6 + (i % 4) * 0.15)]}
          geometry={rock}
        />
      ))}
    </group>
  );
}

/** The tents of Israel, encamped by tribes around the tabernacle (Num 2). */
function Camp() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const roof = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: [number, number, number][] = [];
    let s = 11;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 420; i++) {
      const a = rnd() * Math.PI * 2;
      const d = 110 + rnd() * 140;
      const x = Math.cos(a) * d * 1.2;
      const z = Math.sin(a) * d;
      out.push([x, z, rnd() * Math.PI]);
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    spots.forEach(([x, z, r], i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r);
      m.compose(new THREE.Vector3(x, 1.5, z), q, new THREE.Vector3(1, 1, 1));
      ref.current!.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, 3.6, z), q, new THREE.Vector3(1, 1, 1));
      roof.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    roof.current!.instanceMatrix.needsUpdate = true;
  }, [spots]);
  const geo = useMemo(() => new THREE.BoxGeometry(6, 3, 4), []);
  const roofGeo = useMemo(() => new THREE.ConeGeometry(4.2, 1.6, 4), []);
  return (
    <group>
      <instancedMesh ref={ref} args={[geo, toon('campTent', { color: '#4a3b30' }), spots.length]} />
      <instancedMesh ref={roof} args={[roofGeo, toon('campRoof', { color: '#3a2e26' }), spots.length]} />
    </group>
  );
}

/** "The cloud of the LORD was upon the tabernacle by day" (Ex 40:38). */
function CloudPillar() {
  const g = useRef<THREE.InstancedMesh>(null);
  const puffs = useMemo(() => {
    const out: { p: [number, number, number]; r: number; ph: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const y = 14 + i * 1.9;
      const a = i * 2.39;
      const spread = 1.5 + Math.min(i, 12) * 0.25;
      out.push({ p: [Math.cos(a) * spread, y, Math.sin(a) * spread], r: 3.2 + (i % 4) * 0.7, ph: i });
    }
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      out.push({ p: [Math.cos(a) * 6.5, 66 + (i % 3), Math.sin(a) * 6.5], r: 6, ph: i });
    }
    return out;
  }, []);
  const mat = useMemo(() => toon('cloud', { color: '#ffffff', emissive: '#b7b2a2', emissiveIntensity: 0.55 }), []);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const inst = g.current;
    if (!inst) return;
    const t = clock.elapsedTime;
    puffs.forEach((p, i) => {
      v.set(p.p[0], p.p[1] + Math.sin(t * 0.4 + p.ph) * 0.4, p.p[2]);
      sc.setScalar(p.r * (1 + Math.sin(t * 0.3 + p.ph * 1.7) * 0.05));
      inst.setMatrixAt(i, m.compose(v, q, sc));
    });
    inst.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={[-25, 0, 0]} userData={{ feature: 'cloud' }}>
      <instancedMesh ref={g} args={[geo, mat, puffs.length]} frustumCulled={false}>
        <Outlines thickness={1.6} color="#8d8676" />
      </instancedMesh>
    </group>
  );
}

export function World() {
  const ground = useMemo(() => toon('ground', { map: sandTexture() }), []);
  return (
    <>
      <SkyDome />
      <fog attach="fog" args={['#ecdcc0', 120, 700]} />
      <hemisphereLight args={['#dfe9f5', '#a57d55', 0.85]} />
      <directionalLight
        position={[60, 90, 45]}
        intensity={2.1}
        color="#fff3dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={10}
        shadow-camera-far={250}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={ground} userData={{ ground: true }}>
        <planeGeometry args={[1600, 1600]} />
      </mesh>
      <Mountains />
      <Camp />
      <CloudPillar />
    </>
  );
}
