import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { DEBUG } from '../scene/dims';
import { cameraFx, player } from '../scene/Player';
import { CRASH_AT, HALF, RESET_X, SEA, START, groundH } from './dims';
import { FINISH, NOISE, fogUniforms, pixelRatio, waterTime } from './shaders';

/*
 * Climb the far bank until you stand above the sea, and the waters return (Ex 14:26-28).
 * Two breakers rise out of the open sea either side of you, curl over and meet overhead.
 * Spray flies off their lips and bursts up where they land. You are knocked over and tumbled
 * underwater, then wake at the foot of the slope.
 *
 * The breaker's shape is one function of (along, up, side, progress), shared by the mesh and
 * the spray so every droplet leaves from the lip where it really is.
 */

const HALF_LEN = 130; // the breaker runs this far either side of you
const BREAK = 4.2; // seconds for the whole curl, centre first, ends last
const IMPACT = 2.55; // the lip comes down on you
const BLACKOUT = 5.5; // foam fills the view
const RESET = 6.1; // wake on the seabed
const END = 7.6;

const BREAKER = /* glsl */ `
uniform float uBase, uSea, uTime;
// lx: along the path from you; v: 0 at the foot out in the sea, 1 at the lip; s: side; p: progress
vec3 breaker(float lx, float v, float s, float p) {
  float d = abs(lx) / ${HALF_LEN.toFixed(1)};
  float pl = clamp((p - 0.3 * d) / 0.7, 0.0, 1.0);
  float rise = smoothstep(0.0, 0.5, pl);
  float fall = smoothstep(0.45, 0.95, pl);
  float taper = sqrt(max(0.0, 1.0 - d * d));
  float top = mix(uSea - 6.0, uBase + 50.0, rise) + sin(lx * 0.07 + s) * 3.0 * rise;
  vec2 F = vec2(s * ${(HALF + 16).toFixed(1)}, uSea - 8.0);
  vec2 C1 = vec2(s * ${(HALF + 12).toFixed(1)}, mix(F.y, top, 0.7));
  vec2 C2 = vec2(s * (${(HALF - 2).toFixed(1)} - 16.0 * fall), mix(top + 8.0, uBase + 26.0, fall * fall));
  vec2 L0 = vec2(s * (${(HALF - 6).toFixed(1)} - 6.0 * rise), top + 2.0);
  vec2 L1 = vec2(-s * 5.0, uBase - 2.0);
  vec2 L = vec2(mix(L0.x, L1.x, fall), mix(L0.y, L1.y, fall * fall));
  float u = 1.0 - v;
  vec2 b = u * u * u * F + 3.0 * u * u * v * C1 + 3.0 * u * v * v * C2 + v * v * v * L;
  b = mix(F, b, taper);
  b.y += sin(lx * 0.21 + uTime * 3.0 + v * 6.0) * 0.8 * v * rise;
  float x = lx + sin(lx * 0.05 + s * 2.0) * 3.0 * rise + v * v * 6.0 * fall;
  return vec3(x, b.y, b.x);
}
float fallOf(float lx, float p) {
  float pl = clamp((p - 0.3 * abs(lx) / ${HALF_LEN.toFixed(1)}) / 0.7, 0.0, 1.0);
  return smoothstep(0.45, 0.95, pl);
}`;

