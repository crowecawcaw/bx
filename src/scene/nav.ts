import { COURT, PLAYER_RADIUS, POS, TENT } from './dims';
import type { CurtainId } from '../store';

// Walkable grid over the camp area, 0.5 cubit cells.
const RES = 0.5;
export const NAV_MIN_X = -75;
export const NAV_MAX_X = 80;
export const NAV_MIN_Z = -50;
export const NAV_MAX_Z = 50;
const W = Math.round((NAV_MAX_X - NAV_MIN_X) / RES);
const H = Math.round((NAV_MAX_Z - NAV_MIN_Z) / RES);

type Rect = [minX: number, minZ: number, maxX: number, maxZ: number];
type Circle = [x: number, z: number, r: number];

function staticObstacles(): { rects: Rect[]; circles: Circle[] } {
  const t = 0.15;
  const { minX, maxX, minZ, maxZ, gateWidth } = COURT;
  const g = gateWidth / 2;
  const rects: Rect[] = [
    // court hangings
    [minX - t, minZ - t, maxX + t, minZ + t],
    [minX - t, maxZ - t, maxX + t, maxZ + t],
    [minX - t, minZ, minX + t, maxZ],
    [maxX - t, minZ, maxX + t, -g],
    [maxX - t, g, maxX + t, maxZ],
    // tent walls, including the coverings that reach the ground outside
    [TENT.backX - 1.6, -TENT.halfWidth - 1.6, TENT.frontX + 0.2, -TENT.halfWidth],
    [TENT.backX - 1.6, TENT.halfWidth, TENT.frontX + 0.2, TENT.halfWidth + 1.6],
    [TENT.backX - 1.6, -TENT.halfWidth - 1.6, TENT.backX, TENT.halfWidth + 1.6],
    // furniture (with poles)
    [POS.ark[0] - 4.6, POS.ark[1] - 1.45, POS.ark[0] + 4.6, POS.ark[1] + 1.45],
    [POS.incense[0] - 1.1, -0.6, POS.incense[0] + 1.1, 0.6],
    [POS.table[0] - 2, POS.table[1] - 0.6, POS.table[0] + 2, POS.table[1] + 0.6],
    [POS.menorah[0] - 0.5, POS.menorah[1] - 1.3, POS.menorah[0] + 0.5, POS.menorah[1] + 1.3],
    [POS.altar[0] - 4.1, -3.1, POS.altar[0] + 4.1, 3.1],
    [POS.altar[0] + 3, 3, POS.altar[0] + 4.4, 4.4], // utensils
  ];
  const circles: Circle[] = [[POS.laver[0], POS.laver[1], 1.5]];
  // door and veil pillars
  for (const z of DOOR_PILLARS_Z) circles.push([DOOR_PILLAR_X, z, 0.15]);
  for (const z of VEIL_PILLARS_Z) circles.push([VEIL_PILLAR_X, z, 0.12]);
  return { rects, circles };
}

export const DOOR_PILLARS_Z = [-4.75, -2.375, 0, 2.375, 4.75];
export const DOOR_PILLAR_X = TENT.frontX + 0.3;
export const DOOR_SCREEN_X = TENT.frontX + 0.62;
export const VEIL_PILLAR_X = TENT.veilX - 0.25;
export const VEIL_PILLARS_Z = [-3.75, -1.25, 1.25, 3.75];

function curtainRect(id: CurtainId): Rect {
  if (id === 'gate') return [COURT.maxX - 0.15, -COURT.gateWidth / 2, COURT.maxX + 0.15, COURT.gateWidth / 2];
  if (id === 'door') return [DOOR_PILLAR_X, -TENT.halfWidth, DOOR_SCREEN_X + 0.1, TENT.halfWidth];
  return [TENT.veilX - 0.1, -TENT.halfWidth, TENT.veilX + 0.15, TENT.halfWidth];
}

let grid = new Uint8Array(W * H);

