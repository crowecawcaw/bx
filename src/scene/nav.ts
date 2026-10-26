import { SITE } from '../sites';
import { PLAYER_RADIUS } from './dims';

// Walkable grid over the site, 0.5 cubit cells.
const RES = 0.5;
const { minX: NAV_MIN_X, maxX: NAV_MAX_X, minZ: NAV_MIN_Z, maxZ: NAV_MAX_Z } = SITE.bounds;
const W = Math.round((NAV_MAX_X - NAV_MIN_X) / RES);
const H = Math.round((NAV_MAX_Z - NAV_MIN_Z) / RES);

const N = W * H;
export const LEVELS = SITE.levels ?? 1;
let grids: Uint8Array[] = Array.from({ length: LEVELS }, () => new Uint8Array(N));
/** For each level and cell: the level a stair there leads to, or -1. */
const links: Int8Array[] = Array.from({ length: LEVELS }, () => new Int8Array(N).fill(-1));

const colOf = (x: number) => (x - NAV_MIN_X) / RES - 0.5;
const rowOf = (z: number) => (z - NAV_MIN_Z) / RES - 0.5;
const i0 = (x: number) => Math.max(0, Math.floor(colOf(x)) + 1);
const i1 = (x: number) => Math.min(W - 1, Math.ceil(colOf(x)) - 1);
const j0 = (z: number) => Math.max(0, Math.floor(rowOf(z)) + 1);
const j1 = (z: number) => Math.min(H - 1, Math.ceil(rowOf(z)) - 1);

for (const l of SITE.links ?? []) {
  const [x0, z0, x1, z1] = l.rect;
  for (let j = j0(z0); j <= j1(z1); j++) {
    for (let i = i0(x0); i <= i1(x1); i++) {
      links[l.a][j * W + i] = l.b;
      links[l.b][j * W + i] = l.a;
    }
  }
}

/** Marks every cell whose centre lies within the player's radius of an obstacle. */
export function buildNav(open: Record<string, boolean>) {
  grids = Array.from({ length: LEVELS }, (_, level) => {
    const g = new Uint8Array(N);
    const { rects, circles } = SITE.obstacles(open, level);
    const r = PLAYER_RADIUS;
    for (const q of rects) {
      for (let j = j0(q[1] - r); j <= j1(q[3] + r); j++) g.fill(1, j * W + i0(q[0] - r), j * W + i1(q[2] + r) + 1);
    }
    for (const c of circles) {
      const R = c[2] + r;
      for (let j = j0(c[1] - R); j <= j1(c[1] + R); j++) {
        const z = NAV_MIN_Z + (j + 0.5) * RES;
        for (let i = i0(c[0] - R); i <= i1(c[0] + R); i++) {
          const x = NAV_MIN_X + (i + 0.5) * RES;
          if ((x - c[0]) ** 2 + (z - c[1]) ** 2 < R * R) g[j * W + i] = 1;
        }
      }
    }
    // the edge of the grid
    g.fill(1, 0, W);
    g.fill(1, (H - 1) * W, H * W);
    for (let j = 0; j < H; j++) g[j * W] = g[j * W + W - 1] = 1;
    return g;
  });
}

const cellOf = (x: number, z: number) => [
  Math.min(W - 1, Math.max(0, Math.floor((x - NAV_MIN_X) / RES))),
  Math.min(H - 1, Math.max(0, Math.floor((z - NAV_MIN_Z) / RES))),
];
const centre = (i: number, j: number): [number, number] => [NAV_MIN_X + (i + 0.5) * RES, NAV_MIN_Z + (j + 0.5) * RES];

export function walkable(x: number, z: number, level = 0) {
  const [i, j] = cellOf(x, z);
  return grids[level][j * W + i] === 0;
}

/** The level a stair at (x, z) leads to from `level`, or -1. */
export function linkAt(x: number, z: number, level: number) {
  const [i, j] = cellOf(x, z);
  return links[level][j * W + i];
}

export function heightAt(x: number, z: number, level: number) {
  return SITE.heightAt ? SITE.heightAt(x, z, level) : 0;
}

/**
 * Which level a tapped point belongs to: the highest floor at or just below it that is walkable
 * near there; otherwise the player's own level.
 */
export function levelFor(x: number, y: number, z: number, current: number) {
  let best = -1;
  for (let l = 0; l < LEVELS; l++) {
    if (heightAt(x, z, l) > y + 0.4) continue;
    const near = [0, 1, -1].some((dx) => [0, 1, -1].some((dz) => walkable(x + dx, z + dz, l)));
    if (near) best = l;
  }
  return best < 0 ? current : best;
}

/** True if a straight walk from a to b stays on free cells of one level. */
export function clearLine(ax: number, az: number, bx: number, bz: number, level = 0) {
  const d = Math.hypot(bx - ax, bz - az);
  const n = Math.ceil(d / (RES * 0.5));
  for (let s = 0; s <= n; s++) {
    const t = n ? s / n : 0;
    if (!walkable(ax + (bx - ax) * t, az + (bz - az) * t, level)) return false;
  }
  return true;
}

