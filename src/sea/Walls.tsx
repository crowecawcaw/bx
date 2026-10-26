import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { toon } from '../scene/materials';
import { HALF, SEA, SLAB, X0, X1, rng, wallFoot, wallHeight, wallProfile } from './dims';
import { FINISH, NOISE, dropletTexture, fogUniforms, pixelRatio, waterTime } from './shaders';

const LEN = X1 - X0;
/** Texture space along the walls: one unit is the length the patterns were tuned for. */
const UV_LEN = 1182;
const SEG_X = 300;
const SEG_V = 42;

function wallGeometry(side: number, back: boolean) {
  const pos = new Float32Array((SEG_X + 1) * (SEG_V + 1) * 3);
  const uvs = new Float32Array((SEG_X + 1) * (SEG_V + 1) * 2);
  let p = 0;
  let u = 0;
  for (let j = 0; j <= SEG_V; j++) {
    const v = j / SEG_V;
    for (let i = 0; i <= SEG_X; i++) {
      const x = X0 + (i / SEG_X) * LEN;
      const q = wallProfile(v, x, side, back);
      pos[p++] = q[0];
      pos[p++] = q[1];
      pos[p++] = q[2];
      uvs[u++] = (x - X0) / UV_LEN;
      uvs[u++] = v;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < SEG_V; j++) {
    for (let i = 0; i < SEG_X; i++) {
      const a = j * (SEG_X + 1) + i;
      const b = a + 1;
      const c = a + SEG_X + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

/** Foam cap bridging the curling lip and the crest of the back face. */
function capGeometry(side: number) {
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= SEG_X; i++) {
    const x = X0 + (i / SEG_X) * LEN;
    const f = wallProfile(1, x, side, false);
    const b = wallProfile(1, x, side, true);
    const lift = 2.1 * Math.min(1, wallHeight(x, side) / 20);
    pos.push(f[0], f[1], f[2], (f[0] + b[0]) / 2, Math.max(f[1], b[1]) + lift, (f[2] + b[2]) / 2, b[0], b[1], b[2]);
    const s = (x - X0) / UV_LEN;
    uvs.push(s, 1, s, 1, s, 1);
  }
  for (let k = 0; k < SEG_X; k++) {
    const a = k * 3;
    idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

const WALL_VS = /* glsl */ `
uniform float uTime, uSide;
varying vec2 vUv;
varying float vDepth;
void main() {
  vUv = uv;
  vec3 p = position;
  float g = uv.y * uv.y;
  // the face heaves; the crest more than the foot
  p.z += (sin(p.x * 0.039 + uTime * 0.75) * 1.1 + sin(p.x * 0.0142 - uTime * 0.5) * 1.75) * g * uSide;
  p.y += sin(p.x * 0.064 + uTime * 1.05) * 0.74 * g;
  p.x += cos(p.x * 0.027 + uTime * 0.6) * 1.1 * g;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

// uMode: 0 = the clear front face, 1 = the dark back face, 2 = the foam cap.
const WALL_FS = /* glsl */ `
precision highp float;
uniform float uTime, uOpacity, uMode;
varying vec2 vUv;
varying float vDepth;
${NOISE}
${FINISH}
void main() {
  float h = vUv.y, t = uTime;
  float flow = fbm(vec2(vUv.x * 26.0, h * 3.2 - t * 0.22));
  float q = floor((h * 0.80 + flow * 0.55) * 5.0) / 5.0;
  vec3 col = mix(vec3(0.035, 0.129, 0.196), vec3(0.078, 0.373, 0.463), smoothstep(0.04, 0.52, q));
  col = mix(col, vec3(0.318, 0.706, 0.729), smoothstep(0.52, 1.0, q));
  float lines = sin(vUv.x * 900.0 + flow * 7.0 + h * 2.0);
  col *= 1.0 - smoothstep(0.72, 1.0, lines) * (0.30 + 0.45 * h) * 0.5;
  col *= 1.0 - smoothstep(0.94, 1.0, sin(vUv.x * 2600.0 + flow * 3.0)) * 0.25;
  float crest = smoothstep(0.68, 0.84, h + fbm(vec2(vUv.x * 44.0, t * 0.13)) * 0.20 - 0.06);
  float tongue = smoothstep(0.50, 0.98, h + 0.34 * fbm(vec2(vUv.x * 70.0 + t * 0.06, h * 2.0)));
  float foam = clamp(max(crest, tongue * 0.9), 0.0, 1.0);
  foam = clamp(step(0.55, foam) * 0.7 + smoothstep(0.3, 0.95, foam) * 0.4, 0.0, 1.0);
  vec3 white = vec3(0.941, 0.976, 0.976);
  if (uMode > 1.5) {
    float fz = fbm(vec2(vUv.x * 60.0, t * 0.2));
    col = mix(vec3(0.76, 0.86, 0.88), vec3(0.93, 0.97, 0.97), step(0.45, fz));
    col *= 1.0 - smoothstep(0.8, 1.0, sin(vUv.x * 1400.0 + fz * 8.0)) * 0.22;
    foam = 1.0;
  } else if (uMode > 0.5) {
    col *= 0.5;
    col = mix(col, white, foam * 0.35);
  } else {
    col = mix(col, white, foam);
  }
  float a = uMode > 0.5 ? 1.0 : mix(uOpacity, 1.0, foam);
  float f = fogAmount(vDepth);
  gl_FragColor = vec4(fogged(col, vDepth), mix(a, 1.0, f * 0.55));
}`;

function wallMaterial(side: number, mode: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: waterTime, uSide: { value: side }, uOpacity: { value: 0.62 }, uMode: { value: mode }, ...fogUniforms },
    vertexShader: WALL_VS,
    fragmentShader: WALL_FS,
    side: THREE.DoubleSide,
    transparent: mode === 0,
    depthWrite: mode !== 0,
  });
}

/** The open sea either side of the walls, seen as you climb toward the shore. */
function SeaSurface() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: waterTime, ...fogUniforms },
        vertexShader: /* glsl */ `
          uniform float uTime;
          varying vec2 vW;
          varying float vDepth;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            w.y += sin(w.x * 0.05 + uTime * 0.9) * 0.6 + sin(w.z * 0.07 - uTime * 0.7) * 0.5;
            vW = w.xz;
            vec4 mv = viewMatrix * w;
            vDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec2 vW;
          varying float vDepth;
          ${NOISE}
          ${FINISH}
          void main() {
            float n = fbm(vW * 0.02 + vec2(uTime * 0.03, 0.0));
            float q = floor(n * 4.0) / 4.0;
            vec3 col = mix(vec3(0.06, 0.30, 0.38), vec3(0.22, 0.56, 0.60), q);
            float glint = step(0.72, fbm(vW * 0.09 - vec2(0.0, uTime * 0.12)));
            col = mix(col, vec3(0.95, 0.93, 0.82), glint * 0.5);
            gl_FragColor = vec4(fogged(col, vDepth), 1.0);
          }`,
      }),
    [],
  );
  const inner = HALF + SLAB - 1.5;
  const width = 2400;
  return (
    <>
      {[-1, 1].map((s) => (
        <mesh key={s} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[(X0 + X1) / 2, SEA - 0.4, s * (inner + width / 2)]}>
          <planeGeometry args={[LEN + 1600, width, 60, 40]} />
        </mesh>
      ))}
    </>
  );
}

/** Bubbles rising inside the front faces of the walls. */
function Bubbles() {
  const { geo, mat } = useMemo(() => {
    const rnd = rng(5);
    const pos: number[] = [];
    const range: number[] = [];
    const seed: number[] = [];
    while (seed.length < 320) {
      const side = seed.length % 2 ? 1 : -1;
      const x = X0 + rnd() * (X1 - X0);
      const h = wallHeight(x, side);
      if (h < 12) continue;
      const q = wallProfile(rnd() * 0.85, x, side, false);
      pos.push(q[0], q[1], q[2] + side * (0.9 + rnd() * 3.3));
      range.push(wallFoot(x), h * 0.9);
      seed.push(rnd() * 100, 1.5 + rnd() * 4.2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aRange', new THREE.Float32BufferAttribute(range, 2));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 2));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: waterTime, uMap: { value: dropletTexture() }, uPx: pixelRatio },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uTime, uPx;
        attribute vec2 aRange, aSeed;
        varying float vA;
        void main() {
          vec3 p = position;
          float y = mod(p.y - aRange.x + uTime * aSeed.y + aSeed.x, aRange.y);
          p.y = aRange.x + y;
          p.z += sin(uTime * 1.4 + aSeed.x) * 0.35;
          vA = smoothstep(0.0, 4.0, y) * (1.0 - smoothstep(aRange.y * 0.8, aRange.y, y));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (26.0 + aSeed.x * 0.12) * (19.7 / max(1.0, -mv.z)) * uPx;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying float vA;
        void main() { vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(pow(t.rgb, vec3(2.2)), t.a * vA * 0.75); }`,
    });
    return { geo: g, mat: m };
  }, []);
  return <points geometry={geo} material={mat} renderOrder={2} frustumCulled={false} />;
}

