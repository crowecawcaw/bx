import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COURT } from './dims';
import { toon, windTime } from './materials';
import { PUFF_FRAG } from './puffs';
import { SUN_DIR, castOnGround, groundH, groundShadowMaterial, noise2, rockBump, rockGeometry, rockTexture, sandNormalTexture, terrainGeometry } from './terrain';
import { goatHairTexture, make, rng, sandTexture } from './textures';

type Shader = Parameters<THREE.Material['onBeforeCompile']>[0];

const GLSL_NOISE = /* glsl */ `
float thash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(thash(i), thash(i + vec2(1.0, 0.0)), f.x), mix(thash(i + vec2(0.0, 1.0)), thash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float tfbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * tnoise(p); p = p * 2.03 + vec2(17.1, 9.7); a *= 0.5; } return s / 0.9375; }
vec3 tlin(vec3 c) { return pow(c, vec3(2.2)); }
`;

/**
 * The land: one sheet from the court out to the mountains, shaded by what the ground is doing.
 * Level and gently sloping ground is rippled sand; steep ground is banded granite, with sand
 * lying in its hollows.
 */
export function Terrain() {
  const geo = useMemo(() => terrainGeometry(), []);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.94, metalness: 0 });
    const sand = sandTexture();
    const sandN = sandNormalTexture();
    m.onBeforeCompile = (sh: Shader) => {
      sh.uniforms.tSand = { value: sand };
      sh.uniforms.tSandN = { value: sandN };
      sh.vertexShader =
        'varying vec3 vTW;\nvarying vec3 vTN;\n' +
        sh.vertexShader.replace(
          '#include <fog_vertex>',
          `#include <fog_vertex>
          vTW = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vTN = normalize(mat3(modelMatrix) * objectNormal);`,
        );
      sh.fragmentShader =
        `varying vec3 vTW;\nvarying vec3 vTN;\nuniform sampler2D tSand;\nuniform sampler2D tSandN;\n${GLSL_NOISE}\n` +
        sh.fragmentShader
          .replace(
            '#include <map_fragment>',
            /* glsl */ `
            vec3 gN = normalize(vTN);
            float tDist = length(vViewPosition);
            float broad = tfbm(vTW.xz * 0.011);
            float slope = 1.0 - gN.y;
            float rockAmt = smoothstep(0.1, 0.24, slope + vTW.y * 0.0012 + (broad - 0.5) * 0.1);
            // sand: two scales of the same texture so neither one's repeat shows
            vec3 s1 = texture2D(tSand, vTW.xz / 41.0).rgb;
            vec3 s2 = texture2D(tSand, vTW.zx / 9.3 + 0.37).rgb;
            vec3 sandCol = mix(s1, s2, 0.45 * (1.0 - smoothstep(30.0, 160.0, tDist))) * vec3(1.0, 0.86, 0.68);
            sandCol *= mix(0.8, 1.12, tfbm(vTW.xz * 0.023 + 4.0));
            sandCol = mix(sandCol, sandCol * vec3(1.12, 0.93, 0.78), smoothstep(0.45, 0.75, broad));
            // granite: beds tilted and folded, stained dark where water runs down. Fine detail gives
            // way to broad detail with distance, before it can shimmer.
            float farK = smoothstep(140.0, 480.0, tDist);
            float fold = tfbm(vTW.xz * 0.006 + 2.0);
            float bed = vTW.y * 0.07 + fold * 7.0 + (vTW.x + vTW.z) * 0.012;
            float band = tnoise(vec2(bed, 0.5)) * 0.65 + mix(tnoise(vec2(bed * 3.7, 3.5)), 0.5, farK) * 0.35;
            vec3 rockCol = mix(tlin(vec3(0.74, 0.5, 0.36)), tlin(vec3(0.47, 0.29, 0.23)), smoothstep(0.3, 0.7, band));
            rockCol = mix(rockCol, tlin(vec3(0.82, 0.62, 0.45)), smoothstep(0.72, 0.9, band) * 0.7);
            vec2 face = vec2(vTW.x + vTW.z, vTW.y * 1.6);
            float cragFar = tfbm(face * 0.018 + 3.0);
            float crag = farK < 1.0 ? mix(tfbm(face * 0.045 + 7.0), cragFar, farK) : cragFar;
            float streak = mix(tfbm(vec2((vTW.x - vTW.z) * 0.09, vTW.y * 0.012)), 0.5, farK);
            rockCol *= mix(0.5, 1.18, smoothstep(0.25, 0.75, crag)) * mix(0.8, 1.05, streak);
            // sand lies wherever the rock is not steep
            float pocket = smoothstep(0.2, 0.42, slope + (crag - 0.5) * 0.25);
            rockCol = mix(sandCol * 0.95, rockCol, pocket);
            diffuseColor.rgb = mix(sandCol, rockCol, rockAmt);
            float rockH = crag + 0.3 * band;
            `,
          )
          .replace(
            '#include <normal_fragment_maps>',
            /* glsl */ `
            {
              // ripples, fading with distance before they alias
              float near = 1.0 - smoothstep(50.0, 240.0, tDist);
              vec3 n1 = texture2D(tSandN, vTW.xz / 6.5).xyz * 2.0 - 1.0;
              vec3 n2 = texture2D(tSandN, vTW.zx / 19.0 + 0.2).xyz * 2.0 - 1.0;
              vec2 rip = (n1.xy * 0.55 * near + n2.xy * 0.5 * (0.12 + 0.88 * near)) * (1.0 - rockAmt);
              vec3 wn = normalize(gN + vec3(rip.x, 0.0, rip.y));
              normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
              // rock relief from the same fields that colour it
              vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
              float hx = dFdx(rockH), hy = dFdy(rockH);
              vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
              float det = dot(dpx, r1);
              vec3 grad = sign(det) * (hx * r1 + hy * r2);
              float k = rockAmt * mix(8.0, 30.0, farK);
              normal = normalize(abs(det) * normal - k * grad);
            }
            `,
          )
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.95, 0.82, rockAmt);');
    };
    m.customProgramCacheKey = () => 'terrain';
    return m;
  }, []);
  return <mesh geometry={geo} material={mat} receiveShadow frustumCulled={false} userData={{ ground: true }} />;
}