function nearestFree(grid: Uint8Array, i: number, j: number, fromI: number, fromJ: number): [number, number] | null {
  if (grid[j * W + i] === 0) return [i, j];
  // spiral search, preferring cells closer to the start so a tap on a wall lands on our side
  let best: [number, number] | null = null;
  let bestScore = Infinity;
  for (let rad = 1; rad < 30 && !best; rad++) {
    for (let dj = -rad; dj <= rad; dj++) {
      for (let di = -rad; di <= rad; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue;
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H || grid[nj * W + ni]) continue;
        const score = Math.hypot(di, dj) * 4 + Math.hypot(ni - fromI, nj - fromJ) * 0.05;
        if (score < bestScore) {
          bestScore = score;
          best = [ni, nj];
        }
      }
    }
  }
  return best;
}

/** A waypoint: x, z and the level it is on. */
export type Waypoint = [x: number, z: number, level: number];

/** A* path in world coordinates across levels, string-pulled. Returns null if unreachable. */
export function findPath(sx: number, sz: number, sl: number, tx: number, tz: number, tl: number): Waypoint[] | null {
  let [si, sj] = cellOf(sx, sz);
  const start = nearestFree(grids[sl], si, sj, si, sj);
  if (!start) return null;
  [si, sj] = start;
  const [ti0, tj0] = cellOf(tx, tz);
  const goal = nearestFree(grids[tl], ti0, tj0, si, sj);
  if (!goal) return null;
  const [ti, tj] = goal;
  const goalWorld = grids[tl][tj0 * W + ti0] === 0 ? ([tx, tz] as [number, number]) : centre(ti, tj);

  const M = N * LEVELS;
  const gScore = new Float32Array(M).fill(Infinity);
  const came = new Int32Array(M).fill(-1);
  const closed = new Uint8Array(M);
  const heap: number[] = [];
  const fScore = new Float32Array(M);
  const push = (n: number) => {
    heap.push(n);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (fScore[heap[p]] <= fScore[heap[c]]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        const r = l + 1;
        let m = c;
        if (l < heap.length && fScore[heap[l]] < fScore[heap[m]]) m = l;
        if (r < heap.length && fScore[heap[r]] < fScore[heap[m]]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };
  // levels apart cost at least the walk to a stair; a plain distance keeps the heuristic admissible
  const h = (i: number, j: number) => Math.hypot(i - ti, j - tj);
  const s = sl * N + sj * W + si;
  const goalIdx = tl * N + tj * W + ti;
  gScore[s] = 0;
  fScore[s] = h(si, sj);
  push(s);
  let found = false;
  let closest = s;
  let closestH = Infinity;
  const relax = (cur: number, n: number, cost: number, ni: number, nj: number) => {
    const g = gScore[cur] + cost;
    if (g < gScore[n]) {
      gScore[n] = g;
      came[n] = cur;
      fScore[n] = g + h(ni, nj);
      push(n);
    }
  };
  while (heap.length) {
    const cur = pop();
    if (cur === goalIdx) {
      found = true;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const lv = Math.floor(cur / N);
    const cell = cur - lv * N;
    const ci = cell % W;
    const cj = (cell - ci) / W;
    const hc = h(ci, cj) + (lv === tl ? 0 : 1000);
    if (hc < closestH) {
      closestH = hc;
      closest = cur;
    }
    const grid = grids[lv];
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const n = nj * W + ni;
        if (grid[n] || closed[lv * N + n]) continue;
        if (di && dj && (grid[cj * W + ni] || grid[nj * W + ci])) continue; // no corner cutting
        relax(cur, lv * N + n, di && dj ? Math.SQRT2 : 1, ni, nj);
      }
    }
    // a stair: step onto the same spot on the other level
    const other = links[lv][cell];
    if (other >= 0 && !grids[other][cell] && !closed[other * N + cell]) relax(cur, other * N + cell, 0.01, ci, cj);
  }
  // unreachable (e.g. behind a closed door): walk as close as we can get
  const end = found ? goalIdx : closest;
  if (end === s) return null;
  const cells: Waypoint[] = [];
  for (let c = end; c !== -1; c = came[c]) {
    const lv = Math.floor(c / N);
    const cell = c - lv * N;
    const ci = cell % W;
    cells.push([...centre(ci, (cell - ci) / W), lv]);
  }
  cells.reverse();
  if (found) cells[cells.length - 1] = [goalWorld[0], goalWorld[1], tl];
  // string pulling, never across a change of level
  const out: Waypoint[] = [];
  let anchor: Waypoint = [sx, sz, sl];
  let k = 0;
  while (k < cells.length - 1) {
    let far = k + 1;
    for (let m = k + 2; m < cells.length; m++) {
      const c = cells[m];
      if (c[2] !== anchor[2] || cells[m - 1][2] !== anchor[2] || !clearLine(anchor[0], anchor[1], c[0], c[1], c[2])) break;
      far = m;
    }
    out.push(cells[far]);
    anchor = cells[far];
    k = far;
  }
  if (!out.length) out.push(cells[cells.length - 1]);
  return out;
}
