import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { pureGold } from './materials';

/*
 * A kneeling cherub of beaten gold, facing +x (Ex 25:18-20). Scripture gives only the pose:
 * wings stretched forth on high over the mercy seat, faces toward one another and toward the
 * seat. Everything else is an artistic choice: a reverent, robed, human-like figure with an
 * S-curve from the pooled hem up through a forward-leaning torso to a bowed head, hands joined,
 * and two long wings that rise from the shoulder blades and sweep forward in layered feathers.
 *
 * All parts are swept surfaces (rings of varying cross-section along curves) merged into one
 * geometry, built once and shared by both cherubim.
 */

type Frame = { p: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3 };

/** Ring-stack surface: at each t a closed section (local n/b coords) placed in a frame. Ends are capped. */
function sweep(
  segs: number,
  radial: number,
  frameAt: (t: number) => Frame,
  section: (t: number, th: number) => [number, number],
) {
  const pos: number[] = [];
  const idx: number[] = [];
  const v = new THREE.Vector3();
  const rings: Frame[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const f = frameAt(t);
    rings.push(f);
    for (let j = 0; j < radial; j++) {
      const th = (j / radial) * Math.PI * 2;
      const [a, c] = section(t, th);
      v.copy(f.p).addScaledVector(f.n, a).addScaledVector(f.b, c);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = a + radial;
      const d = b + radial;
      idx.push(a, c, b, b, c, d);
    }
  }
  // caps: fan to the centre of the first and last ring
  const capAt = (ring: number, flip: boolean) => {
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < radial; j++) {
      const k = (ring * radial + j) * 3;
      cx += pos[k]; cy += pos[k + 1]; cz += pos[k + 2];
    }
    const ci = pos.length / 3;
    pos.push(cx / radial, cy / radial, cz / radial);
    for (let j = 0; j < radial; j++) {
      const a = ring * radial + j;
      const b = ring * radial + ((j + 1) % radial);
      if (flip) idx.push(ci, a, b);
      else idx.push(ci, b, a);
    }
  };
  capAt(0, true);
  capAt(segs, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // planar UVs from position, so the hammered texture has no seams
  const uv: number[] = [];
  for (let k = 0; k < pos.length; k += 3) uv.push((pos[k] + pos[k + 2]) * 1.6, pos[k + 1] * 1.6);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** Frames along a curve; n is the reference direction made perpendicular to the tangent. */
function curveFrames(curve: THREE.Curve<THREE.Vector3>, ref: THREE.Vector3) {
  return (t: number): Frame => {
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const n = ref.clone().addScaledVector(tan, -ref.dot(tan)).normalize();
    const b = new THREE.Vector3().crossVectors(tan, n).normalize();
    return { p, n, b };
  };
}

/** Smooth 1-D interpolation through [t, value] keys (Catmull-Rom). */
function table(keys: [number, number][]) {
  return (t: number) => {
    if (t <= keys[0][0]) return keys[0][1];
    const last = keys.length - 1;
    if (t >= keys[last][0]) return keys[last][1];
    let i = 0;
    while (keys[i + 1][0] < t) i++;
    const [t1, p1] = keys[i];
    const [t2, p2] = keys[i + 1];
    const p0 = keys[Math.max(0, i - 1)][1];
    const p3 = keys[Math.min(last, i + 2)][1];
    const u = (t - t1) / (t2 - t1);
    const u2 = u * u;
    const u3 = u2 * u;
    return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
  };
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0);

/** Egg-shaped section: separate front/back reach along n, half-width along b. */
function egg(front: number, back: number, side: number, th: number): [number, number] {
  const c = Math.cos(th);
  const s = Math.sin(th);
  const a = c >= 0 ? front : back;
  const r = 1 / Math.sqrt((c * c) / (a * a) + (s * s) / (side * side));
  return [r * c, r * s];
}

/** Robe from the pooled hem to the neck: kneeling mound in front, S-curve up the back. */
function robe() {
  const spine = new THREE.CatmullRomCurve3([V(-0.05, 0, 0), V(-0.07, 0.17, 0), V(-0.04, 0.33, 0), V(0.04, 0.46, 0), V(0.13, 0.555, 0), V(0.2, 0.615, 0)]);
  const front = table([[0, 0.36], [0.08, 0.35], [0.2, 0.27], [0.3, 0.15], [0.45, 0.11], [0.62, 0.12], [0.8, 0.1], [0.92, 0.06], [1, 0.05]]);
  const back = table([[0, 0.17], [0.1, 0.16], [0.3, 0.14], [0.48, 0.11], [0.68, 0.11], [0.85, 0.1], [0.95, 0.06], [1, 0.05]]);
  const side = table([[0, 0.21], [0.12, 0.19], [0.3, 0.155], [0.48, 0.12], [0.68, 0.14], [0.84, 0.16], [0.95, 0.08], [1, 0.05]]);
  // folds: soft ridges that spiral back as they fall to the hem, strongest at the hem
  const foldAmp = table([[0, 0.1], [0.15, 0.07], [0.32, 0.03], [0.48, 0.0], [0.62, 0.02], [0.8, 0.0], [1, 0]]);
  const g = sweep(48, 40, curveFrames(spine, V(1, 0, 0)), (t, th) => {
    const [a, b] = egg(front(t), back(t), side(t), th);
    const fold = 1 + foldAmp(t) * Math.sin(7 * th + 3.2 * (1 - t) * Math.sign(Math.sin(th)) + 0.4);
    return [a * fold, b * fold];
  });
  clampFloor(g);
  return g;
}

function clampFloor(g: THREE.BufferGeometry) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
  g.computeVertexNormals();
}

