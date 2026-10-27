import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { toon } from '../scene/materials';
import { Crash } from './Crash';
import { Crowd } from './Crowd';
import { CLOUD_X, HALF, X1, rise, rng } from './dims';
import { FOG_COLOR, FOG_FAR, FOG_NEAR } from './shaders';
import { Walls } from './Walls';

/** Dawn over the far shore: "the sea returned to his strength when the morning appeared" (Ex 14:27). */
function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          horizon: { value: new THREE.Color('#f9d47a') },
          mid: { value: new THREE.Color('#d9842b') },
          top: { value: new THREE.Color('#693516') },
          sun: { value: new THREE.Color('#fff6cf') },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 horizon, mid, top, sun; varying vec3 vP;
          void main(){
            float h = clamp(vP.y * 1.25 + 0.06, 0.0, 1.0);
            vec3 c = mix(horizon, mid, smoothstep(0.0, 0.34, h));
            c = mix(c, top, smoothstep(0.34, 0.95, h));
            float glow = pow(clamp(dot(vP, normalize(vec3(1.0, 0.06, 0.0))), 0.0, 1.0), 9.0);
            gl_FragColor = vec4(mix(c, sun, glow * 0.85), 1.0);
          }`,
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[2000, 32, 16]} />
    </mesh>
  );
}

function Sun() {
  const mat = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const x = cv.getContext('2d')!;
    const g = x.createRadialGradient(128, 128, 4, 128, 128, 126);
    g.addColorStop(0, 'rgba(255,252,235,1)');
    g.addColorStop(0.4, 'rgba(255,225,150,.45)');
    g.addColorStop(1, 'rgba(255,190,90,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true });
  }, []);
  return <sprite material={mat} position={[X1 + 400, 22, 0]} scale={[750, 750, 1]} />;
}

function Clouds() {
  const group = useRef<THREE.Group>(null);
  const { tex, puffs } = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 256;
    const x = cv.getContext('2d')!;
    const p = [[130, 150, 74], [210, 120, 92], [300, 132, 80], [380, 158, 60], [250, 178, 86], [170, 180, 66], [340, 180, 64]];
    x.strokeStyle = 'rgba(120,66,26,.85)';
    x.lineWidth = 7;
    p.forEach(([a, b, r]) => (x.beginPath(), x.arc(a, b, r, 0, 7), x.stroke()));
    x.fillStyle = '#f6e2b4';
    p.forEach(([a, b, r]) => (x.beginPath(), x.arc(a, b, r, 0, 7), x.fill()));
    x.fillStyle = 'rgba(226,168,86,.55)';
    p.forEach(([a, b, r]) => (x.beginPath(), x.arc(a, b + 22, r * 0.86, 0, 7), x.fill()));
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    const rnd = rng(12);
    return {
      tex: t,
      puffs: Array.from({ length: 10 }, () => ({
        s: 150 + rnd() * 260,
        pos: [X1 + 280 + rnd() * 480, 75 + rnd() * 150, (rnd() - 0.5) * 920] as [number, number, number],
      })),
    };
  }, []);
  useFrame((_, dt) => {
    for (const [i, c] of (group.current?.children ?? []).entries()) {
      c.position.z += dt * (0.55 + (i % 3) * 0.26);
      if (c.position.z > 520) c.position.z = -520;
    }
  });
  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={[0, -Math.PI / 2, 0]} scale={[p.s, p.s, 1]}>
          <planeGeometry args={[1, 0.5]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} fog={false} opacity={0.92} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The pillar of cloud, moved from before Israel to behind them, between them and Egypt:
 * "a cloud and darkness to them, but it gave light by night to these" (Ex 14:19-20).
 */
function CloudPillar() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const puffs = useMemo(() => {
    const rnd = rng(8);
    return Array.from({ length: 120 }, (_, i) => {
      const y = (i / 120) * 560;
      const r = 16 + y * 0.06 + rnd() * 10;
      const a = rnd() * Math.PI * 2;
      return { y, a, r, s: 20 + rnd() * 16 + y * 0.035, spin: 0.03 + rnd() * 0.04, glow: rnd() < 0.2 && y < 200 };
    });
  }, []);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const mat = useMemo(() => toon('sea:cloud', { color: '#ffffff', emissive: '#ff8a2c', emissiveIntensity: 0.06 }), []);
  useLayoutEffect(() => {
    // grey-brown billows, with the warm glow of fire within (the light it gave to Israel)
    const c = new THREE.Color();
    puffs.forEach((p, i) => ref.current!.setColorAt(i, c.set(p.glow ? '#ffc070' : i % 3 ? '#9a8e80' : '#7a6f66')));
    ref.current!.instanceColor!.needsUpdate = true;
  }, [puffs]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const sv = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const mesh = ref.current;
    if (!mesh) return;
    puffs.forEach((p, i) => {
      const a = p.a + t * p.spin;
      const breathe = 1 + Math.sin(t * 0.4 + i) * 0.06;
      v.set(CLOUD_X + Math.cos(a) * p.r * 0.6, rise(CLOUD_X) + p.y, Math.sin(a) * p.r);
      mesh.setMatrixAt(i, m.compose(v, q, sv.setScalar(p.s * breathe)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, puffs.length]} frustumCulled={false} />;
}

/** Land beyond each shore, so the open sea meets a coast. */
function Shores() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(4400, 3000, 110, 60);
    g.rotateX(-Math.PI / 2);
    g.translate(400, 0, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      // under the seabed path, and dipping under the sea between the shores
      p.setY(i, rise(x) - 9 - (Math.abs(z) < HALF + 30 ? 6 : 0) + Math.sin(z * 0.01 + x * 0.004) * 4);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geo} material={toon('sea:shore', { color: '#c9a66e' })} />;
}

/** Everything around the path that you can't tap: sky, sea, the walls, the crowd, the waters' return. */
export function SeaWorld() {
  return (
    <>
      <Sky />
      <Sun />
      <Clouds />
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />
      <hemisphereLight args={['#ffd9a4', '#21506a', 2.2]} />
      <directionalLight position={[0.9, 1.0, 0.25]} intensity={2.8} color="#ffd7a0" />
      <directionalLight position={[-0.6, 0.4, -1]} intensity={0.8} color="#8fd8e0" />
      <Shores />
      <CloudPillar />
      <Walls />
      <Crowd />
      <Crash />
    </>
  );
}