/** True where nothing should be strewn: the court, the road to the gate. */
function clear(x: number, z: number, pad = 4) {
  const inCourt = x > COURT.minX - pad && x < COURT.maxX + pad && z > COURT.minZ - pad && z < COURT.maxZ + pad;
  const onRoad = x > COURT.maxX && Math.abs(z) < 12 + pad;
  return !inCourt && !onRoad;
}

function setAll(mesh: THREE.InstancedMesh | null, mats: THREE.Matrix4[], colors?: THREE.Color[]) {
  if (!mesh) return;
  mats.forEach((m, i) => mesh.setMatrixAt(i, m));
  colors?.forEach((c, i) => mesh.setColorAt(i, c));
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/** A black tent of goats' hair, low and long, open toward the sanctuary. Origin at ground centre; +z is the open front. */
function tentCloth() {
  const W = 8.4;
  const D = 5.2;
  const nx = 14;
  const nz = 9;
  const pos: number[] = [];
  const uv: number[] = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const u = THREE.MathUtils.clamp(((i - 1) / (nx - 2)) * 2 - 1, -1, 1);
      const v = THREE.MathUtils.clamp(((j - 1) / (nz - 2)) * 2 - 1, -1, 1);
      const edge = v > 0 ? 1.75 : 1.25;
      let y = THREE.MathUtils.lerp(edge, 2.75, 1 - Math.pow(Math.abs(v), 1.3));
      // the cloth is lifted on three rows of poles and sags between them
      y += 0.34 * ((Math.cos(u * Math.PI * 3) - 1) / 2) * (1 - 0.5 * Math.abs(v));
      y += 0.12 * ((Math.cos(v * Math.PI * 2) - 1) / 2);
      y *= 1 - 0.5 * THREE.MathUtils.smoothstep(Math.abs(u), 0.72, 1);
      let x = (u * W) / 2;
      let z = (v * D) / 2;
      // the outer ring is the walls: staked to the ground at the back and ends, a short valance in front
      if (i === 0 || i === nx) {
        x += Math.sign(u) * 0.75;
        y = -0.5;
      }
      if (j === 0) {
        z -= 0.7;
        y = -0.5;
      } else if (j === nz && i > 0 && i < nx) {
        y -= 0.42;
        z += 0.05;
      }
      pos.push(x, y, z);
      uv.push((i / nx) * 7, (j / nz) * 5);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const p = j * (nx + 1) + i;
      const q = p + nx + 1;
      idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function tentPoles() {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-2.8, 0, 2.8]) {
    parts.push(new THREE.CylinderGeometry(0.07, 0.09, 2.75, 6).translate(x, 1.37, 0));
    parts.push(new THREE.CylinderGeometry(0.06, 0.08, 1.75, 6).translate(x, 0.87, 2.6));
  }
  // guy ropes from the front poles to pegs
  for (const x of [-2.8, 0, 2.8]) {
    const rope = new THREE.CylinderGeometry(0.02, 0.02, 3.3, 4).rotateX(-1.02).translate(x, 0.86, 4.0);
    parts.push(rope);
  }
  for (const s of [-1, 1]) {
    const rope = new THREE.CylinderGeometry(0.02, 0.02, 2.6, 4).rotateZ(s * 1.05).translate(s * 5.9, 0.25, 0);
    parts.push(rope);
  }
  return mergeGeometries(parts)!;
}

