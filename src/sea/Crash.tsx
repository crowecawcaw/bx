import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { DEBUG } from '../scene/dims';
import { buildNav } from '../scene/nav';
import { cameraFx, player, teleportTo } from '../scene/Player';
import { useStore } from '../store';
import { HALF, RISE_H, RISE_LEN, RISE_X, SEA, SHORE_X, START, WEST_LEN, WEST_X, X0 } from './dims';
import { FINISH, NOISE, fogUniforms, pixelRatio, waterTime } from './shaders';
import { OPEN, tide } from './tide';

/*
 * Step out of the sea onto the far shore, and the waters return behind you (Ex 14:26-28).
 * Starting at the shore and racing back toward Egypt, each stretch of the walls surges up, curls
 * over the path and slams down onto the seabed, throwing up spray, then levels into open sea.
 * You stand on dry land with the multitude and watch.
 *
 * The breaker's shape is one function of (x, up, side, progress), shared by the mesh and the
 * spray so every droplet leaves from the lip where it really is. At the start it matches the
 * standing wall it replaces; at the end it is flat sea.
 */

const SPEED = 150; // cubits per second that the closing runs back toward Egypt
const LOCAL = 3.2; // seconds for one stretch to rise, curl, fall and settle
const DELAY = 0.8; // a moment to turn and look before the first wall moves
const CAPTION = DELAY + LOCAL + 0.6;
const END = DELAY + (SHORE_X - X0) / SPEED + LOCAL;

const GLSL = /* glsl */ `
uniform float uTime;
float easeC(float t) { t = clamp(t, 0.0, 1.0); return (1.0 - cos(3.14159265 * t)) * 0.5; }
float seabed(float x) {
  return ${RISE_H.toFixed(1)} * max(easeC((x - ${RISE_X.toFixed(1)}) / ${RISE_LEN.toFixed(1)}), easeC((${WEST_X.toFixed(1)} - x) / ${WEST_LEN.toFixed(1)}));
}
// seconds since the closing reached x, scaled to this stretch's 0..1
float localP(float x, float t) { return clamp((t - (${SHORE_X.toFixed(2)} - x) / ${SPEED.toFixed(1)}) / ${LOCAL.toFixed(1)}, 0.0, 1.0); }
// v: 0 out in the open sea, 0.25 at the foot of the wall, 1 at the lip; s: side; pl: progress
vec3 breaker(float x, float v, float s, float pl) {
  const float SEA = ${SEA.toFixed(1)};
  float base = min(seabed(x), SEA);
  float k = clamp((SEA - base) / 25.0, 0.0, 1.0); // walls are low near the shores, and so is the surge
  float rise = smoothstep(0.0, 0.4, pl);
  float fall = smoothstep(0.3, 0.8, pl);
  float settle = smoothstep(0.75, 1.0, pl);
  float top = mix(SEA, SEA + 18.0 * k, rise) + sin(x * 0.07 + s) * 3.0 * rise * k;
  vec2 O = vec2(s * ${(HALF + 8).toFixed(1)}, SEA - 0.3);
  vec2 Fo = vec2(s * ${HALF.toFixed(1)}, base - 1.0);
  vec2 C1 = vec2(s * (${(HALF - 1).toFixed(1)} + 6.0 * rise), mix(base + (SEA - base) * 0.45, top * 0.8 + base * 0.2, rise));
  vec2 C2 = vec2(s * (${(HALF - 4).toFixed(1)} - 14.0 * fall), mix(top + 6.0 * k * rise, base + 4.0 + 22.0 * k, fall * fall));
  vec2 L0 = vec2(s * (${(HALF - 8).toFixed(1)} - 4.0 * rise * k), top - 1.0);
  vec2 L1 = vec2(-s * 5.0, base - 2.0);
  vec2 L = vec2(mix(L0.x, L1.x, fall), mix(L0.y, L1.y, fall * fall));
  vec2 b;
  if (v < 0.25) b = mix(O, Fo, v / 0.25); // the back of the wall, down from the open sea
  else {
    float w = (v - 0.25) / 0.75, u = 1.0 - w;
    b = u * u * u * Fo + 3.0 * u * u * w * C1 + 3.0 * u * w * w * C2 + w * w * w * L;
    b.y += sin(x * 0.21 + uTime * 3.0 + w * 6.0) * 0.8 * w * rise * (1.0 - settle);
  }
  vec2 level = vec2(mix(O.x, 0.0, v), SEA - 0.3 + sin(x * 0.09 + uTime * 1.3 + v * 5.0) * 0.5);
  b = mix(b, level, settle);
  float xx = x + (sin(x * 0.05 + s * 2.0) * 3.0 * rise + v * v * 6.0 * fall) * (1.0 - settle) * k;
  return vec3(xx, b.y, b.x);
}`;

