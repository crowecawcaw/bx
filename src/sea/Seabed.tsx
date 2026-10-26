import { useMemo } from 'react';
import * as THREE from 'three';
import { toon } from '../scene/materials';
import { HALF, X0, X1, groundH, rise, rng, vnoise } from './dims';

const W = 110; // across, reaching under the walls
const L = X1 - X0 + 80;

function seabedTexture() {
  const rnd = rng(3);
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const x = cv.getContext('2d')!;
  x.fillStyle = '#a58c62';
  x.fillRect(0, 0, S, S);
  // cracked, drying mud plates
  const N = 9;
  const cell = S / N;
  const pts: [number, number][][] = [];
  for (let j = 0; j <= N; j++) {
    pts[j] = [];
    for (let i = 0; i <= N; i++) {
      const jx = i === 0 || i === N ? 0 : (rnd() - 0.5) * cell * 0.55;
      const jy = j === 0 || j === N ? 0 : (rnd() - 0.5) * cell * 0.55;
      pts[j][i] = [i * cell + jx, j * cell + jy];
    }
  }
  x.lineJoin = 'round';
  x.lineWidth = 4;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const q = [pts[j][i], pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]];
      x.beginPath();
      q.forEach(([px, py], k) => (k ? x.lineTo(px, py) : x.moveTo(px, py)));
      x.closePath();
      const v = 150 + rnd() * 46;
      x.fillStyle = `rgb(${v + 16},${v - 10},${v - 52})`;
      x.fill();
      x.strokeStyle = 'rgba(58,36,14,.75)';
      x.stroke();
    }
  }
  // ripples left by the drained water
  for (let r = 0; r < 70; r++) {
    x.strokeStyle = 'rgba(70,46,18,.16)';
    x.lineWidth = 2 + rnd() * 5;
    const y0 = rnd() * S;
    x.beginPath();
    x.moveTo(0, y0);
    for (let t = 0; t <= 8; t++) x.lineTo((t * S) / 8, y0 + Math.sin(t * 0.9 + r) * 14);
    x.stroke();
  }
  for (let k = 0; k < 2600; k++) {
    x.fillStyle = rnd() < 0.5 ? 'rgba(72,48,20,.30)' : 'rgba(232,206,158,.30)';
    x.beginPath();
    x.arc(rnd() * S, rnd() * S, rnd() * 2.6 + 0.4, 0, 7);
    x.fill();
  }
  for (let k = 0; k < 130; k++) {
    x.beginPath();
    x.arc(rnd() * S, rnd() * S, 3 + rnd() * 7, 0, 7);
    x.fillStyle = 'rgba(126,102,66,.75)';
    x.fill();
    x.lineWidth = 2;
    x.strokeStyle = 'rgba(46,28,10,.6)';
    x.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.repeat.set(L / 8, W / 8);
  return t;
}