function rugTexture() {
  return make('campRug', 128, 128, (ctx, w, h) => {
    const cols = ['#7a2a22', '#3a2a22', '#b98a4a', '#5a2f3a', '#d9c7a0', '#27384f'];
    const r = rng(77);
    let y = 0;
    while (y < h) {
      const t = 3 + Math.floor(r() * 12);
      ctx.fillStyle = cols[Math.floor(r() * cols.length)];
      ctx.fillRect(0, y, w, t);
      y += t;
    }
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,210'},${r() * 0.12})`;
      ctx.fillRect(r() * w, r() * h, 2, 1);
    }
  });
}

/** Where the tents stand: [x, z, yaw, scale]. Shared with the trees and smoke so they keep clear. */
function campSpots() {
  const out: [number, number, number, number][] = [];
  const r = rng(11);
  let tries = 0;
  while (out.length < 400 && tries++ < 20000) {
    const a = r() * Math.PI * 2;
    const d = 108 + Math.pow(r(), 0.8) * 165;
    const x = Math.cos(a) * d * 1.18;
    const z = Math.sin(a) * d;
    if (x > 40 && Math.abs(z) < 26) continue; // the road
    if (Math.hypot(x, z) > 318) continue;
    if (out.some((o) => Math.hypot(o[0] - x, o[1] - z) < 15)) continue;
    // each tent opens toward the tabernacle (Num 2:2)
    out.push([x, z, Math.atan2(-x, -z) + (r() - 0.5) * 0.5, 0.85 + r() * 0.5]);
  }
  return out;
}
const SPOTS = campSpots();

/** The tents of Israel, encamped by their standards round about the tabernacle (Num 2). */
export function Tents() {
  const cloth = useRef<THREE.InstancedMesh>(null);
  const poles = useRef<THREE.InstancedMesh>(null);
  const rugs = useRef<THREE.InstancedMesh>(null);
  const { clothGeo, poleGeo, rugGeo, mats, colors, shadow } = useMemo(() => {
    const clothGeo = tentCloth();
    const poleGeo = tentPoles();
    const rugGeo = new THREE.PlaneGeometry(6.6, 3.6).rotateX(-Math.PI / 2).translate(0, 0.06, 0.2);
    const r = rng(12);
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const mats: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    for (const [x, z, yaw, s] of SPOTS) {
      q.setFromAxisAngle(up, yaw);
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, groundH(x, z), z), q, new THREE.Vector3(s, 0.9 + r() * 0.25, s)));
      // goats' hair runs from near black to weathered brown; a few are bleached
      const k = r();
      colors.push(new THREE.Color().setHSL(0.06 + r() * 0.04, 0.2 + r() * 0.25, k < 0.12 ? 0.85 : 0.42 + r() * 0.5));
    }
    const shadow = castOnGround(clothGeo, mats);
    return { clothGeo, poleGeo, rugGeo, mats, colors, shadow };
  }, []);
  useLayoutEffect(() => {
    setAll(cloth.current, mats, colors);
    setAll(poles.current, mats);
    setAll(rugs.current, mats);
  }, [mats, colors]);
  const clothMat = useMemo(() => {
    const t = goatHairTexture();
    return toon('campTent', { color: '#ffffff', map: t, side: THREE.DoubleSide, bumpMap: t, bumpScale: 0.25 });
  }, []);
  const shadowMat = useMemo(() => groundShadowMaterial(), []);
  return (
    <group>
      <instancedMesh ref={cloth} args={[clothGeo, clothMat, mats.length]} />
      <instancedMesh ref={poles} args={[poleGeo, toon('campPole-wood', { color: '#6b4a30' }), mats.length]} />
      <instancedMesh ref={rugs} args={[rugGeo, toon('cloth:campRug', { map: rugTexture() }), mats.length]} />
      <mesh geometry={shadow} material={shadowMat} frustumCulled={false} renderOrder={1} />
    </group>
  );
}