/** Head bowed toward the mercy seat, with a hint of brow, nose and chin in profile. */
function head() {
  const axis = new THREE.CatmullRomCurve3([V(0.18, 0.6, 0), V(0.245, 0.655, 0), V(0.32, 0.72, 0)]);
  const r = table([[0, 0.0], [0.08, 0.05], [0.3, 0.078], [0.55, 0.085], [0.8, 0.072], [0.95, 0.038], [1, 0.0]]);
  const face = table([[0, 0], [0.18, 0.012], [0.3, 0.0], [0.42, 0.012], [0.5, 0.02], [0.58, 0.004], [0.66, 0.012], [0.8, 0], [1, 0]]);
  // frame n points to the face: forward and down from the tilted axis
  return sweep(22, 24, curveFrames(axis, V(0.7, -0.7, 0)), (t, th) => {
    const c = Math.cos(th);
    const s = Math.sin(th);
    const rr = r(t) * (c < 0 ? 1.12 : 1) + face(t) * Math.exp(-((th > Math.PI ? th - 2 * Math.PI : th) ** 2) * 18);
    return [rr * c, rr * s * 0.95];
  });
}

/** Locks of hair streaming back from the brow down to between the wings. */
function hair() {
  const parts: THREE.BufferGeometry[] = [];
  for (const k of [-1, 0, 1]) {
    const z = k * 0.035;
    const c = new THREE.CatmullRomCurve3([
      V(0.335, 0.735, z * 0.5),
      V(0.275, 0.77, z),
      V(0.19, 0.75, z * 1.4),
      V(0.12, 0.69, z * 1.7),
      V(0.06, 0.635, z * 1.6),
      V(0.0 - Math.abs(k) * 0.02, 0.6 - Math.abs(k) * 0.02, z * 1.2),
    ]);
    const w = table([[0, 0.025], [0.25, 0.04], [0.6, 0.035], [1, 0.0]]);
    parts.push(sweep(28, 10, curveFrames(c, V(0, 0, 1)), (t, th) => [Math.cos(th) * w(t) * 1.1, Math.sin(th) * w(t) * 0.45 - 0.005]));
  }
  return parts;
}

/** Arm in a full sleeve that hangs from the forearm; hands meet before the breast. */
function arm(side: number) {
  const c = new THREE.CatmullRomCurve3([
    V(0.11, 0.57, side * 0.13),
    V(0.12, 0.48, side * 0.165),
    V(0.16, 0.41, side * 0.15),
    V(0.25, 0.45, side * 0.08),
    V(0.3, 0.5, side * 0.02),
    V(0.32, 0.54, side * 0.012),
  ]);
  const rn = table([[0, 0.045], [0.25, 0.04], [0.5, 0.05], [0.68, 0.075], [0.76, 0.06], [0.8, 0.026], [0.93, 0.022], [1, 0.0]]);
  const rb = table([[0, 0.045], [0.25, 0.038], [0.5, 0.04], [0.68, 0.045], [0.76, 0.045], [0.8, 0.02], [0.93, 0.014], [1, 0.0]]);
  const droop = table([[0, 0], [0.45, 0.0], [0.66, -0.035], [0.76, -0.03], [0.8, 0], [1, 0]]);
  return sweep(36, 14, curveFrames(c, Y), (t, th) => [Math.cos(th) * rn(t) + droop(t), Math.sin(th) * rb(t)]);
}

/** A single feather blade: a cambered, tapering leaf along a gently curving quill. */
function feather(base: THREE.Vector3, dir: THREE.Vector3, along: THREE.Vector3, out: THREE.Vector3, len: number, width: number, curl: number, sweepTo: number, round: number) {
  const w = new THREE.Vector3().copy(along).addScaledVector(dir, -along.dot(dir)).normalize();
  const nrm = new THREE.Vector3().crossVectors(dir, w);
  if (nrm.dot(out) < 0) nrm.negate();
  const frameAt = (t: number): Frame => {
    const p = base.clone().addScaledVector(dir, len * t).addScaledVector(nrm, -curl * len * t * t).addScaledVector(w, sweepTo * len * t * t);
    // the blade turns with its curve so it stays tangent to the cupped wing
    const tan = dir.clone().addScaledVector(nrm, -2 * curl * t).addScaledVector(w, 2 * sweepTo * t).normalize();
    const b = w.clone().addScaledVector(tan, -w.dot(tan)).normalize();
    const n = new THREE.Vector3().crossVectors(b, tan).normalize();
    if (n.dot(nrm) < 0) n.negate();
    return { p, n, b };
  };
  return sweep(12, 8, frameAt, (t, th) => {
    const shape = Math.pow(Math.sin(Math.PI * Math.pow(t, round)), 0.6);
    const wd = width * shape;
    const c = Math.cos(th);
    const s = Math.sin(th);
    // lenticular section with camber: edges drop toward the inside of the cup
    return [s * 0.012 * (0.4 + shape) + -c * c * wd * 0.18, c * wd];
  });
}

