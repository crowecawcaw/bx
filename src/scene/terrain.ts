import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm, make, noise, rng } from './textures';

/** Direction toward the morning sun over the camp (matches the directional light). */
export const SUN: [number, number, number] = [75, 50, 42];
export const SUN_DIR = new THREE.Vector3(...SUN).normalize();

const smooth = THREE.MathUtils.smoothstep;

// Smooth value noise for the lie of the land.
function hash2(x: number, y: number) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
export function noise2(x: number, y: number) {
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
export function ridged(x: number, y: number, oct = 5) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    const n = 1 - Math.abs(noise2(x * f, y * f) * 2 - 1);
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

const SINAI: [number, number] = [260, 300];

/**
 * Height of the wilderness floor (cubits). The court, the ground you can walk on and the road to
 * the gate are level; around them the sand lifts into low swells among the tents, then dunes,
 * then the granite ranges, with the mount standing over the camp to the south-east.
 */
export function groundH(x: number, z: number) {
  const r = Math.hypot(x / 1.15, z);
  let m = smooth(r, 96, 230);
  if (x > 0) m *= smooth(Math.abs(z), 16, 70);
  const far = smooth(r, 250, 340);
  const swell = noise2(x / 85 + 3.7, z / 120 + 1.3);
  const lump = noise2(x / 31 + 9.1, z / 27 + 4.4);
  // dunes: long crests across the wind, steeper on the lee side
  const crest = noise2(x / 150 + 0.4 * lump, z / 60 + 7.7);
  const dune = Math.pow(1 - Math.abs(crest * 2 - 1), 1.7);
  let h = m * ((2.2 + 3 * far) * Math.pow(swell, 1.4) + (0.6 + 1.4 * far) * lump + 9 * far * dune);

  const rr = Math.hypot(x, z);
  const env = smooth(rr, 330, 490);
  if (env > 0) {
    // warp the ridges so they wander like eroded spurs rather than running straight
    const wx = x + 40 * (noise2(x / 120 + 5.1, z / 120 - 3.3) - 0.5);
    const wz = z + 40 * (noise2(x / 120 - 8.7, z / 120 + 2.9) - 0.5);
    const n = ridged(wx / 210 + 7.3, wz / 210 - 2.1);
    h += env * (25 + 210 * Math.pow(n, 1.6));
    h += env * 16 * (ridged(wx / 38 + 2.2, wz / 38 + 6.1, 3) - 0.4) * (0.3 + n);
    const ds = Math.hypot(x - SINAI[0], z - SINAI[1]);
    const crag = ridged(x / 45 + 1.7, z / 45 + 4.1);
    h += 250 * Math.exp(-ds / 55) * (0.45 + 0.55 * crag) * env;
  }
  return h;
}

/**
 * The land as one sheet, laid out in rings about the court: coarse where it is level, fine across
 * the dunes, and widening again out to the mountains.
 */
export function terrainGeometry() {
  const radii: number[] = [0];
  for (let r = 16; r < 96; r += 16) radii.push(r);
  for (let r = 96; r < 330; r += 4.5) radii.push(r);
  const N = 84;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    radii.push(330 + 720 * (0.55 * t + 0.45 * t * t));
  }
  const A = 448;
  const pos = new Float32Array(radii.length * (A + 1) * 3);
  let o = 0;
  for (const r of radii) {
    for (let i = 0; i <= A; i++) {
      const a = (i / A) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      pos[o++] = x;
      pos[o++] = groundH(x, z);
      pos[o++] = z;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < radii.length - 1; j++) {
    for (let i = 0; i < A; i++) {
      const p = j * (A + 1) + i;
      const q = p + A + 1;
      idx.push(p, p + 1, q, p + 1, q + 1, q);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // the seam where the ring closes: both copies of each vertex take the same normal
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let j = 0; j < radii.length; j++) {
    const a = j * (A + 1);
    const b = a + A;
    const v = new THREE.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
    n.setXYZ(a, v.x, v.y, v.z);
    n.setXYZ(b, v.x, v.y, v.z);
  }
  return g;
}

/** Wind ripples in sand as a tangent-space normal map (tiles). */
export function sandNormalTexture() {
  const key = 'sandNormal';
  return make(
    key,
    512,
    512,
    (ctx, w, h) => {
      const warp = fbm(w, h, 4, 4, 3, 91);
      const warp2 = fbm(w, h, 9, 9, 2, 92);
      const fine = fbm(w, h, 128, 128, 2, 93);
      const hgt = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          // crests run across x; the warp makes them fork and wander
          const ph = (y / h) * Math.PI * 2 * 22 + warp[i] * 9 + warp2[i] * 3 + Math.sin((x / w) * Math.PI * 2 * 3) * 0.8;
          const s = Math.sin(ph);
          // sharper crests than troughs
          hgt[i] = (s > 0 ? Math.pow(s, 0.7) : -Math.pow(-s, 1.4) * 0.6) + fine[i] * 0.35;
        }
      }
      const img = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const l = hgt[y * w + ((x + w - 1) % w)];
          const r = hgt[y * w + ((x + 1) % w)];
          const u = hgt[((y + h - 1) % h) * w + x];
          const d = hgt[((y + 1) % h) * w + x];
          const v = new THREE.Vector3((l - r) * 1.6, (u - d) * 1.6, 1).normalize();
          const o = (y * w + x) * 4;
          img.data[o] = (v.x * 0.5 + 0.5) * 255;
          img.data[o + 1] = (v.y * 0.5 + 0.5) * 255;
          img.data[o + 2] = (v.z * 0.5 + 0.5) * 255;
          img.data[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    },
    [1, 1],
    false,
  );
}

/** Weathered granite: mottled, pitted, with pale lichen and dark varnish. */
export function rockTexture() {
  return make(
    'rock',
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#a58468';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, 60, '120,84,62', 0.2, 31, 40);
      noise(ctx, w, h, 60, '205,180,150', 0.18, 32, 34);
      noise(ctx, w, h, 300, '80,58,46', 0.2, 33, 7);
      noise(ctx, w, h, 2600, '60,44,36', 0.22, 34, 2);
      noise(ctx, w, h, 2200, '235,220,196', 0.2, 35, 2);
      // cracks
      const r = rng(36);
      ctx.strokeStyle = 'rgba(48,34,28,0.5)';
      for (let i = 0; i < 16; i++) {
        ctx.lineWidth = 0.6 + r() * 1.2;
        ctx.beginPath();
        let x = r() * w;
        let y = r() * h;
        ctx.moveTo(x, y);
        for (let k = 0; k < 7; k++) {
          x += (r() - 0.5) * 46;
          y += (r() - 0.3) * 30;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
    [2, 2],
  );
}

/** Height field matching nothing in particular: a general-purpose rough bump for stone. */
export function rockBump() {
  return make(
    'rockBump',
    256,
    256,
    (ctx, w, h) => {
      const a = fbm(w, h, 6, 6, 5, 37);
      const img = ctx.createImageData(w, h);
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of a) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      for (let i = 0; i < w * h; i++) {
        const v = ((a[i] - lo) / (hi - lo)) * 255;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    },
    [2, 2],
    false,
  );
}

/** A weathered boulder: a ball pushed about by a few octaves of noise, then squashed. */
export function rockGeometry(seed: number, detail = 2, rough = 0.34) {
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, detail).deleteAttribute('uv').deleteAttribute('normal'));
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = noise2(v.x * 1.3 + seed * 7.1 + v.z * 0.9, v.y * 1.3 + seed * 3.3 - v.z * 0.7);
    const b = noise2(v.x * 3.1 + v.y * 1.7 + seed, v.z * 3.1 - v.y * 1.1 + seed * 5.7);
    // flat faces, as if split along joints
    let k = 1 + rough * (a - 0.5) * 2 + rough * 0.45 * (b - 0.5);
    const cut = v.x * 0.5 + v.y * 0.62 + v.z * (0.3 + 0.1 * seed);
    if (cut > 0.62) k *= 0.62 / cut;
    v.multiplyScalar(k);
    v.y *= 0.72;
    p.setXYZ(i, v.x, v.y, v.z);
    uv[i * 2] = v.x * 0.5 + v.z * 0.21;
    uv[i * 2 + 1] = v.y * 0.5 + v.z * 0.33;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/**
 * The shadow a set of things throws on the land, as flat geometry: every vertex slid along the
 * sunlight until it meets the ground. For things too far from the court for the shadow map.
 */
export function castOnGround(geo: THREE.BufferGeometry, mats: THREE.Matrix4[], lift = 0.07) {
  const src = geo.attributes.position as THREE.BufferAttribute;
  const index = geo.index;
  const pos = new Float32Array(mats.length * src.count * 3);
  const idx: number[] = [];
  const v = new THREE.Vector3();
  const s = SUN_DIR;
  let o = 0;
  mats.forEach((m, k) => {
    for (let i = 0; i < src.count; i++) {
      v.fromBufferAttribute(src, i).applyMatrix4(m);
      // step down the ray; two refinements are plenty on gentle ground
      let t = Math.max(0, (v.y - groundH(v.x, v.z)) / s.y);
      for (let it = 0; it < 2; it++) {
        const gy = groundH(v.x - s.x * t, v.z - s.z * t);
        t = Math.max(0, (v.y - gy) / s.y);
      }
      const x = v.x - s.x * t;
      const z = v.z - s.z * t;
      pos[o++] = x;
      pos[o++] = groundH(x, z) + lift;
      pos[o++] = z;
    }
    const base = k * src.count;
    if (index) for (let i = 0; i < index.count; i++) idx.push(base + index.getX(i));
    else for (let i = 0; i < src.count; i++) idx.push(base + i);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/**
 * Material for those flat shadows. It darkens the ground to the colour of shaded sand rather than
 * multiplying it, so where two shadows overlap the ground is no darker than under one.
 */
export function groundShadowMaterial() {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.19, 0.15, 0.115),
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.MinEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}