function breakerGeometry() {
  const SX = 460;
  const SV = 40;
  const x1 = SHORE_X + 4;
  const pos: number[] = [];
  const idx: number[] = [];
  for (const s of [-1, 1]) {
    const o = pos.length / 3;
    for (let j = 0; j <= SV; j++) {
      for (let i = 0; i <= SX; i++) pos.push(X0 + (i / SX) * (x1 - X0), j / SV, s);
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

/** Spray, densest near the shore where you watch. aA: x, v, side, kind; aB: progress at birth, velocity. */
function sprayGeometry() {
  let seed = 4;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const A: number[] = [];
  const B: number[] = [];
  for (let i = 0; i < 4200; i++) {
    const s = i % 2 ? 1 : -1;
    const x = SHORE_X - Math.pow(r(), 1.7) * (SHORE_X - X0);
    if (i < 2600) {
      // torn off the lip as it curls over
      A.push(x, 0.88 + r() * 0.12, s, 0);
      B.push(0.3 + r() * 0.45, (r() - 0.5) * 8, 4 + r() * 14, -s * (3 + r() * 11));
    } else {
      // thrown up where the lip lands on the seabed
      A.push(x, r(), s, 1);
      B.push(0.7 + r() * 0.22, (r() - 0.5) * 14, 14 + r() * 34, s * (2 + r() * 14));
    }
  }
  const g = new THREE.BufferGeometry();
  // positions are worked out in the shader; this attribute just sets the count
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((A.length / 4) * 3), 3));
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

/** The verse, and a way back to the start once the sea has closed. */
let card: HTMLDivElement | null = null;
function getCard(onAgain: () => void) {
  if (card) return card;
  card = document.createElement('div');
  card.className = 'sea-return';
  card.innerHTML = '<p>“And the waters returned, and covered the chariots, and the horsemen…”<span>Exodus 14:28</span></p>';
  const b = document.createElement('button');
  b.className = 'primary';
  b.textContent = 'Cross again';
  b.addEventListener('click', onAgain);
  card.appendChild(b);
  document.body.appendChild(card);
  return card;
}

const smooth = THREE.MathUtils.smoothstep;
/** Rebuild the walkable area now (the sea has closed or parted), and tell the player it changed. */
const rebuildNav = () => {
  buildNav(useStore.getState().open);
  useStore.setState((s) => ({ navVersion: s.navVersion + 1 }));
};

function angleTo(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function Crash() {
  const state = useRef({ on: false, t: 0, lookedAt: 0 });
  if (DEBUG) (window as unknown as Record<string, unknown>).__crash = state.current;
  const uniforms = useMemo(
    () => ({ uT: { value: 0 }, uTime: waterTime, uPx: pixelRatio, uMap: { value: softDot() }, ...fogUniforms }),
    [],
  );
  const { wave, spray } = useMemo(() => {
    const waveMat = new THREE.ShaderMaterial({
      uniforms,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        uniform float uT;
        ${GLSL}
        varying float vV, vFall, vDepth, vX, vPl;
        void main() {
          float pl = localP(position.x, uT);
          vec3 p = breaker(position.x, position.y, position.z, pl);
          vV = max(0.0, (position.y - 0.25) / 0.75);
          vX = position.x;
          vPl = pl;
          vFall = smoothstep(0.3, 0.8, pl);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying float vV, vFall, vDepth, vX, vPl;
        ${NOISE}
        ${FINISH}
        void main() {
          // not moving yet (the standing wall is still drawn), or already level sea (the fill takes over)
          if (vPl <= 0.0 || vPl >= 0.97) discard;
          float n = fbm(vec2(vX * 0.06, vV * 4.0 - uTime * 0.8));
          float q = floor((vV * 0.9 + n * 0.4) * 5.0) / 5.0;
          vec3 col = mix(vec3(0.03, 0.14, 0.2), vec3(0.08, 0.42, 0.5), smoothstep(0.1, 0.6, q));
          col = mix(col, vec3(0.36, 0.74, 0.76), smoothstep(0.6, 0.95, q));
          float streak = smoothstep(0.75, 1.0, sin(vX * 0.9 + n * 9.0 + vV * 3.0));
          col = mix(col, vec3(0.75, 0.9, 0.92), streak * vV * 0.35);
          // foam at the lip, spreading over the whole face as it breaks and churns
          float foam = smoothstep(0.8 - 0.22 * vFall, 0.96 - 0.12 * vFall, vV + (n - 0.5) * 0.25);
          // churning white as it lands, then calming into the colour of the open sea
          float calm = smoothstep(0.72, 0.95, vPl);
          float churn = smoothstep(0.55, 0.75, vPl) * (1.0 - calm) * step(0.6, n + 0.25 * vV);
          col = mix(col, vec3(0.95, 0.98, 0.98), max(foam * (1.0 - calm), churn * 0.8));
          col = mix(col, vec3(0.12, 0.42, 0.48), calm * 0.85);
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
        ${GLSL}
        varying float vA;
        void main() {
          // born when the stretch at x reaches progress aB.x
          float born = (${SHORE_X.toFixed(2)} - aA.x) / ${SPEED.toFixed(1)} + aB.x * ${LOCAL.toFixed(1)};
          float age = uT - born;
          float base = min(seabed(aA.x), ${SEA.toFixed(1)});
          float k = clamp((${SEA.toFixed(1)} - base) / 25.0, 0.15, 1.0);
          float life = aA.w > 0.5 ? 2.0 : 1.5;
          vec3 o = aA.w > 0.5 ? vec3(aA.x, base + 0.5, aA.z * aA.y * 9.0) : breaker(aA.x, aA.y, aA.z, aB.x);
          vec3 p = o + aB.yzw * age * k + vec3(0.0, -16.0 * age * age, 0.0);
          vA = step(0.0, age) * (1.0 - smoothstep(life * 0.5, life, age));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float size = (aA.w > 0.5 ? 70.0 : 44.0) * (0.6 + 0.8 * fract(aA.x * 7.31)) * k;
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

  /** Part the sea again and go back to the western shore. */
  const crossAgain = () => {
    const S = state.current;
    S.on = false;
    tide.returned = false;
    tide.version++;
    tide.wallsGoneX.value = OPEN;
    tide.filledX.value = OPEN;
    wave.visible = spray.visible = false;
    card?.classList.remove('on');
    Object.assign(cameraFx, { x: 0, y: 0, z: 0, pitch: 0, roll: 0 });
    rebuildNav();
    // blink back to where you started
    if (teleportTo(START.x, START.z)) setTimeout(() => (player.yaw = START.yaw), 140);
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const S = state.current;
    if (!S.on) {
      if (tide.returned || player.x < SHORE_X + 6) return;
      // you are on dry land: the waters return, and the shore is now the edge of the sea
      S.on = true;
      S.t = 0;
      S.lookedAt = player.lastLook;
      // stop and watch
      player.path = [];
      player.target = null;
      tide.returned = true;
      tide.version++;
      wave.visible = spray.visible = true;
      rebuildNav();
    }
    if (S.t >= END) return; // all closed; rest here until you cross again
    const t = (S.t += dt);
    const tt = Math.max(0, t - DELAY);
    uniforms.uT.value = tt;
    tide.wallsGoneX.value = SHORE_X - tt * SPEED;
    tide.filledX.value = SHORE_X - (tt - 0.97 * LOCAL) * SPEED;

    // turn to watch, unless you are already looking about
    if (t < DELAY + 1.2 && player.lastLook === S.lookedAt) {
      const k = Math.min(1, dt * 2.2);
      player.yaw += angleTo(player.yaw, Math.PI / 2) * k;
      player.pitch += (-0.12 - player.pitch) * k;
    }
    // the ground trembles as the nearest walls come down
    const near = SHORE_X - (tt - 0.75 * LOCAL) * SPEED;
    const shake = tt > 0 ? 0.22 * Math.exp(-Math.abs(player.x - near) / 160) * (1 - smooth(t, END - 2, END)) : 0;
    cameraFx.x = Math.sin(t * 37) * shake;
    cameraFx.y = Math.sin(t * 41 + 1) * shake * 0.8;
    cameraFx.z = Math.sin(t * 29 + 2) * shake;

    const c = getCard(crossAgain);
    if (t > CAPTION) c.classList.add('on');
    if (t > END) {
      // all closed: the open sea is level again from shore to shore
      wave.visible = spray.visible = false;
      tide.wallsGoneX.value = -OPEN;
      tide.filledX.value = -OPEN;
      Object.assign(cameraFx, { x: 0, y: 0, z: 0 });
    }
  });

  return (
    <>
      <primitive object={wave} />
      <primitive object={spray} />
    </>
  );
}