/** One wing: a strong leading edge rising from the shoulder blade and arching forward, hung with
 *  two staggered rows of coverts over a fan of long flight feathers that turns from back-down
 *  (near the body) to straight forward at the tip, so the tips reach over the mercy seat. */
function wing(side: number) {
  const parts: THREE.BufferGeometry[] = [];
  const edge = new THREE.CatmullRomCurve3([
    V(0.0, 0.61, side * 0.09),
    V(-0.12, 0.75, side * 0.22),
    V(-0.11, 0.92, side * 0.34),
    V(0.06, 1.025, side * 0.4),
    V(0.32, 1.05, side * 0.38),
    V(0.58, 1.01, side * 0.32),
    V(0.75, 0.95, side * 0.25),
  ]);
  const outward = V(0, 0.15, side).normalize();
  const er = table([[0, 0.05], [0.3, 0.04], [0.7, 0.03], [1, 0.012]]);
  parts.push(sweep(40, 12, curveFrames(edge, outward), (t, th) => [Math.cos(th) * er(t) * 0.55, Math.sin(th) * er(t)]));

  // feather direction in the side view: angle from +x, turning from back-down to forward-down
  const ang = table([[0, 4.3], [0.25, 4.55], [0.5, 4.75], [0.7, 5.15], [0.85, 5.6], [1, 5.95]]);
  const dirAt = (u: number, splay: number) => {
    const a = ang(u);
    return V(Math.cos(a), Math.sin(a), side * splay).normalize();
  };
  const outAt = (u: number) => V(0, 0.2, side).normalize().addScaledVector(V(-1, 0, 0), u < 0.5 ? 0.2 : -0.1).normalize();

  // flight feathers: secondaries then long primaries
  const flights = 17;
  const flen = table([[0, 0.17], [0.2, 0.24], [0.45, 0.25], [0.65, 0.27], [0.85, 0.38], [1, 0.4]]);
  for (let i = 0; i < flights; i++) {
    const u = 0.1 + (i / (flights - 1)) * 0.9;
    const base = edge.getPointAt(Math.min(1, u * 0.97));
    const tan = edge.getTangentAt(Math.min(1, u * 0.97));
    const dir = dirAt(u, 0.12 - u * 0.3);
    // alternate feathers sit a hair proud of their neighbours so the overlaps read as layers
    const base2 = base.addScaledVector(dir, 0.01).addScaledVector(outAt(u), (i % 2) * 0.009);
    parts.push(feather(base2, dir, tan, outAt(u), flen(u), 0.062 + u * 0.016, 0.18, 0.12 + u * 0.1, 1.35));
  }
  // two staggered covert rows, laid over the outer face of the flights
  const rows: [number, number, number, number][] = [
    // count, length, width, outward offset
    [11, 0.2, 0.05, 0.016],
    [12, 0.11, 0.042, 0.03],
    // under-coverts on the inner face, closing the gaps between the flight roots
    [12, 0.15, 0.06, -0.012],
  ];
  rows.forEach(([n, len, wd, off], r) => {
    for (let i = 0; i < n; i++) {
      const u = 0.06 + ((i + r * 0.5) / n) * 0.84;
      const base = edge.getPointAt(u);
      const tan = edge.getTangentAt(u);
      const out = outAt(u);
      const dir = dirAt(u * 0.92, 0.08 - u * 0.2);
      const l = len * (0.75 + 0.35 * Math.sin(Math.PI * Math.min(1, u * 1.1)));
      parts.push(feather(base.addScaledVector(out, off).addScaledVector(dir, -0.005), dir, tan, out, l, wd, 0.12, 0.2, 1.2));
    }
  });
  return parts;
}

function cherubGeometry() {
  const parts = [robe(), head(), ...hair(), arm(1), arm(-1), ...wing(1), ...wing(-1)];
  const g = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  g.computeBoundingSphere();
  return g;
}

let shared: THREE.BufferGeometry | null = null;

/** Kneeling cherub facing +x, wings stretched forth on high over the mercy seat (Ex 25:20). */
export function Cherub() {
  const geo = useMemo(() => (shared ??= cherubGeometry()), []);
  return <mesh geometry={geo} material={pureGold()} castShadow receiveShadow />;
}