function Ground() {
  const geo = useMemo(() => {
    // built along x: the plane's own x is the walk, its y (before rotation) is across
    const g = new THREE.PlaneGeometry(L, W, 640, 80);
    g.rotateX(-Math.PI / 2);
    g.translate((X0 + X1) / 2, 0, 0);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const y = groundH(x, z);
      p.setY(i, y);
      // damp, darker sand in the hollows; paler, drier sand on the humps
      const base = y - rise(x);
      const low = Math.max(0, Math.min(1, (0.8 - base) / 3.7));
      const high = Math.max(0, Math.min(1, (base - 1.3) / 4));
      cols[i * 3] = 1.02 - low * 0.4 + high * 0.06;
      cols[i * 3 + 1] = 1.0 - low * 0.3 + high * 0.04;
      cols[i * 3 + 2] = 0.96 - low * 0.14 - high * 0.06;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => toon('sea:seabed', { color: '#d2bc98', map: seabedTexture(), vertexColors: true }), []);
  return <mesh geometry={geo} material={mat} userData={{ ground: true }} />;
}

/* ------------------------------------------------------------------ props */

interface Item {
  g: THREE.BufferGeometry;
  m: THREE.Matrix4;
  c: THREE.Color;
}

/** Bakes many small props into one mesh with per-vertex colour. */
function mergeItems(items: Item[]) {
  const P: number[] = [];
  const N: number[] = [];
  const C: number[] = [];
  for (const it of items) {
    const g = it.g.index ? it.g.toNonIndexed() : it.g.clone();
    g.applyMatrix4(it.m);
    g.computeVertexNormals();
    const pa = g.attributes.position.array;
    const na = g.attributes.normal.array;
    for (let k = 0; k < pa.length; k++) {
      P.push(pa[k]);
      N.push(na[k]);
    }
    for (let v = 0; v < pa.length / 3; v++) C.push(it.c.r, it.c.g, it.c.b);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return out;
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const mat4 = (px: number, py: number, pz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz = sy) =>
  new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), _q.setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

const GEO = {
  ico0: new THREE.IcosahedronGeometry(1, 0),
  ico1: new THREE.IcosahedronGeometry(1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cone: new THREE.ConeGeometry(0.5, 1, 6),
  sph: new THREE.SphereGeometry(1, 8, 6),
  box: new THREE.BoxGeometry(1, 1, 1),
  hemi: new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.5),
};
const ROCK = ['#8f7d61', '#b0a184', '#7d6f58', '#a08a68', '#c0b394'];
const CORAL = ['#9a5fa8', '#c26a8a', '#b85a4a', '#7a6fb0', '#d08a5e'];

function buildProps(x0: number, x1: number, seed: number) {
  const rnd = rng(seed);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const col = (c: string) => new THREE.Color(c);
  const items: Item[] = [];
  const lumpy = (geo: THREE.BufferGeometry, amt: number) => {
    const g = geo.clone();
    const p = g.attributes.position;
    const s = rnd() * 40;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const d = 1 + (vnoise(x * 2.2 + s, z * 2.2 + y * 1.4 + s) - 0.5) * amt;
      p.setXYZ(i, x * d, y * d, z * d);
    }
    return g;
  };
  const rock = (x: number, z: number, s: number) =>
    items.push({
      g: lumpy(rnd() < 0.4 ? GEO.ico1 : GEO.ico0, 0.55),
      m: mat4(x, groundH(x, z) + s * 0.34, z, rnd() * 3, rnd() * 3, rnd() * 3, s * (0.8 + rnd() * 0.5), s * (0.55 + rnd() * 0.4), s * (0.8 + rnd() * 0.5)),
      c: col(pick(ROCK)),
    });
  const pebbles = (x: number, z: number) => {
    const n = 4 + Math.floor(rnd() * 7);
    for (let i = 0; i < n; i++) {
      const px = x + (rnd() - 0.5) * 5.7;
      const pz = z + (rnd() - 0.5) * 5.7;
      const s = 0.2 + rnd() * 0.48;
      items.push({ g: GEO.ico0, m: mat4(px, groundH(px, pz) + s * 0.4, pz, rnd() * 3, rnd() * 3, rnd() * 3, s, s * 0.7, s), c: col(pick(ROCK)) });
    }
  };
  const star = (x: number, z: number) => {
    const R = 1.2 + rnd() * 0.77;
    const r = R * (0.34 + rnd() * 0.14);
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = (i % 2 ? r : R) * (0.85 + rnd() * 0.3);
      if (i) sh.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else sh.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelSize: 0.17, bevelThickness: 0.13, bevelSegments: 1 });
    items.push({ g, m: mat4(x, groundH(x, z) + 0.09, z, -Math.PI / 2, 0, rnd() * 6, 1, 1, 1), c: col(rnd() < 0.5 ? '#d4622f' : '#e08a4a') });
  };
  const shell = (x: number, z: number) => {
    const turns = 1.4 + rnd() * 1.2;
    const h = 0.66 + rnd() * 0.77;
    const pts = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      return new THREE.Vector2(0.07 + Math.sin(t * Math.PI * turns * 0.6) * 0.66 * (1 - t * 0.55), t * h);
    });
    items.push({
      g: new THREE.LatheGeometry(pts, 7),
      m: mat4(x, groundH(x, z) + 0.05, z, Math.PI * (0.4 + rnd() * 0.35), rnd() * 6, 0, 1, 1, 1),
      c: col(rnd() < 0.5 ? '#e8d8b4' : '#d8b89a'),
    });
  };
  const clam = (x: number, z: number) => {
    const s = 0.44 + rnd() * 0.55;
    items.push({ g: GEO.hemi, m: mat4(x, groundH(x, z) + 0.02, z, rnd() * 0.4, rnd() * 6, rnd() * 0.4, s, s * 0.45, s * 1.2), c: col(rnd() < 0.5 ? '#f0e2c2' : '#c9b9d4') });
  };
  const coral = (x: number, z: number) => {
    const c = col(pick(CORAL));
    const base = groundH(x, z);
    const n = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const h = 1.3 + rnd() * 3.7;
      const ang = rnd() * 6;
      const tilt = 0.15 + rnd() * 0.55;
      const ox = Math.cos(ang) * 0.77 * rnd();
      const oz = Math.sin(ang) * 0.77 * rnd();
      const lean = rnd() * 6;
      items.push({ g: GEO.cyl, m: mat4(x + ox, base + h / 2, z + oz, Math.sin(lean) * tilt, 0, Math.cos(lean) * tilt, 0.3 + rnd() * 0.22, h, 0.3 + rnd() * 0.22), c });
      items.push({ g: GEO.sph, m: mat4(x + ox + Math.cos(lean) * tilt * h * 0.5, base + h * 0.98, z + oz + Math.sin(lean) * tilt * h * 0.5, 0, 0, 0, 0.28, 0.33, 0.28), c });
    }
  };
  const kelp = (x: number, z: number) => {
    const base = groundH(x, z);
    const c = col(rnd() < 0.5 ? '#5c7a44' : '#496b3e');
    const n = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const segs = 3 + Math.floor(rnd() * 3);
      const ox = (rnd() - 0.5) * 1.5;
      const oz = (rnd() - 0.5) * 1.5;
      const lean = (rnd() - 0.5) * 0.7;
      const dir = rnd() * 6;
      let y = base;
      // dried and slumped over, now that the water has gone
      for (let s = 0; s < segs; s++) {
        const h = 1 + rnd() * 0.9;
        items.push({ g: GEO.box, m: mat4(x + ox + Math.sin(dir) * lean * s * 0.9, y + h / 2, z + oz + Math.cos(dir) * lean * s * 0.9, lean * 0.5, dir, lean, 0.44 - s * 0.07, h, 0.11), c });
        y += h * 0.92;
      }
    }
  };
  const grass = (x: number, z: number) => {
    const base = groundH(x, z);
    const c = col('#6e8a4a');
    for (let i = 0; i < 9; i++) {
      const h = 0.55 + rnd() * 1.1;
      items.push({ g: GEO.cone, m: mat4(x + (rnd() - 0.5) * 2.4, base + h / 2, z + (rnd() - 0.5) * 2.4, (rnd() - 0.5) * 0.5, rnd() * 6, (rnd() - 0.5) * 0.5, 0.15, h, 0.15), c });
    }
  };
  const wreck = (x: number, z: number) => {
    const base = groundH(x, z);
    const c = col('#8a7554');
    const n = 3 + Math.floor(rnd() * 4);
    const ang = rnd() * 6;
    for (let i = 0; i < n; i++) {
      const h = 2.6 + rnd() * 4.8;
      items.push({ g: GEO.cyl, m: mat4(x + i * 1.2 * Math.cos(ang), base + h * 0.32, z + i * 1.2 * Math.sin(ang), 0.5 + rnd() * 0.4, ang, 0.2, 0.2, h, 0.2), c });
    }
  };
  const n = Math.round(((x1 - x0) / 131) * 22);
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const side = rnd() < 0.5 ? -1 : 1;
    const z = side * (4.8 + Math.pow(rnd(), 0.7) * (HALF - 6.2));
    const r = rnd();
    if (r < 0.26) rock(x, z, 0.77 + rnd() * 3.3);
    else if (r < 0.36) rock(x, z, 3.5 + rnd() * 3);
    else if (r < 0.48) pebbles(x, z);
    else if (r < 0.58) star(x, z);
    else if (r < 0.66) shell(x, z);
    else if (r < 0.73) clam(x, z);
    else if (r < 0.83) coral(x, z);
    else if (r < 0.9) kelp(x, z);
    else if (r < 0.97) grass(x, z);
    else wreck(x, z);
  }
  return mergeItems(items);
}

/** Rocks, shells, starfish, coral and weed, left high and dry. Built in chunks so each can be culled. */
function Props() {
  const chunks = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    for (let x = X0 + 40, k = 0; x < X1 - 40; x += 130, k++) out.push(buildProps(x, x + 130, 100 + k));
    return out;
  }, []);
  const mat = useMemo(() => toon('sea:props', { vertexColors: true }), []);
  return (
    <>
      {chunks.map((g, i) => (
        <mesh key={i} geometry={g} material={mat} />
      ))}
    </>
  );
}

/** The dry path through the midst of the sea (Ex 14:22). Tappable: tap to walk. */
export function Seabed() {
  return (
    <>
      <Ground />
      <Props />
    </>
  );
}
