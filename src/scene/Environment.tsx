import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COURT } from './dims';
import { toon, toonRamp, windTime } from './materials';
import { sandTexture, trodTexture } from './textures';

export function SkyDome() {
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
      <sphereGeometry args={[1800, 32, 16]} />
    </mesh>
  );
}

// Smooth value noise for the ridgelines.
function hash2(x: number, y: number) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function noise2(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
/** Ridged fractal noise: sharp crests, broad valleys. 0..1 */
export function ridged(x: number, y: number) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let o = 0; o < 5; o++) {
    const n = 1 - Math.abs(noise2(x * f, y * f) * 2 - 1);
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

const SINAI: [number, number] = [260, 300];

/** The granite ranges of the Sinai wilderness: a continuous ring of ridges around the camp. */
function Mountains() {
  const geo = useMemo(() => {
    const A = 360; // segments around
    const R = 48; // segments outward
    const r0 = 330;
    const r1 = 1000;
    const pos: number[] = [];
    const col: number[] = [];
    const low = new THREE.Color('#c39a6b');
    const mid = new THREE.Color('#a2674a');
    const high = new THREE.Color('#7a5444');
    const c = new THREE.Color();
    for (let j = 0; j <= R; j++) {
      const t = j / R;
      const r = r0 + (r1 - r0) * t * t * 0.6 + (r1 - r0) * t * 0.4;
      for (let i = 0; i <= A; i++) {
        const a = (i / A) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const env = THREE.MathUtils.smoothstep(r, r0, r0 + 160);
        const n = ridged(x / 210 + 7.3, z / 210 - 2.1);
        let h = env * (25 + 210 * Math.pow(n, 1.6));
        const ds = Math.hypot(x - SINAI[0], z - SINAI[1]);
        const crag = ridged(x / 45 + 1.7, z / 45 + 4.1);
        h += 250 * Math.exp(-ds / 55) * (0.45 + 0.55 * crag) * env;
        pos.push(x, h - 1, z);
        const k = Math.min(1, h / 200);
        c.copy(low).lerp(mid, THREE.MathUtils.smoothstep(k, 0.08, 0.45));
        c.lerp(high, THREE.MathUtils.smoothstep(k, 0.5, 1));
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
    return g.toNonIndexed(); // faceted, like cut stone
  }, []);
  useLayoutEffect(() => geo.computeVertexNormals(), [geo]);
  const mat = useMemo(
    () => new THREE.MeshToonMaterial({ gradientMap: toonRamp(), vertexColors: true }),
    [],
  );
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
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

/**
 * "The cloud of the LORD was upon the tabernacle by day" (Ex 40:38).
 * A billowing column: puffs rise from the tent, swirl, and spread into a canopy above.
 * Each puff is a camera-facing disc shaded like a toon sphere, animated on the GPU.
 */
function CloudPillar() {
  const N = 150;
  const { geo, mat } = useMemo(() => {
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    const seed = new Float32Array(N * 4);
    let s = 7;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < N; i++) seed.set([i / N + rnd() * 0.004, rnd(), rnd(), rnd()], i * 4);
    g.setAttribute('seed', new THREE.InstancedBufferAttribute(seed, 4));
    g.instanceCount = N;
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec4 seed;
        uniform float time;
        varying vec2 vUv;
        void main() {
          float t = fract(time * 0.014 + seed.x);
          float top = smoothstep(0.78, 1.0, t);
          float y = 11.0 + t * 60.0 - top * top * 6.0;
          float ang = seed.y * 6.2832 + time * 0.1 + t * 4.0;
          float spread = 1.0 + t * 3.0 + seed.z * 1.6 + top * 9.0;
          vec3 c = vec3(cos(ang) * spread, y, sin(ang) * spread);
          c.x += sin(time * 0.19 + y * 0.045) * 1.6;
          c.z += cos(time * 0.15 + y * 0.05) * 1.2;
          float size = (2.4 + seed.w * 2.0 + t * 2.8 + top * 2.0)
            * smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.9, 1.0, t));
          vec4 mv = modelViewMatrix * vec4(c, 1.0);
          mv.xy += position.xy * size * 2.0;
          vUv = uv;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r2 = dot(p, p);
          if (r2 > 1.0) discard;
          vec3 n = vec3(p, sqrt(1.0 - r2));
          float l = dot(n, normalize(vec3(0.35, 0.8, 0.5)));
          vec3 col = l > 0.6 ? vec3(1.0, 0.995, 0.97) : l > 0.2 ? vec3(0.91, 0.89, 0.84) : vec3(0.78, 0.75, 0.69);
          float a = 1.0 - smoothstep(0.35, 1.0, r2);
          gl_FragColor = vec4(col, a * 0.92);
        }`,
      // soft puffs that blend into each other; no depth writes, so the ink pass leaves them alone
      transparent: true,
      depthWrite: false,
    });
    return { geo: g, mat };
  }, []);
  useFrame(({ clock }) => {
    mat.uniforms.time.value = clock.elapsedTime + 60; // start mid-cycle so the column is already full
  });
  return (
    <group position={[-25, 0, 0]} userData={{ feature: 'cloud' }}>
      <mesh geometry={geo} material={mat} frustumCulled={false} />
    </group>
  );
}

/** Worn ground: the path from the camp to the gate, and the trodden floor of the court. */
function Trodden() {
  const mat = useMemo(() => {
    const m = toon('trod', { map: trodTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    return m;
  }, []);
  const courtMat = useMemo(
    () => toon('courtFloor', { color: '#b9936a', transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    [],
  );
  const len = 260;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COURT.maxX + len / 2, 0.01, 0]} material={mat} receiveShadow>
        <planeGeometry args={[len, 22]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} material={courtMat} receiveShadow>
        <planeGeometry args={[COURT.maxX - COURT.minX, COURT.maxZ - COURT.minZ]} />
      </mesh>
    </group>
  );
}

/** Scattered stones and broom bushes (retem) across the wilderness floor. */
function Scatter() {
  const stones = useRef<THREE.InstancedMesh>(null);
  const bushes = useRef<THREE.InstancedMesh>(null);
  const { stoneM, bushM } = useMemo(() => {
    let s = 21;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const free = (x: number, z: number) => {
      const inCourt = x > COURT.minX - 4 && x < COURT.maxX + 4 && z > COURT.minZ - 4 && z < COURT.maxZ + 4;
      const onPath = x > COURT.maxX && Math.abs(z) < 12;
      return !inCourt && !onPath;
    };
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const stoneM: THREE.Matrix4[] = [];
    const bushM: THREE.Matrix4[] = [];
    while (stoneM.length < 500) {
      const a = rnd() * Math.PI * 2;
      const d = 52 + Math.pow(rnd(), 1.5) * 280;
      const x = Math.cos(a) * d * 1.15;
      const z = Math.sin(a) * d;
      if (!free(x, z)) continue;
      const k = 0.32 + Math.pow(rnd(), 3) * 0.8;
      q.setFromEuler(e.set(rnd() * 3, rnd() * 3, rnd() * 3));
      stoneM.push(m.clone().compose(new THREE.Vector3(x, k * 0.2, z), q, new THREE.Vector3(k * (1 + rnd()), k * 0.6, k)));
    }
    while (bushM.length < 160) {
      const a = rnd() * Math.PI * 2;
      const d = 55 + rnd() * 260;
      const x = Math.cos(a) * d * 1.15;
      const z = Math.sin(a) * d;
      if (!free(x, z)) continue;
      const k = 0.6 + rnd() * 0.9;
      q.setFromEuler(e.set(0, rnd() * 6, 0));
      bushM.push(m.clone().compose(new THREE.Vector3(x, k * 0.35, z), q, new THREE.Vector3(k * 1.3, k * 0.8, k * 1.1)));
    }
    return { stoneM, bushM };
  }, []);
  useLayoutEffect(() => {
    stoneM.forEach((m, i) => stones.current!.setMatrixAt(i, m));
    bushM.forEach((m, i) => bushes.current!.setMatrixAt(i, m));
    stones.current!.instanceMatrix.needsUpdate = true;
    bushes.current!.instanceMatrix.needsUpdate = true;
    stones.current!.computeBoundingSphere();
    bushes.current!.computeBoundingSphere();
  }, [stoneM, bushM]);
  const stoneGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const bushGeo = useMemo(() => {
    // a clump of three lumps
    const parts = [
      [0, 0, 0, 1],
      [0.7, -0.1, 0.3, 0.7],
      [-0.6, -0.15, -0.2, 0.75],
    ].map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 0).translate(x, y, z));
    return mergeGeometries(parts)!;
  }, []);
  return (
    <group>
      <instancedMesh ref={stones} args={[stoneGeo, toon('stone', { color: '#a08468' }), stoneM.length]} castShadow receiveShadow />
      <instancedMesh ref={bushes} args={[bushGeo, toon('bush', { color: '#7f8a58' }), bushM.length]} castShadow receiveShadow />
    </group>
  );
}

export function Wind() {
  useFrame(({ clock }) => {
    windTime.value = clock.elapsedTime;
  });
  return null;
}

export function World() {
  const ground = useMemo(() => toon('ground', { map: sandTexture() }), []);
  return (
    <>
      <SkyDome />
      <fog attach="fog" args={['#ecdcc0', 220, 1400]} />
      {/* cool sky fill, so shadows read blue-violet against the warm sun */}
      <hemisphereLight args={['#a9b6e8', '#c49460', 1.0]} />
      {/* a low morning sun from the east-southeast, for long shadows */}
      <directionalLight
        position={[75, 50, 42]}
        intensity={2.5}
        color="#ffdcae"
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
        <planeGeometry args={[3000, 3000]} />
      </mesh>
      <Trodden />
      <Scatter />
      <Wind />
      <Mountains />
      <Camp />
      <CloudPillar />
    </>
  );
}