export function buildNav(open: Record<CurtainId, boolean>) {
  const g = new Uint8Array(W * H);
  const { rects, circles } = staticObstacles();
  for (const id of ['gate', 'door', 'veil'] as CurtainId[]) if (!open[id]) rects.push(curtainRect(id));
  const r = PLAYER_RADIUS;
  for (let j = 0; j < H; j++) {
    const z = NAV_MIN_Z + (j + 0.5) * RES;
    for (let i = 0; i < W; i++) {
      const x = NAV_MIN_X + (i + 0.5) * RES;
      let blocked = i === 0 || j === 0 || i === W - 1 || j === H - 1;
      for (let k = 0; !blocked && k < rects.length; k++) {
        const q = rects[k];
        blocked = x > q[0] - r && x < q[2] + r && z > q[1] - r && z < q[3] + r;
      }
      for (let k = 0; !blocked && k < circles.length; k++) {
        const c = circles[k];
        blocked = (x - c[0]) ** 2 + (z - c[1]) ** 2 < (c[2] + r) ** 2;
      }
      g[j * W + i] = blocked ? 1 : 0;
    }
  }
  grid = g;
}

const cellOf = (x: number, z: number) => [
  Math.min(W - 1, Math.max(0, Math.floor((x - NAV_MIN_X) / RES))),
  Math.min(H - 1, Math.max(0, Math.floor((z - NAV_MIN_Z) / RES))),
];
const centre = (i: number, j: number): [number, number] => [NAV_MIN_X + (i + 0.5) * RES, NAV_MIN_Z + (j + 0.5) * RES];

export function walkable(x: number, z: number) {
  const [i, j] = cellOf(x, z);
  return grid[j * W + i] === 0;
}

/** True if a straight walk from a to b stays on free cells. */
export function clearLine(ax: number, az: number, bx: number, bz: number) {
  const d = Math.hypot(bx - ax, bz - az);
  const n = Math.ceil(d / (RES * 0.5));
  for (let s = 0; s <= n; s++) {
    const t = n ? s / n : 0;
    if (!walkable(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
  }
  return true;
}

function nearestFree(i: number, j: number, fromI: number, fromJ: number): [number, number] | null {
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

/** A* path in world coordinates, string-pulled. Returns null if unreachable. */
export function findPath(sx: number, sz: number, tx: number, tz: number): [number, number][] | null {
  let [si, sj] = cellOf(sx, sz);
  const start = nearestFree(si, sj, si, sj);
  if (!start) return null;
  [si, sj] = start;
  const [ti0, tj0] = cellOf(tx, tz);
  const goal = nearestFree(ti0, tj0, si, sj);
  if (!goal) return null;
  const [ti, tj] = goal;
  const goalWorld = grid[tj0 * W + ti0] === 0 ? ([tx, tz] as [number, number]) : centre(ti, tj);

  const N = W * H;
  const gScore = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap: number[] = [];
  const fScore = new Float32Array(N);
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
  const h = (i: number, j: number) => Math.hypot(i - ti, j - tj);
  const s = sj * W + si;
  const goalIdx = tj * W + ti;
  gScore[s] = 0;
  fScore[s] = h(si, sj);
  push(s);
  let found = false;
  let closest = s;
  let closestH = h(si, sj);
  while (heap.length) {
    const cur = pop();
    if (cur === goalIdx) {
      found = true;
      break;
    }
    const hi = cur % W;
    const hc = h(hi, (cur - hi) / W);
    if (hc < closestH) {
      closestH = hc;
      closest = cur;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = cur % W;
    const cj = (cur - ci) / W;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const n = nj * W + ni;
        if (grid[n] || closed[n]) continue;
        if (di && dj && (grid[cj * W + ni] || grid[nj * W + ci])) continue; // no corner cutting
        const g = gScore[cur] + (di && dj ? Math.SQRT2 : 1);
        if (g < gScore[n]) {
          gScore[n] = g;
          came[n] = cur;
          fScore[n] = g + h(ni, nj);
          push(n);
        }
      }
    }
  }
  // unreachable (e.g. behind a closed curtain): walk as close as we can get
  const end = found ? goalIdx : closest;
  if (end === s) return null;
  const cells: [number, number][] = [];
  for (let c = end; c !== -1; c = came[c]) {
    const ci = c % W;
    cells.push(centre(ci, (c - ci) / W));
  }
  cells.reverse();
  if (found) cells[cells.length - 1] = goalWorld;
  // string pulling
  const out: [number, number][] = [];
  let anchor: [number, number] = [sx, sz];
  let k = 0;
  while (k < cells.length - 1) {
    let far = k + 1;
    for (let m = k + 2; m < cells.length; m++) {
      if (!clearLine(anchor[0], anchor[1], cells[m][0], cells[m][1])) break;
      far = m;
    }
    out.push(cells[far]);
    anchor = cells[far];
    k = far;
  }
  if (!out.length) out.push(cells[cells.length - 1]);
  return out;
}