/** Boulders, stones and gravel. */
export function Rocks() {
  const refs = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)];
  const gravel = useRef<THREE.InstancedMesh>(null);
  const { geos, sets, pebbleGeo, pebbles, pebbleCols, shadow } = useMemo(() => {
    const geos = [rockGeometry(1), rockGeometry(2.3), rockGeometry(4.1, 2, 0.45)];
    const sets: { m: THREE.Matrix4[]; c: THREE.Color[] }[] = geos.map(() => ({ m: [], c: [] }));
    const r = rng(21);
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const tint = () => new THREE.Color().setHSL(0.05 + r() * 0.05, 0.12 + r() * 0.2, 0.62 + r() * 0.3);
    const shadowed: { g: number; m: THREE.Matrix4 }[] = [];
    const place = (x: number, z: number, k: number, big: boolean) => {
      const gi = Math.floor(r() * geos.length);
      q.setFromEuler(e.set((r() - 0.5) * 0.5, r() * 6.3, (r() - 0.5) * 0.5));
      const sx = k * (0.9 + r() * 0.7);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, groundH(x, z) + k * 0.12, z), q, new THREE.Vector3(sx, k * (0.7 + r() * 0.5), k));
      sets[gi].m.push(m);
      sets[gi].c.push(tint());
      if (big || k > 0.45) shadowed.push({ g: gi, m });
    };
    // stones strewn everywhere, thinning with distance
    let n = 0;
    while (n < 620) {
      const a = r() * Math.PI * 2;
      const d = 30 + Math.pow(r(), 1.4) * 300;
      const x = Math.cos(a) * d * 1.15;
      const z = Math.sin(a) * d;
      if (!clear(x, z)) continue;
      place(x, z, 0.22 + Math.pow(r(), 3) * 0.95, false);
      n++;
    }
    // boulders, alone and in falls, beyond where anyone walks
    n = 0;
    while (n < 26) {
      const a = r() * Math.PI * 2;
      const d = 95 + r() * 260;
      const x = Math.cos(a) * d * 1.15;
      const z = Math.sin(a) * d;
      if (!clear(x, z, 30) || (Math.abs(x) < 92 && Math.abs(z) < 62)) continue;
      if (SPOTS.some((s) => Math.hypot(s[0] - x, s[1] - z) < 13)) continue;
      const k = 1.6 + Math.pow(r(), 2) * 3.6;
      place(x, z, k, true);
      const fall = 2 + Math.floor(r() * 5);
      for (let i = 0; i < fall; i++) {
        const b = r() * 6.3;
        const dd = k * (0.9 + r() * 1.6);
        place(x + Math.cos(b) * dd, z + Math.sin(b) * dd, k * (0.18 + r() * 0.3), true);
      }
      n++;
    }
    // gravel in drifts
    const pebbleGeo = rockGeometry(3.3, 0, 0.25);
    const pebbles: THREE.Matrix4[] = [];
    const pebbleCols: THREE.Color[] = [];
    while (pebbles.length < 2600) {
      const a = r() * Math.PI * 2;
      const d = 28 + Math.pow(r(), 1.6) * 190;
      const x = Math.cos(a) * d * 1.15;
      const z = Math.sin(a) * d;
      if (!clear(x, z, 1.5)) continue;
      if (noise2(x / 14 + 3, z / 14 + 8) < 0.42 + r() * 0.25) continue;
      const k = 0.05 + Math.pow(r(), 2) * 0.16;
      q.setFromEuler(e.set(r() * 3, r() * 6.3, r() * 3));
      pebbles.push(new THREE.Matrix4().compose(new THREE.Vector3(x, groundH(x, z) + k * 0.3, z), q, new THREE.Vector3(k * (1 + r()), k * 0.7, k)));
      pebbleCols.push(tint());
    }
    const shadow = mergeGeometries(geos.map((g, gi) => castOnGround(g, shadowed.filter((s) => s.g === gi).map((s) => s.m))))!;
    return { geos, sets, pebbleGeo, pebbles, pebbleCols, shadow };
  }, []);
  useLayoutEffect(() => {
    refs.forEach((ref, i) => setAll(ref.current, sets[i].m, sets[i].c));
    setAll(gravel.current, pebbles, pebbleCols);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(() => toon('stone', { color: '#ffffff', map: rockTexture(), bumpMap: rockBump(), bumpScale: 2.2 }), []);
  const shadowMat = useMemo(() => groundShadowMaterial(), []);
  return (
    <group>
      {geos.map((g, i) => (
        <instancedMesh key={i} ref={refs[i]} args={[g, mat, sets[i].m.length]} receiveShadow />
      ))}
      <instancedMesh ref={gravel} args={[pebbleGeo, mat, pebbles.length]} receiveShadow />
      <mesh geometry={shadow} material={shadowMat} frustumCulled={false} renderOrder={1} />
    </group>
  );
}

/** A card of dry blades (or broom twigs), drawn once and planted thousands of times. */
function bladeTexture(key: string, twiggy: boolean) {
  return make(key, 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const r = rng(twiggy ? 52 : 51);
    const n = twiggy ? 46 : 60;
    for (let i = 0; i < n; i++) {
      const x0 = w / 2 + (r() - 0.5) * w * (twiggy ? 0.3 : 0.45);
      const lean = (r() - 0.5) * (twiggy ? 1.5 : 1.0);
      const len = h * (0.45 + r() * 0.52);
      const shade = 150 + r() * 105;
      ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
      ctx.lineWidth = twiggy ? 3 + r() * 3 : 3.2 + r() * 3.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, h);
      const cx = x0 + lean * len * 0.25;
      const x1 = x0 + lean * len * (0.5 + r() * 0.3);
      ctx.quadraticCurveTo(cx, h - len * 0.6, x1, h - len);
      ctx.stroke();
      if (twiggy)
        for (let k = 0; k < 3; k++) {
          const t = 0.35 + r() * 0.6;
          const bx = x0 + (x1 - x0) * t;
          const by = h - len * t;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + (r() - 0.5) * 44, by - 12 - r() * 32);
          ctx.stroke();
        }
    }
  });
}