/** Spray torn off the crests by the east wind (Ex 14:21). */
function CrestSpray() {
  const { geo, mat } = useMemo(() => {
    const rnd = rng(9);
    const pos: number[] = [];
    const seed: number[] = [];
    while (seed.length < 2 * 300) {
      const side = seed.length % 4 ? 1 : -1;
      const x = X0 + rnd() * (X1 - X0);
      if (wallHeight(x, side) < 12) continue;
      const q = wallProfile(1, x, side, false);
      pos.push(...q);
      seed.push(rnd(), 0.6 + rnd() * 0.9);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 2));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: waterTime, uMap: { value: dropletTexture() }, uPx: pixelRatio },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uTime, uPx;
        attribute vec2 aSeed;
        varying float vA;
        void main() {
          float t = fract(uTime * 0.16 + aSeed.x);
          vec3 p = position;
          p.z -= sign(p.z) * t * 12.0 * aSeed.y;
          p.y += t * 8.8 - 15.3 * t * t;
          p.x += t * 6.6 * aSeed.y;
          vA = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.55, 1.0, t));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = 22.0 * (19.7 / max(1.0, -mv.z)) * uPx;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying float vA;
        void main() { vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(1.0, 1.0, 1.0, t.a * vA * 0.5); }`,
    });
    return { geo: g, mat: m };
  }, []);
  return <points geometry={geo} material={mat} renderOrder={4} frustumCulled={false} />;
}

const FISH_COLORS = ['#b9c6c9', '#9fb3b8', '#d8cfae', '#a8bcae', '#c9b79a'];

/** Fish swimming along inside the walls, just behind the glassy face. */
function Fish() {
  const fish = useMemo(() => {
    const rnd = rng(21);
    return Array.from({ length: 44 }, (_, i) => {
      const color = FISH_COLORS[i % FISH_COLORS.length];
      const m = toon(`fish:${color}`, { color });
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), m);
      body.scale.set(1.55, 0.82, 0.42);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.05, 4), m);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -1.85;
      tail.scale.z = 0.28;
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 4), m);
      fin.rotation.z = -0.5;
      fin.position.set(0.1, 0.72, 0);
      fin.scale.z = 0.25;
      g.add(body, tail, fin);
      g.scale.setScalar(0.9 + rnd() * 1.2);
      return {
        g,
        side: i % 2 ? 1 : -1,
        v: 0.12 + rnd() * 0.5,
        x: -120 + rnd() * 900,
        dir: rnd() < 0.5 ? 1 : -1,
        speed: 3.5 + rnd() * 7.5,
        phase: rnd() * 7,
        depth: 1.1 + rnd() * 3.3,
      };
    });
  }, []);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = waterTime.value;
    for (const f of fish) {
      f.x += f.dir * f.speed * dt;
      if (f.x > X1 - 300) f.dir = -1;
      if (f.x < X0 + 260) f.dir = 1;
      const v = Math.min(0.95, f.v + Math.sin(t * 0.6 + f.phase) * 0.02);
      const q = wallProfile(v, f.x, f.side, false);
      // stay well inside the water as the walls get low near the shore
      f.g.visible = wallHeight(f.x, f.side) > 18;
      f.g.position.set(q[0], q[1], q[2] + f.side * f.depth);
      f.g.rotation.set(Math.sin(t * 0.7 + f.phase) * 0.09, (f.dir > 0 ? 0 : Math.PI) + Math.sin(t * 4 + f.phase) * 0.14, 0);
    }
  });
  return (
    <>
      {fish.map((f, i) => (
        <primitive key={i} object={f.g} />
      ))}
    </>
  );
}

/** "The waters were a wall unto them on their right hand, and on their left" (Ex 14:22). */
export function Walls() {
  const meshes = useMemo(
    () =>
      [-1, 1].flatMap((s) => [
        { geo: wallGeometry(s, true), mat: wallMaterial(s, 1), order: 0 },
        { geo: capGeometry(s), mat: wallMaterial(s, 2), order: 0 },
        { geo: wallGeometry(s, false), mat: wallMaterial(s, 0), order: 3 },
      ]),
    [],
  );
  const clock = useRef(0);
  useFrame(({ gl }, dt) => {
    clock.current += Math.min(dt, 0.05);
    waterTime.value = clock.current;
    pixelRatio.value = gl.getPixelRatio();
  });
  return (
    <>
      {meshes.map((m, i) => (
        <mesh key={i} geometry={m.geo} material={m.mat} renderOrder={m.order} frustumCulled={false} />
      ))}
      <SeaSurface />
      <Bubbles />
      <CrestSpray />
      <Fish />
    </>
  );
}
