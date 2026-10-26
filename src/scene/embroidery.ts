/**
 * Hand-drawn embroidery motifs for the woven hangings: scrolling vines (rinceaux), leaves,
 * pomegranates (Ex 28:33), almond blossoms (Ex 25:33), palmettes, curling tendrils and
 * scalloped borders. Everything is drawn as filled shapes with a dark ink outline and a
 * satin-stitch sheen, with small irregularities so it reads as needlework, not geometry.
 */

export type P = [number, number];
type Fn = () => void;
/** Deferred drawing so stems can pass over leaves and under fruit, across several vines. */
export type Layers = { back: Fn[]; stem: Fn[]; front: Fn[] };
export const layers = (): Layers => ({ back: [], stem: [], front: [] });
export function flush(L: Layers) {
  for (const k of ['back', 'stem', 'front'] as const) {
    for (const f of L[k]) f();
    L[k] = [];
  }
}

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number) {
  const A = hex(a);
  const B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const lighten = (c: string, t: number) => mix(c, '#ffffff', t);

/** Deterministic hash noise in [0, 1) for a few integer keys (keeps tiling motifs periodic). */
export function hr(...k: number[]) {
  let h = 2166136261;
  for (const v of k) {
    h ^= Math.floor(v * 1000) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 2246822507);
  }
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Catmull-Rom spline through the points. */
export function spline(pts: P[], seg = 12): P[] {
  const out: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < seg; j++) {
      const t = j / seg;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** A path that curls ever tighter: the volute of a vine tendril. */
export function curl(x: number, y: number, heading: number, len: number, dir: number, turn: number, steps = 36): P[] {
  const pts: P[] = [[x, y]];
  let a = heading;
  const ds = len / steps;
  // curvature grows with t^2; total turning equals `turn` radians
  const k0 = (turn * 0.25) / len;
  const k1 = (turn * 0.75 * 3) / len;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    a += dir * (k0 + k1 * t * t) * ds;
    x += Math.cos(a) * ds;
    y += Math.sin(a) * ds;
    pts.push([x, y]);
  }
  return pts;
}

export function heading(path: P[], i: number) {
  const a = path[Math.max(0, i - 1)];
  const b = path[Math.min(path.length - 1, i + 1)];
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

/** A stitched stem: tapered ribbon with ink outline and a broken sheen of stem-stitch. */
export function ribbon(ctx: CanvasRenderingContext2D, path: P[], w0: number, w1: number, fill: string, ink: string, inkW: number) {
  const n = path.length;
  if (n < 2) return;
  const L: P[] = [];
  const R: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = heading(path, i);
    const t = i / (n - 1);
    const w = (w0 + (w1 - w0) * t) * 0.5;
    const nx = -Math.sin(a) * w;
    const ny = Math.cos(a) * w;
    L.push([path[i][0] + nx, path[i][1] + ny]);
    R.push([path[i][0] - nx, path[i][1] - ny]);
  }
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (const p of L) ctx.lineTo(p[0], p[1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = inkW;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
  // stem-stitch sheen: short overlapping dashes along one side
  const wm = Math.max(w0, w1);
  if (wm > 3) {
    ctx.save();
    ctx.strokeStyle = lighten(fill, 0.35);
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = Math.max(0.8, wm * 0.22);
    ctx.lineCap = 'round';
    ctx.setLineDash([wm * 0.9, wm * 0.45]);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = heading(path, i);
      const t = i / (n - 1);
      const o = (w0 + (w1 - w0) * t) * 0.2;
      const x = path[i][0] - Math.sin(a) * o;
      const y = path[i][1] + Math.cos(a) * o;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** Fill a shape (in the current local frame) with satin-stitch lines, then outline it in ink. */
function stitched(ctx: CanvasRenderingContext2D, p: Path2D, fill: string, ink: string, inkW: number, R: number, angle: number) {
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  ctx.rotate(angle);
  const sp = Math.max(1.6, R * 0.09);
  ctx.lineWidth = sp * 0.42;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  for (let x = -R * 1.5; x < R * 1.5; x += sp) {
    ctx.moveTo(x, -R * 1.5);
    ctx.lineTo(x, R * 1.5);
  }
  ctx.stroke();
  ctx.restore();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = inkW;
  ctx.stroke(p);
}

function frame(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, f: Fn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  f();
  ctx.restore();
}

/** A curved leaf from its base along angle a, with a two-tone fishbone vein. */
export function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, len: number, wid: number, fill: string, ink: string, inkW: number, bend = 0.2) {
  frame(ctx, x, y, a, () => {
    const b = bend * len;
    const p = new Path2D();
    p.moveTo(0, 0);
    p.bezierCurveTo(len * 0.22, -wid * 0.95, len * 0.68, -wid * 0.75 + b * 0.5, len, b);
    p.bezierCurveTo(len * 0.62, wid * 0.55 + b * 0.6, len * 0.2, wid * 0.8, 0, 0);
    stitched(ctx, p, fill, ink, inkW, len * 0.6, 0.75);
    // vein and a lighter half, as embroiderers shade a leaf in two threads
    const half = new Path2D();
    half.moveTo(0, 0);
    half.bezierCurveTo(len * 0.22, -wid * 0.95, len * 0.68, -wid * 0.75 + b * 0.5, len, b);
    half.quadraticCurveTo(len * 0.5, b * 0.35, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fill(half);
    ctx.strokeStyle = lighten(fill, 0.45);
    ctx.lineWidth = Math.max(0.8, inkW * 0.6);
    ctx.beginPath();
    ctx.moveTo(len * 0.06, 0);
    ctx.quadraticCurveTo(len * 0.5, b * 0.35, len * 0.9, b * 0.9);
    ctx.stroke();
  });
}

/** Pomegranate (Ex 28:33-34) hanging from its stalk along angle a, opened to show its seeds. */
export function pomegranate(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, r: number, body: string, crown: string, seed: string, ink: string, inkW: number) {
  frame(ctx, x, y, a, () => {
    // crown (calyx) at the far end
    const c = new Path2D();
    c.moveTo(r * 1.55, -r * 0.42);
    c.quadraticCurveTo(r * 2.1, -r * 0.5, r * 2.45, -r * 0.82);
    c.quadraticCurveTo(r * 2.2, -r * 0.3, r * 2.25, -r * 0.18);
    c.lineTo(r * 2.6, 0);
    c.lineTo(r * 2.25, r * 0.18);
    c.quadraticCurveTo(r * 2.2, r * 0.3, r * 2.45, r * 0.82);
    c.quadraticCurveTo(r * 2.1, r * 0.5, r * 1.55, r * 0.42);
    c.closePath();
    stitched(ctx, c, crown, ink, inkW, r, 0.3);
    const p = new Path2D();
    p.moveTo(r * 0.08, 0);
    p.bezierCurveTo(r * 0.1, -r * 1.25, r * 1.85, -r * 1.2, r * 1.85, 0);
    p.bezierCurveTo(r * 1.85, r * 1.2, r * 0.1, r * 1.25, r * 0.08, 0);
    stitched(ctx, p, body, ink, inkW, r * 1.2, -0.6);
    // an inner contour in a second thread, as embroiderers outline-fill a fruit
    ctx.strokeStyle = lighten(body, 0.3);
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.ellipse(r * 0.98, 0, r * 0.62, r * 0.66, 0, Math.PI * 0.35, Math.PI * 1.65, true);
    ctx.stroke();
    // a few seeds glinting where the crown splits
    ctx.fillStyle = seed;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(r * (1.42 + 0.1 * (i % 2)), r * (-0.27 + 0.18 * i), r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    // highlight
    ctx.strokeStyle = lighten(body, 0.45);
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(r * 0.98, 0, r * 0.68, Math.PI * 1.15, Math.PI * 1.5);
    ctx.stroke();
  });
}

/** Almond blossom (Ex 25:33): five notched petals in two tones round a stamened heart. */
export function blossom(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, r: number, petal: string, heart: string, ink: string, inkW: number) {
  frame(ctx, x, y, rot, () => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + (hr(i, r, 3) - 0.5) * 0.18;
      const rr = r * (0.92 + hr(i, r, 4) * 0.14);
      ctx.save();
      ctx.rotate(a);
      const p = new Path2D();
      p.moveTo(0, 0);
      p.bezierCurveTo(rr * 0.15, -rr * 0.6, rr * 0.92, -rr * 0.66, rr, -rr * 0.12);
      p.quadraticCurveTo(rr * 0.84, 0, rr, rr * 0.12);
      p.bezierCurveTo(rr * 0.92, rr * 0.66, rr * 0.15, rr * 0.6, 0, 0);
      stitched(ctx, p, petal, ink, inkW, rr, Math.PI / 2);
      const q = new Path2D();
      q.moveTo(0, 0);
      q.bezierCurveTo(rr * 0.1, -rr * 0.32, rr * 0.5, -rr * 0.34, rr * 0.55, 0);
      q.bezierCurveTo(rr * 0.5, rr * 0.34, rr * 0.1, rr * 0.32, 0, 0);
      ctx.fillStyle = heart;
      ctx.globalAlpha = 0.55;
      ctx.fill(q);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(0.8, inkW * 0.6);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42);
      ctx.stroke();
      ctx.fillStyle = heart;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.44, Math.sin(a) * r * 0.44, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = heart;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

/** A closed almond bud on its short sepals, pointing along a. */
export function bud(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, s: number, fill: string, sepal: string, ink: string, inkW: number) {
  frame(ctx, x, y, a, () => {
    const p = new Path2D();
    p.moveTo(s * 0.2, 0);
    p.bezierCurveTo(s * 0.35, -s * 0.55, s * 1.1, -s * 0.35, s * 1.35, 0);
    p.bezierCurveTo(s * 1.1, s * 0.35, s * 0.35, s * 0.55, s * 0.2, 0);
    stitched(ctx, p, fill, ink, inkW, s, 0.4);
    const c = new Path2D();
    c.moveTo(0, 0);
    c.quadraticCurveTo(s * 0.35, -s * 0.5, s * 0.75, -s * 0.38);
    c.quadraticCurveTo(s * 0.45, -s * 0.05, s * 0.6, 0);
    c.quadraticCurveTo(s * 0.45, s * 0.05, s * 0.75, s * 0.38);
    c.quadraticCurveTo(s * 0.35, s * 0.5, 0, 0);
    stitched(ctx, c, sepal, ink, inkW, s, 0.4);
  });
}

/** A palmette: a fan of curling lobes rising from a cup between two volutes, opening along a. */
export function palmette(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, L: number, cols: string[], ink: string, inkW: number) {
  frame(ctx, x, y, a, () => {
    const n = 7;
    const order = [0, 6, 1, 5, 2, 4, 3];
    for (const i of order) {
      const k = i - (n - 1) / 2;
      const ang = k * 0.3;
      const len = L * (0.62 + 0.38 * Math.cos(k * 0.36)) * (0.94 + hr(i, L, 5) * 0.1);
      const wl = L * 0.13;
      const tip = k * 0.5 * len * 0.25; // outer lobes curl outward at their tips
      ctx.save();
      ctx.translate(L * 0.18, 0);
      ctx.rotate(ang);
      const p = new Path2D();
      p.moveTo(0, 0);
      p.bezierCurveTo(len * 0.3, -wl * 1.1, len * 0.85, -wl * 1.25 + tip * 0.6, len, tip);
      p.bezierCurveTo(len * 0.9, wl * 0.9 + tip * 0.6, len * 0.3, wl * 0.8, 0, 0);
      stitched(ctx, p, cols[Math.abs(k) % cols.length], ink, inkW, len * 0.6, 0.8);
      ctx.restore();
    }
    // volutes at the base, curling back
    for (const s of [-1, 1]) {
      const v = curl(L * 0.12, s * L * 0.1, s * Math.PI * 0.5, L * 0.5, s, 4.6, 30);
      ribbon(ctx, v, L * 0.09, L * 0.03, cols[1 % cols.length], ink, inkW);
    }
    const cup = new Path2D();
    cup.moveTo(-L * 0.04, 0);
    cup.bezierCurveTo(L * 0.0, -L * 0.2, L * 0.3, -L * 0.2, L * 0.3, 0);
    cup.bezierCurveTo(L * 0.3, L * 0.2, L * 0.0, L * 0.2, -L * 0.04, 0);
    stitched(ctx, cup, cols[2 % cols.length], ink, inkW, L * 0.3, 1.2);
  });
}

export type Palette = {
  stem: string;
  leaf: string;
  /** colours for fruit, flowers and palmette lobes */
  fruit: string[];
  /** the colour of the ground showing through (pomegranate seeds, blossom hearts) */
  light: string;
  ink: string;
};

/** A terminal motif at the end of a branch: pomegranate, palmette, blossom or bud. */
export function terminal(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, a: number, s: number, pal: Palette, inkW: number, v: number) {
  const f = pal.fruit;
  const c0 = f[v % f.length];
  const c1 = f[(v + 1) % f.length];
  const c2 = f[(v + 2) % f.length];
  switch (kind % 4) {
    case 0:
      pomegranate(ctx, x, y, a, s * 0.5, c0 === pal.light ? c1 : c0, c0 === pal.light ? c2 : c1, pal.light, pal.ink, inkW);
      break;
    case 1:
      palmette(ctx, x, y, a, s * 1.15, c1 === pal.light ? [c0, c2, c1] : [c0, c1, c2], pal.ink, inkW);
      break;
    case 2:
      blossom(ctx, x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.45, a, s * 0.55, c0 === pal.light ? c1 : pal.light, c0, pal.ink, inkW);
      break;
    default:
      bud(ctx, x, y, a, s * 0.7, c0 === pal.light ? c1 : c0, pal.leaf, pal.ink, inkW);
  }
}

export type ScrollOpts = {
  x0: number;
  x1: number;
  y: number;
  amp: number;
  period: number;
  phase?: number;
  stemW: number;
  pal: Palette;
  inkW: number;
  seed: number;
  /** motif size relative to the wave */
  scale?: number;
  /** if set, motif choices repeat every N half-waves so the scroll tiles */
  N?: number;
  /** extra decoration: leaves on the stem and buds on the outer side of each crest */
  rich?: boolean;
  kinds?: number[];
};

/** A rinceau: an undulating stem throwing off a curling branch into each hollow of its wave,
 *  each ending in a fruit or flower. Drawn along +x in the current frame. */
export function scroll(ctx: CanvasRenderingContext2D, o: ScrollOpts, L: Layers) {
  const { x0, x1, y, amp, period, stemW, pal, inkW, seed } = o;
  const phase = o.phase ?? 0;
  const sc = o.scale ?? 1;
  const kinds = o.kinds ?? [0, 1, 2, 0, 3, 1, 2];
  const K = (2 * Math.PI) / period;
  const fy = (x: number) => y + amp * Math.sin(K * x + phase) * (1 + 0.1 * Math.sin(K * x * 0.5 + seed)) + amp * 0.03 * Math.sin(K * x * 3 + seed);
  const stem: P[] = [];
  for (let x = x0 - period * 0.5; x <= x1 + period * 0.5; x += period / 48) stem.push([x, fy(x)]);
  L.stem.push(() => ribbon(ctx, stem, stemW, stemW, pal.stem, pal.ink, inkW));
  const kFirst = Math.floor(((x0 - period) * K + phase) / Math.PI);
  const kLast = Math.ceil(((x1 + period) * K + phase) / Math.PI);
  for (let k = kFirst; k <= kLast; k++) {
    const km = o.N ? ((k % o.N) + o.N) % o.N : k;
    const r = (j: number) => hr(seed, km, j);
    const low = ((k % 2) + 2) % 2 === 0; // sin = +1: lowest point; the hollow opens upward
    const th = Math.PI / 2 + k * Math.PI;
    const xe = (th - phase) / K;
    // branch leaves just after the extremum and curls back into the hollow
    const xs = xe + (0.07 + r(1) * 0.04) * period;
    const hs = Math.atan2(fy(xs + 1) - fy(xs - 1), 2);
    const dir = low ? -1 : 1;
    const blen = period * (0.36 + r(2) * 0.08) * Math.min(1.25, (amp * 2.2) / period + 0.45);
    const br = curl(xs, fy(xs), hs + dir * 0.55, blen, dir, 2.5 + r(3) * 0.5, 30);
    const end = br[br.length - 1];
    const ea = heading(br, br.length - 1);
    const size = Math.min(amp * 1.05, period * 0.27) * sc * (0.9 + r(4) * 0.2);
    L.back.push(() => ribbon(ctx, br, stemW * 0.75, stemW * 0.42, pal.stem, pal.ink, inkW));
    // a fine tendril springing from the branch, curling the other way
    const ti = Math.floor(br.length * (0.35 + r(5) * 0.15));
    const ta = heading(br, ti);
    const td = curl(br[ti][0], br[ti][1], ta - dir * 0.9, blen * 0.42, -dir, 6 + r(6) * 2, 30);
    L.back.push(() => ribbon(ctx, td, stemW * 0.4, stemW * 0.12, pal.stem, pal.ink, inkW * 0.8));
    // a leaf on the branch
    const li = Math.floor(br.length * 0.62);
    L.back.push(() => leaf(ctx, br[li][0], br[li][1], heading(br, li) + dir * 0.8, size * 0.62, size * 0.2, pal.leaf, pal.ink, inkW, dir * 0.25));
    const kind = kinds[km % kinds.length];
    const v = Math.floor(r(7) * 3);
    L.front.push(() => terminal(ctx, kind, end[0], end[1], ea, size, pal, inkW, v));
    if (o.rich) {
      // paired leaves where the stem crosses the middle, pointing onward
      const xm = xe - period * 0.25;
      const hm = Math.atan2(fy(xm + 1) - fy(xm - 1), 2);
      for (const s of [-1, 1]) {
        const xm2 = xm + s * period * 0.03;
        L.back.push(() => leaf(ctx, xm2, fy(xm2), hm + s * 0.75, size * 0.55, size * 0.17, pal.leaf, pal.ink, inkW, -s * 0.25));
      }
      // a bud on the outer side of the crest
      const xb = xe - period * 0.04;
      const ba = (low ? Math.PI / 2 : -Math.PI / 2) + (r(8) - 0.5) * 0.6;
      const stalk = curl(xb, fy(xb), ba - dir * 0.4, size * 0.4, dir, 0.6, 10);
      const se = stalk[stalk.length - 1];
      L.back.push(() => ribbon(ctx, stalk, stemW * 0.45, stemW * 0.3, pal.stem, pal.ink, inkW * 0.8));
      L.front.push(() => (r(9) > 0.5
        ? blossom(ctx, se[0] + Math.cos(ba) * size * 0.2, se[1] + Math.sin(ba) * size * 0.2, ba, size * 0.26, pal.fruit[(v + 1) % pal.fruit.length], pal.light, pal.ink, inkW * 0.8)
        : bud(ctx, se[0], se[1], heading(stalk, stalk.length - 1), size * 0.32, pal.fruit[(v + 2) % pal.fruit.length], pal.leaf, pal.ink, inkW * 0.8)));
    }
  }
}

/** Sprays along an arbitrary stem path: leaves, tendrils and fruiting sprigs on alternate sides. */
export function sprouts(ctx: CanvasRenderingContext2D, path: P[], gap: number, size: number, stemW: number, pal: Palette, inkW: number, seed: number, L: Layers) {
  let acc = gap * 0.5;
  let side = 1;
  let n = 0;
  for (let i = 1; i < path.length - 1; i++) {
    acc += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    if (acc < gap) continue;
    acc = 0;
    side = -side;
    n++;
    const r = (j: number) => hr(seed, n, j);
    const [x, y] = path[i];
    const a = heading(path, i);
    const t = r(1);
    if (t < 0.4) {
      L.back.push(() => leaf(ctx, x, y, a + side * (0.6 + r(2) * 0.4), size * (0.7 + r(3) * 0.3), size * 0.22, pal.leaf, pal.ink, inkW, -side * 0.3));
    } else if (t < 0.6) {
      const td = curl(x, y, a + side * 0.7, size * (0.9 + r(2) * 0.4), side, 6 + r(3) * 2, 30);
      L.back.push(() => ribbon(ctx, td, stemW * 0.45, stemW * 0.12, pal.stem, pal.ink, inkW * 0.8));
    } else {
      const br = curl(x, y, a + side * 0.7, size * (0.8 + r(2) * 0.4), side, 1.2 + r(3), 20);
      const e = br[br.length - 1];
      const ea = heading(br, br.length - 1);
      L.back.push(() => ribbon(ctx, br, stemW * 0.6, stemW * 0.38, pal.stem, pal.ink, inkW));
      const lk = Math.floor(br.length * 0.5);
      L.back.push(() => leaf(ctx, br[lk][0], br[lk][1], heading(br, lk) - side * 0.9, size * 0.55, size * 0.17, pal.leaf, pal.ink, inkW, side * 0.3));
      const kind = [0, 2, 3, 2, 0][Math.floor(r(4) * 5)];
      L.front.push(() => terminal(ctx, kind, e[0], e[1], ea, size * 0.8, pal, inkW, Math.floor(r(5) * 3)));
    }
  }
}

/** A band with slightly wandering hand-stitched edges. */
export function wavyBand(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, fill: string, seed: number, wob = 1.4) {
  const w = x1 - x0;
  const e = (x: number, s: number) => wob * (Math.sin(((x - x0) / w) * Math.PI * 2 * (7 + s) + seed) + 0.5 * Math.sin(((x - x0) / w) * Math.PI * 2 * (19 + s) + seed * 2));
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + e(x0, 0));
  for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, y0 + e(x, 0));
  ctx.lineTo(x1, y1 + e(x1, 3));
  for (let x = x1; x >= x0; x -= 8) ctx.lineTo(x, y1 + e(x, 3));
  ctx.closePath();
  ctx.fill();
}

/** A running stitch line (dashed, with a slight wave). */
export function runningStitch(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, color: string, lw: number, dash: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.setLineDash([dash, dash * 0.6]);
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 6) {
    const yy = y + Math.sin(x * 0.05) * 0.6;
    if (x === x0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
  ctx.restore();
}

/** A row of hanging scallops (a lambrequin), each holding a little bud or trefoil. */
export function scallops(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, size: number, dir: number, fill: string, inner: string, ink: string, inkW: number) {
  const n = Math.max(1, Math.round((x1 - x0) / size));
  const sw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const xa = x0 + i * sw;
    const xb = xa + sw;
    const d = sw * (0.52 + (hr(i, sw, 9) - 0.5) * 0.06);
    const p = new Path2D();
    p.moveTo(xa, y);
    p.bezierCurveTo(xa + sw * 0.02, y + dir * d * 0.95, xb - sw * 0.02, y + dir * d * 0.95, xb, y);
    p.closePath();
    ctx.fillStyle = fill;
    ctx.fill(p);
    ctx.strokeStyle = ink;
    ctx.lineWidth = inkW;
    ctx.stroke(p);
    const cx = (xa + xb) / 2;
    if (i % 2) {
      bud(ctx, cx, y + dir * d * 0.06, (dir * Math.PI) / 2, d * 0.42, inner, fill, ink, inkW * 0.8);
    } else {
      for (const s of [-1, 0, 1]) {
        leaf(ctx, cx, y + dir * d * 0.08, (dir * Math.PI) / 2 + s * 0.6, d * (s ? 0.42 : 0.55), d * 0.13, inner, ink, inkW * 0.8, s * 0.15);
      }
    }
  }
}

/** Fill the bare ground left in a region with small sprigs, lone blossoms and French-knot
 *  clusters, scattered irregularly as a needlewoman fills a field. Reads the canvas to find
 *  space still showing the ground colour. */
export function strew(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  ground: string,
  R: number,
  stemW: number,
  pal: Palette,
  inkW: number,
  seed: number,
) {
  const W = Math.round(x1 - x0);
  const H = Math.round(y1 - y0);
  const img = ctx.getImageData(Math.round(x0), Math.round(y0), W, H).data;
  const g = hex(ground);
  const placed: [number, number, number][] = [];
  const bare = (x: number, y: number) => {
    const ix = Math.round(x - x0);
    const iy = Math.round(y - y0);
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return false;
    const o = (iy * W + ix) * 4;
    return Math.abs(img[o] - g[0]) + Math.abs(img[o + 1] - g[1]) + Math.abs(img[o + 2] - g[2]) < 70;
  };
  const free = (x: number, y: number, r: number) => {
    for (const [px, py, pr] of placed) if (Math.hypot(px - x, py - y) < pr + r) return false;
    if (!bare(x, y)) return false;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      if (!bare(x + Math.cos(a) * r, y + Math.sin(a) * r)) return false;
      if (k % 2 === 0 && !bare(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5)) return false;
    }
    return true;
  };
  const step = R * 0.6;
  let n = 0;
  for (let gy = y0 + R; gy < y1 - R * 0.5; gy += step) {
    for (let gx = x0 + R; gx < x1 - R * 0.5; gx += step) {
      n++;
      const r = (j: number) => hr(seed, n, j);
      const x = gx + (r(1) - 0.5) * step;
      const y = gy + (r(2) - 0.5) * step;
      // try a large sprig, then smaller motifs
      const t = r(3);
      const a = r(4) * Math.PI * 2;
      const v = Math.floor(r(5) * 3);
      if (free(x, y, R)) {
        placed.push([x, y, R * 1.3]);
        const dir = r(6) > 0.5 ? 1 : -1;
        const sx = x - Math.cos(a) * R * 0.75;
        const sy = y - Math.sin(a) * R * 0.75;
        const st = curl(sx, sy, a - dir * 0.6, R * 1.25, dir, 1.4, 16);
        const e = st[st.length - 1];
        ribbon(ctx, st, stemW, stemW * 0.55, pal.stem, pal.ink, inkW);
        for (const [f, sd] of [[0.35, 1], [0.6, -1]] as const) {
          const i = Math.floor(st.length * f);
          leaf(ctx, st[i][0], st[i][1], heading(st, i) + sd * 0.85, R * 0.55, R * 0.17, pal.leaf, pal.ink, inkW, -sd * 0.3);
        }
        const tk = Math.floor(st.length * 0.2);
        ribbon(ctx, curl(st[tk][0], st[tk][1], heading(st, tk) + dir * 0.9, R * 0.6, dir, 6, 20), stemW * 0.5, stemW * 0.12, pal.stem, pal.ink, inkW * 0.8);
        terminal(ctx, t < 0.4 ? 2 : t < 0.7 ? 3 : 0, e[0], e[1], heading(st, st.length - 1), R * 0.62, pal, inkW, v);
      } else if (t > 0.45 && free(x, y, R * 0.42)) {
        placed.push([x, y, R * 1.05]);
        if (t < 1.1) {
          blossom(ctx, x, y, a, R * 0.3, pal.fruit[v % pal.fruit.length] === pal.light ? pal.fruit[(v + 1) % pal.fruit.length] : pal.light, pal.fruit[v % pal.fruit.length], pal.ink, inkW * 0.8);
        } else {
          // a little trefoil of leaves round a French knot
          for (let k = 0; k < 3; k++) leaf(ctx, x, y, a + (k * Math.PI * 2) / 3, R * 0.36, R * 0.12, pal.leaf, pal.ink, inkW * 0.8, 0.2);
          ctx.fillStyle = pal.fruit[v % pal.fruit.length];
          ctx.strokeStyle = pal.ink;
          ctx.lineWidth = inkW * 0.7;
          ctx.beginPath();
          ctx.arc(x, y, R * 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else if (t < 0.18 && free(x, y, R * 0.22)) {
        placed.push([x, y, R * 0.6]);
        // French knots in a loose cluster
        ctx.fillStyle = pal.fruit[v % pal.fruit.length];
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = inkW * 0.6;
        for (let k = 0; k < 3; k++) {
          const ka = a + (k * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(x + Math.cos(ka) * R * 0.09, y + Math.sin(ka) * R * 0.09, R * 0.065, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  }
}