/** Two crossed upright cards, base at the origin, with normals pointing up so they take the sky's light evenly. */
function tuftGeometry(cards: number) {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < cards; i++) {
    const g = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateY((i / cards) * Math.PI + 0.3);
    parts.push(g);
  }
  const g = mergeGeometries(parts)!;
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

function tuftMaterial(key: string, map: THREE.Texture) {
  const m = new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 });
  m.onBeforeCompile = (sh: Shader) => {
    sh.uniforms.windTime = windTime;
    sh.vertexShader =
      'uniform float windTime;\n' +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec4 root = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float gust = 0.6 + 0.4 * sin(windTime * 0.37 + (root.x + root.z) * 0.02);
          float sway = sin(windTime * 1.9 + root.x * 0.7 + root.z * 0.5) + 0.5 * sin(windTime * 3.3 + root.x * 1.3);
          transformed.x += position.y * position.y * 0.16 * gust * sway;
          transformed.z += position.y * position.y * 0.08 * gust * sway;
        }`,
      );
    // darker at the root, where blades shade one another
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= mix(0.45, 1.0, smoothstep(0.0, 0.7, vMapUv.y));');
  };
  m.customProgramCacheKey = () => `tuft-${key}`;
  return m;
}

/** Dry grass in the hollows and white broom (retem) bushes, moving in the wind. */
export function Plants() {
  const grass = useRef<THREE.InstancedMesh>(null);
  const broom = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const r = rng(31);
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const gm: THREE.Matrix4[] = [];
    const gc: THREE.Color[] = [];
    while (gm.length < 3200) {
      const a = r() * Math.PI * 2;
      const d = 27 + Math.pow(r(), 1.5) * 250;
      const x = Math.cos(a) * d * 1.15;
      const z = Math.sin(a) * d;
      if (!clear(x, z, 2)) continue;
      // grass keeps to patches
      if (noise2(x / 26 + 1.2, z / 26 + 5.5) < 0.38 + r() * 0.3) continue;
      const k = 0.5 + r() * 0.9;
      q.setFromAxisAngle(up, r() * 6.3);
      gm.push(new THREE.Matrix4().compose(new THREE.Vector3(x, groundH(x, z) - 0.03, z), q, new THREE.Vector3(k * 1.5, k, k * 1.5)));
      gc.push(new THREE.Color().setHSL(0.12 + r() * 0.035, 0.5 + r() * 0.2, 0.4 + r() * 0.16));
    }
    const bm: THREE.Matrix4[] = [];
    const bc: THREE.Color[] = [];
    while (bm.length < 260) {
      const a = r() * Math.PI * 2;
      const d = 40 + r() * 270;
      const x = Math.cos(a) * d * 1.15;
      const z = Math.sin(a) * d;
      if (!clear(x, z, 3)) continue;
      const k = 1.3 + r() * 1.9;
      q.setFromAxisAngle(up, r() * 6.3);
      bm.push(new THREE.Matrix4().compose(new THREE.Vector3(x, groundH(x, z) - 0.05, z), q, new THREE.Vector3(k * 1.5, k, k * 1.5)));
      bc.push(new THREE.Color().setHSL(0.2 + r() * 0.07, 0.3 + r() * 0.15, 0.4 + r() * 0.12));
    }
    return { gm, gc, bm, bc };
  }, []);
  useLayoutEffect(() => {
    setAll(grass.current, data.gm, data.gc);
    setAll(broom.current, data.bm, data.bc);
  }, [data]);
  const grassGeo = useMemo(() => tuftGeometry(2), []);
  const broomGeo = useMemo(() => tuftGeometry(4), []);
  const grassMat = useMemo(() => tuftMaterial('grass', bladeTexture('blades', false)), []);
  const broomMat = useMemo(() => tuftMaterial('broom', bladeTexture('twigs', true)), []);
  return (
    <group>
      <instancedMesh ref={grass} args={[grassGeo, grassMat, data.gm.length]} receiveShadow />
      <instancedMesh ref={broom} args={[broomGeo, broomMat, data.bm.length]} receiveShadow />
    </group>
  );
}

/** One acacia (shittim): a leaning forked trunk under a flat, layered crown. Returns [wood, crown]. */
function acacia(seed: number) {
  const r = rng(seed);
  const wood: THREE.BufferGeometry[] = [];
  const crown: THREE.BufferGeometry[] = [];
  const limb = (from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number) => {
    const d = to.clone().sub(from);
    const g = new THREE.CylinderGeometry(r1, r0, d.length(), 7, 1).translate(0, d.length() / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
    g.translate(from.x, from.y, from.z);
    wood.push(g);
  };
  const fork = new THREE.Vector3((r() - 0.5) * 1.6, 3.2 + r() * 1.4, (r() - 0.5) * 1.6);
  limb(new THREE.Vector3(0, -0.4, 0), fork, 0.5, 0.36);
  const blob = rockGeometry(seed * 1.7, 2, 0.3);
  const arms = 4 + Math.floor(r() * 3);
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + r();
    const reach = 3 + r() * 3.2;
    const mid = fork.clone().add(new THREE.Vector3(Math.cos(a) * reach * 0.55, 2 + r() * 1.2, Math.sin(a) * reach * 0.55));
    const tip = fork.clone().add(new THREE.Vector3(Math.cos(a) * reach, 4.2 + r() * 1.6, Math.sin(a) * reach));
    limb(fork, mid, 0.3, 0.2);
    limb(mid, tip, 0.2, 0.09);
    // flat pads of foliage along and beyond the limb
    for (let k = 0; k < 3; k++) {
      const s = 2 + r() * 1.7;
      const at = tip.clone().add(new THREE.Vector3((r() - 0.5) * 3.4, 0.3 + r() * 0.8, (r() - 0.5) * 3.4));
      crown.push(blob.clone().rotateY(r() * 6.3).scale(s * 1.25, s * 0.36, s * 1.25).translate(at.x, at.y, at.z));
    }
  }
  crown.push(blob.clone().scale(3.4, 0.9, 3.4).translate(fork.x, fork.y + 5.6, fork.z));
  const strip = (g: THREE.BufferGeometry) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute('uv');
    return n;
  };
  const w = mergeVertices(mergeGeometries(wood.map(strip))!);
  w.computeVertexNormals();
  const c = mergeGeometries(crown.map(strip))!;
  c.computeVertexNormals();
  return [w, c] as const;
}

function leafTexture() {
  return make('acaciaLeaf', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#5c6b38';
    ctx.fillRect(0, 0, w, h);
    const r = rng(58);
    for (let i = 0; i < 2600; i++) {
      const g = r();
      ctx.fillStyle = g < 0.4 ? `rgba(34,46,22,${0.3 + r() * 0.5})` : g < 0.8 ? `rgba(128,146,74,${0.3 + r() * 0.5})` : `rgba(176,170,96,${0.2 + r() * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 1 + r() * 2.4, 0.6 + r(), r() * 3.1, 0, 6.3);
      ctx.fill();
    }
  }, [3, 3]);
}