function breakerGeometry() {
  const SX = 120;
  const SV = 36;
  const pos: number[] = [];
  const idx: number[] = [];
  for (const s of [-1, 1]) {
    const o = pos.length / 3;
    for (let j = 0; j <= SV; j++) {
      for (let i = 0; i <= SX; i++) pos.push(-HALF_LEN + (i / SX) * HALF_LEN * 2, j / SV, s);
    }
    for (let j = 0; j < SV; j++) {
      for (let i = 0; i < SX; i++) {
        const a = o + j * (SX + 1) + i;
        idx.push(a, a + SX + 1, a + 1, a + 1, a + SX + 1, a + SX + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function sprayGeometry() {
  let seed = 4;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const A: number[] = [];
  const B: number[] = [];
  for (let i = 0; i < 2600; i++) {
    const s = i % 2 ? 1 : -1;
    if (i < 1800) {
      // torn off the lip as it travels
      A.push((r() * 2 - 1) * HALF_LEN * 0.8, 0.86 + r() * 0.14, s, 0);
      B.push(0.9 + r() * 2.2, (r() - 0.5) * 8, 6 + r() * 16, -s * (3 + r() * 11));
    } else {
      // thrown up where the lip lands
      A.push((r() * 2 - 1) * 60, r(), s, 1);
      B.push(IMPACT - 0.15 + r() * 0.8, (r() - 0.5) * 14, 14 + r() * 32, s * (2 + r() * 14));
    }
  }
  const g = new THREE.BufferGeometry();
  // positions are worked out in the shader; this attribute just sets the count
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(A.length / 4 * 3), 3));
  g.setAttribute('aA', new THREE.Float32BufferAttribute(A, 4));
  g.setAttribute('aB', new THREE.Float32BufferAttribute(B, 4));
  return g;
}

function softDot() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const x = cv.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(240,250,252,.8)');
  g.addColorStop(1, 'rgba(220,240,245,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

/** The screen overlay: underwater murk, white foam, and a caption on waking. */
let wash: { root: HTMLDivElement; under: HTMLDivElement; foam: HTMLDivElement; caption: HTMLDivElement } | null = null;
function getWash() {
  if (wash) return wash;
  const root = document.createElement('div');
  root.className = 'sea-wash';
  const under = document.createElement('div');
  under.className = 'sea-under';
  for (let i = 0; i < 16; i++) {
    const b = document.createElement('span');
    b.style.left = `${(i * 37) % 100}%`;
    b.style.animationDelay = `${(i * 0.29) % 1.6}s`;
    b.style.width = b.style.height = `${8 + ((i * 13) % 26)}px`;
    under.appendChild(b);
  }
  const foam = document.createElement('div');
  foam.className = 'sea-foam';
  const caption = document.createElement('div');
  caption.className = 'sea-caption';
  caption.innerHTML = '“And the waters returned…”<span>Exodus 14:28</span>';
  root.append(under, foam, caption);
  document.body.appendChild(root);
  wash = { root, under, foam, caption };
  return wash;
}

const smooth = THREE.MathUtils.smoothstep;

export function Crash() {
  const state = useRef({ on: false, t: 0, x: 0 });
  if (DEBUG) (window as unknown as Record<string, unknown>).__crash = state.current;
  const uniforms = useMemo(
    () => ({
      uP: { value: 0 },
      uT: { value: 0 },
      uBase: { value: 0 },
      uSea: { value: SEA },
      uTime: waterTime,
      uPx: pixelRatio,
      uMap: { value: softDot() },
      ...fogUniforms,
    }),
    [],
  );
  const { wave, spray } = useMemo(() => {
    const waveMat = new THREE.ShaderMaterial({
      uniforms,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        uniform float uP;
        ${BREAKER}
        varying float vV, vFall, vDepth, vLx;
        void main() {
          vec3 p = breaker(position.x, position.y, position.z, uP);
          vV = position.y;
          vLx = position.x;
          vFall = fallOf(position.x, uP);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying float vV, vFall, vDepth, vLx;
        ${NOISE}
        ${FINISH}
        void main() {
          float n = fbm(vec2(vLx * 0.06, vV * 4.0 - uTime * 0.8));
          float q = floor((vV * 0.9 + n * 0.4) * 5.0) / 5.0;
          vec3 col = mix(vec3(0.03, 0.14, 0.2), vec3(0.08, 0.42, 0.5), smoothstep(0.1, 0.6, q));
          col = mix(col, vec3(0.36, 0.74, 0.76), smoothstep(0.6, 0.95, q));
          float streak = smoothstep(0.75, 1.0, sin(vLx * 0.9 + n * 9.0 + vV * 3.0));
          col = mix(col, vec3(0.75, 0.9, 0.92), streak * vV * 0.35);
          float foam = smoothstep(0.78 - 0.3 * vFall, 0.95 - 0.2 * vFall, vV + (n - 0.5) * 0.25);
          col = mix(col, vec3(0.95, 0.98, 0.98), foam);
          gl_FragColor = vec4(fogged(col, vDepth), 1.0);
        }`,
    });
    const sprayMat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uT, uPx;
        attribute vec4 aA, aB;
        ${BREAKER}
        varying float vA;
        void main() {
          float age = uT - aB.x;
          float life = aA.w > 0.5 ? 1.9 : 1.4;
          vec3 o = aA.w > 0.5
            ? vec3(aA.x, uBase + 0.5, aA.z * aA.y * 10.0)
            : breaker(aA.x, aA.y, aA.z, aB.x / ${BREAK.toFixed(1)});
          vec3 p = o + aB.yzw * age + vec3(0.0, -16.0 * age * age, 0.0);
          vA = step(0.0, age) * (1.0 - smoothstep(life * 0.5, life, age));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float size = (aA.w > 0.5 ? 46.0 : 30.0) * (0.6 + 0.8 * fract(aA.x * 7.31));
          gl_PointSize = vA > 0.0 ? size * (19.7 / max(1.0, -mv.z)) * uPx : 0.0;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying float vA;
        void main() { vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(0.9, 0.97, 1.0), t.a * vA * 0.85); }`,
    });
    const w = new THREE.Mesh(breakerGeometry(), waveMat);
    const s = new THREE.Points(sprayGeometry(), sprayMat);
    for (const o of [w, s]) {
      o.frustumCulled = false;
      o.visible = false;
    }
    s.renderOrder = 5;
    return { wave: w, spray: s };
  }, [uniforms]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const S = state.current;
    if (!S.on) {
      if (player.locked || groundH(player.x, player.z) < CRASH_AT) return;
      S.on = true;
      S.t = 0;
      S.x = player.x;
      player.locked = true;
      player.path = [];
      player.target = null;
      uniforms.uBase.value = groundH(player.x, 0);
      wave.position.x = spray.position.x = S.x;
      wave.visible = spray.visible = true;
      getWash().root.classList.add('on');
    }
    const t = (S.t += dt);
    uniforms.uP.value = Math.min(1, t / BREAK);
    uniforms.uT.value = t;
    const W = getWash();

    // the ground shakes as the sea rises; after the blow you tumble, swept back down the slope
    const live = t < RESET ? 1 : 0;
    const hit = smooth(t, IMPACT - 0.1, IMPACT + 0.3) * live;
    const shake = (smooth(t, 0.2, IMPACT) * 0.35 + hit * 0.6) * live;
    cameraFx.x = Math.sin(t * 37) * shake * 0.5;
    cameraFx.y = Math.sin(t * 41 + 1) * shake * 0.4 - hit * 2.5;
    cameraFx.z = Math.sin(t * 29 + 2) * shake * 0.5;
    cameraFx.pitch = 0.42 * smooth(t, 0.2, 1.8) * (1 - hit) * live + Math.sin((t - IMPACT) * 1.7) * 0.7 * hit;
    cameraFx.roll = Math.sin((t - IMPACT) * 2.3) * 1.1 * hit;
    if (t > IMPACT && t < RESET) player.x -= 20 * dt * (1 - smooth(t, IMPACT, BLACKOUT));

    W.under.style.opacity = String(hit * 0.88);
    W.foam.style.opacity = String(
      Math.max(smooth(t, IMPACT - 0.2, IMPACT) * (1 - smooth(t, IMPACT, IMPACT + 0.5)) * 0.85, smooth(t, BLACKOUT - 0.4, BLACKOUT + 0.2) * (1 - smooth(t, RESET + 0.2, END))),
    );
    W.caption.style.opacity = String(smooth(t, BLACKOUT, BLACKOUT + 0.5) * (1 - smooth(t, END - 0.4, END)));

    if (t >= RESET && wave.visible) {
      wave.visible = spray.visible = false;
      player.x = RESET_X;
      player.z = 0;
      player.yaw = START.yaw;
      player.pitch = -0.04;
    }
    if (t >= END) {
      S.on = false;
      player.locked = false;
      Object.assign(cameraFx, { x: 0, y: 0, z: 0, pitch: 0, roll: 0 });
      W.root.classList.remove('on');
    }
  });

  return (
    <>
      <primitive object={wave} />
      <primitive object={spray} />
    </>
  );
}