/** Acacias scattered through the camp: the shittim wood of the boards and the ark grew here (Ex 25:5). */
export function Acacias() {
  const built = useMemo(() => {
    const r = rng(44);
    const kinds = [acacia(5), acacia(9), acacia(14)];
    const wood: THREE.BufferGeometry[] = [];
    const crown: THREE.BufferGeometry[] = [];
    const shadows: THREE.BufferGeometry[] = [];
    let n = 0;
    let tries = 0;
    while (n < 22 && tries++ < 4000) {
      const a = r() * Math.PI * 2;
      const d = 92 + r() * 215;
      const x = Math.cos(a) * d * 1.15;
      const z = Math.sin(a) * d;
      if (!clear(x, z, 26) || (Math.abs(x) < 90 && Math.abs(z) < 60)) continue;
      if (SPOTS.some((s) => Math.hypot(s[0] - x, s[1] - z) < 10)) continue;
      const [w, c] = kinds[n % kinds.length];
      const s = 1 + r() * 0.75;
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x, groundH(x, z), z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.3),
        new THREE.Vector3(s, s, s),
      );
      wood.push(w.clone().applyMatrix4(m));
      crown.push(c.clone().applyMatrix4(m));
      shadows.push(castOnGround(c, [m]), castOnGround(w, [m]));
      n++;
    }
    const crownGeo = mergeGeometries(crown)!;
    // foliage texture laid on from above
    const p = crownGeo.attributes.position;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      uv[i * 2] = p.getX(i) * 0.11 + p.getY(i) * 0.05;
      uv[i * 2 + 1] = p.getZ(i) * 0.11 + p.getY(i) * 0.05;
    }
    crownGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return { wood: mergeGeometries(wood)!, crown: crownGeo, shadow: mergeGeometries(shadows)! };
  }, []);
  const shadowMat = useMemo(() => groundShadowMaterial(), []);
  const leaf = useMemo(() => {
    const t = leafTexture();
    return toon('acaciaFoliage', { color: '#ffffff', map: t, bumpMap: t, bumpScale: 3 });
  }, []);
  return (
    <group>
      <mesh geometry={built.wood} material={toon('acaciaTrunk-wood', { color: '#5d4636' })} frustumCulled={false} />
      <mesh geometry={built.crown} material={leaf} frustumCulled={false} />
      <mesh geometry={built.shadow} material={shadowMat} frustumCulled={false} renderOrder={1} />
    </group>
  );
}

/** Thin smoke from cooking fires among the tents, leaning with the wind. */
export function CampSmoke() {
  const { geo, mat } = useMemo(() => {
    const r = rng(63);
    const fires = Array.from({ length: 16 }, () => SPOTS[Math.floor(r() * SPOTS.length)]);
    const per = 16;
    const N = fires.length * per;
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    const origin = new Float32Array(N * 3);
    const seed = new Float32Array(N * 4);
    fires.forEach(([x, z, yaw], f) => {
      // the fire burns before the tent's door
      const fx = x + Math.sin(yaw) * 7;
      const fz = z + Math.cos(yaw) * 7;
      for (let i = 0; i < per; i++) {
        const k = f * per + i;
        origin.set([fx, groundH(fx, fz) + 0.3, fz], k * 3);
        seed.set([i / per + r() * 0.02, r(), r(), r()], k * 4);
      }
    });
    g.setAttribute('origin', new THREE.InstancedBufferAttribute(origin, 3));
    g.setAttribute('seed', new THREE.InstancedBufferAttribute(seed, 4));
    g.instanceCount = N;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsLib.fog,
        time: windTime,
        sunDir: { value: SUN_DIR },
        lit: { value: new THREE.Color(1.5, 1.42, 1.3) },
        shade: { value: new THREE.Color(0.42, 0.44, 0.52) },
        opacity: { value: 0.34 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 origin;
        attribute vec4 seed;
        uniform float time;
        varying vec2 vUv;
        varying float vFade;
        varying float vSeed;
        #include <fog_pars_vertex>
        void main() {
          float t = fract(time * (0.03 + seed.y * 0.01) + seed.x);
          vec3 c = origin + vec3(0.0, t * 34.0, 0.0);
          // the wind takes it once it is above the tents
          c.x -= t * t * 22.0 + sin(time * 0.5 + seed.z * 6.0 + t * 5.0) * (0.4 + t * 2.0);
          c.z += t * t * 9.0 + cos(time * 0.4 + seed.w * 6.0 + t * 4.0) * (0.4 + t * 1.6);
          float size = 0.8 + t * 7.5 + seed.w * 1.2;
          vFade = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.35, 1.0, t));
          vSeed = seed.z;
          vec4 mvPosition = modelViewMatrix * vec4(c, 1.0);
          mvPosition.xy += position.xy * size;
          vUv = uv;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: '#include <fog_pars_fragment>\n' + PUFF_FRAG,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    return { geo: g, mat };
  }, []);
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={3} />;
}

/**
 * Dust in the air: motes that drift past on the wind and catch the sun. They live in a box that
 * travels with the camera, so there are always some near you and none are wasted far away.
 */
export function Dust() {
  const { geo, mat } = useMemo(() => {
    const N = 700;
    const r = rng(71);
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) p[i] = r();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: windTime, sunDir: { value: SUN_DIR }, scale: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float time;
        uniform float scale;
        uniform vec3 sunDir;
        varying float vA;
        const vec3 BOX = vec3(70.0, 22.0, 70.0);
        void main() {
          vec3 drift = vec3(-1.6, 0.05, 0.7) * time * (0.5 + position.y);
          vec3 w = position * BOX + drift;
          w.y += sin(time * 0.7 + position.x * 40.0) * 0.4;
          // wrap around the camera
          w = mod(w - cameraPosition + BOX * 0.5, BOX) - BOX * 0.5 + cameraPosition;
          w.y = mod(w.y, BOX.y) + 0.2;
          vec4 mv = viewMatrix * vec4(w, 1.0);
          float d = -mv.z;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = scale * (0.035 + 0.05 * position.z) / max(d, 0.5);
          // brightest looking toward the sun; fade in close to the eye and out at the box's edge
          vec3 dir = normalize(w - cameraPosition);
          float toSun = pow(max(dot(dir, sunDir), 0.0), 3.0);
          vA = (0.1 + 0.55 * toSun) * smoothstep(1.5, 6.0, d) * (1.0 - smoothstep(22.0, 34.0, d));
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float a = (1.0 - smoothstep(0.0, 1.0, dot(p, p))) * vA;
          gl_FragColor = vec4(vec3(1.6, 1.4, 1.1) * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    return { geo: g, mat };
  }, []);
  useFrame(({ size, gl }) => {
    mat.uniforms.scale.value = size.height * gl.getPixelRatio();
  });
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={4} />;
}
