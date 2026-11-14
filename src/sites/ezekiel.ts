import { tableRects } from '../ezekiel/Courts';
import {
  ALTAR,
  ALTAR_STAIRS,
  BOUNDS,
  BUILDING,
  GATE,
  GATE_PARTS,
  GATES,
  HOUSE,
  INNER,
  KITCHEN,
  OUTER_CHAMBER,
  PILLAR,
  PILLARS,
  PRIESTS,
  PRIESTS_KITCHEN,
  REGION_LABEL,
  SEPARATE,
  SINGERS,
  START,
  STEPS,
  WALL,
  WOOD_ALTAR,
  gateRect,
  heightAt,
  regionOf,
} from '../ezekiel/dims';
import { EZEKIEL_FEATURES, EZEKIEL_GENERAL } from '../data/ezekielSpecs';
import type { Circle, Rect, SiteDef } from './types';

/** A wall along x (at z0..z1) or z, from a to b, with gaps [c0, c1] cut out of it. */
function run(axis: 'x' | 'z', a: number, b: number, t0: number, t1: number, gaps: [number, number][] = []): Rect[] {
  const cuts = [...gaps].sort((p, q) => p[0] - q[0]);
  const out: Rect[] = [];
  let s = a;
  for (const [g0, g1] of cuts) {
    if (g0 > s) out.push(axis === 'x' ? [s, t0, g0, t1] : [t0, s, t1, g0]);
    s = Math.max(s, g1);
  }
  if (s < b) out.push(axis === 'x' ? [s, t0, b, t1] : [t0, s, t1, b]);
  return out;
}

const TABLES = tableRects();

function obstacles(open: Record<string, boolean>) {
  const rects: Rect[] = [];
  const circles: Circle[] = [];
  const W = WALL.half;
  const t = WALL.t;
  const gap: [number, number][] = [[-GATE.half, GATE.half]];

  // the wall round about, open where the gates are (the east gate is shut by its doors)
  rects.push(...run('x', -W, W, -W, -W + t, gap));
  rects.push(...run('x', -W, W, W - t, W, gap));
  rects.push([-W, -W, -W + t, W]);
  rects.push(...run('z', -W, W, W - t, W, gap));

  // the gates: the walls of their thresholds, chambers, porches and posts
  for (const g of GATES) {
    const P = GATE_PARTS[g.kind];
    const both = (u0: number, u1: number, v0: number, v1: number) => {
      rects.push(gateRect(g, u0, u1, v0, v1), gateRect(g, u0, u1, -v1, -v0));
    };
    both(P.threshold1[0], P.threshold1[1], GATE.entry, GATE.half);
    both(P.threshold2[0], P.threshold2[1], GATE.entry, GATE.half);
    both(P.chambers[0], P.chambers[1], GATE.passage, GATE.half);
    both(P.porch[0], P.porch[1], GATE.porch, GATE.half);
    both(P.posts[0], P.posts[1], GATE.mouth, GATE.half);
    // the sides of the steps
    both(-g.steps.run, 0, GATE.stepsHalf, GATE.stepsHalf + 0.6);
    if (g.id === 'outerEast') {
      const u = (P.threshold1[0] + P.threshold1[1]) / 2;
      rects.push(gateRect(g, u - 0.4, u + 0.4, -GATE.entry, GATE.entry));
    }
    if (g.id === 'innerEast' && !open.sabbath) {
      const u = (P.threshold2[0] + P.threshold2[1]) / 2;
      rects.push(gateRect(g, u - 0.4, u + 0.4, -GATE.entry, GATE.entry));
    }
  }

  // thirty chambers on the pavement
  const C = OUTER_CHAMBER;
  const inner = W - t;
  for (const [a, b] of C.spans) {
    for (const s of [1, -1]) {
      const [x0, x1] = s > 0 ? [a, b] : [-b, -a];
      rects.push([x0, -inner, x1, -inner + C.depth], [x0, inner - C.depth, x1, inner], [inner - C.depth, x0, inner, x1]);
    }
  }
  // the kitchens in the corners: their two inner walls, a door in each
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const xIn = sx * (inner - KITCHEN.long);
      const zIn = sz * (inner - KITCHEN.broad);
      const [xa, xb] = sx > 0 ? [xIn, inner] : [-inner, xIn];
      const [za, zb] = sz > 0 ? [zIn, inner] : [-inner, zIn];
      const dx = (xa + xb) / 2;
      rects.push(...run('x', xa - 0.5, xb, zIn - 0.5, zIn + 0.5, [[dx - 3, dx + 3]]));
      rects.push([xIn - 0.5, za, xIn + 0.5, zb]);
      // the hearths along the outer walls
      rects.push(sz > 0 ? [xa, inner - 3, xb, inner] : [xa, -inner, xb, -inner + 3]);
      rects.push(sx > 0 ? [inner - 3, za, inner, zb] : [-inner, za, -inner + 3, zb]);
    }
  }

  // the edges of the raised inner court and separate place: the inner court's wall, the parapet
  rects.push(...run('x', -INNER.half, INNER.half + INNER.wall, -INNER.half - INNER.wall, -INNER.half, gap));
  rects.push(...run('x', -INNER.half, INNER.half + INNER.wall, INNER.half, INNER.half + INNER.wall, gap));
  rects.push(...run('z', -INNER.half, INNER.half, INNER.half, INNER.half + INNER.wall, gap));
  rects.push([SEPARATE.minX, -SEPARATE.half - 1, SEPARATE.maxX, -SEPARATE.half]);
  rects.push([SEPARATE.minX, SEPARATE.half, SEPARATE.maxX, SEPARATE.half + 1]);
  // the inner court's chambers by the north and south gates
  rects.push([SINGERS.minX, -INNER.half, SINGERS.maxX, -INNER.half + SINGERS.depth]);
  rects.push([SINGERS.minX, INNER.half - SINGERS.depth, SINGERS.maxX, INNER.half]);
  // the terrace's face below, toward the outer court, round the inner gates' raised floors
  rects.push(...run('x', -INNER.half, INNER.half + INNER.wall, -INNER.half - INNER.wall - 0.5, -INNER.half - INNER.wall, gap));
  rects.push(...run('x', -INNER.half, INNER.half + INNER.wall, INNER.half + INNER.wall, INNER.half + INNER.wall + 0.5, gap));

  // the building at the west
  rects.push([BUILDING.minX, -BUILDING.half, BUILDING.maxX, BUILDING.half]);

  // the priests' chambers and their kitchens
  const P = PRIESTS;
  for (const s of [1, -1]) {
    const zz = (a: number, b: number): [number, number] => (s > 0 ? [a, b] : [-b, -a]);
    const [i0, i1] = zz(P.innerRow[0] - 2, P.innerRow[1]);
    rects.push([P.minX, i0, P.maxX, i1]);
    const [o0, o1] = zz(P.outerRow[0], P.outerRow[1]);
    rects.push([P.outerMinX, o0, P.maxX, o1]);
    const [w0, w1] = zz(P.outerRow[1] - 1, P.outerRow[1]);
    rects.push([P.minX, w0, P.outerMinX, w1]);
    const K = PRIESTS_KITCHEN;
    const [k0, k1] = zz(K.z0, K.z1);
    const mid = (k0 + k1) / 2;
    const [n0, n1] = zz(K.z1 - 1, K.z1);
    rects.push([K.minX, n0, K.maxX, n1]);
    rects.push([K.minX, k0, K.minX + 1, mid - 2.5], [K.minX, mid + 2.5, K.minX + 1, k1]);
    const [h0, h1] = zz(K.z0, K.z0 + 3);
    rects.push([K.minX + 1, h0, K.maxX, h1]);
  }

  // the house: solid but for the porch, the temple and the most holy place
  const H = HOUSE;
  rects.push([H.back - 1, -H.platform, H.front, -H.inner]);
  rects.push([H.back - 1, H.inner, H.front, H.platform]);
  rects.push([H.back - 1, -H.inner, H.holiestBack, H.inner]);
  rects.push(...run('z', -H.inner, H.inner, H.holiestX, H.partition, [[-H.holiestDoor, H.holiestDoor]]));
  if (!open.holiest) rects.push([H.holiestX, -H.holiestDoor, H.holiestX + 0.6, H.holiestDoor]);
  rects.push(...run('z', -H.inner, H.inner, H.holyX, H.porchBack, [[-H.door, H.door]]));
  if (!open.doors) rects.push([H.holyX, -H.door, H.holyX + 0.6, H.door]);
  rects.push(...run('z', -H.inner, H.inner, H.porchIn, H.front, [[-H.porchDoor, H.porchDoor]]));
  // the platform's edge beside the steps
  rects.push([H.front, -H.platform, STEPS.x1, -STEPS.half - 1], [H.front, STEPS.half + 1, STEPS.x1, H.platform]);
  rects.push([H.front - 0.5, -H.platform, H.front, -STEPS.half - 1], [H.front - 0.5, STEPS.half + 1, H.front, H.platform]);
  rects.push([WOOD_ALTAR.x - WOOD_ALTAR.half, -WOOD_ALTAR.half, WOOD_ALTAR.x + WOOD_ALTAR.half, WOOD_ALTAR.half]);
  for (const [x, z] of PILLARS) circles.push([x, z, PILLAR.r * 1.3]);

  // the altar and its stairs
  rects.push([-ALTAR.base, -ALTAR.base, ALTAR.base, ALTAR.base]);
  rects.push([ALTAR_STAIRS.x0, -ALTAR_STAIRS.half - 0.5, ALTAR_STAIRS.x1, ALTAR_STAIRS.half + 0.5]);
  // the tables at the north gate
  rects.push(...TABLES);
  return { rects, circles };
}

export const EZEKIEL: SiteDef = {
  id: 'ezekiel',
  title: 'Ezekiel’s Temple',
  features: EZEKIEL_FEATURES,
  general: EZEKIEL_GENERAL,
  specsIntro:
    'The house Ezekiel saw in a vision in the 25th year of the exile, 14 years after Solomon’s house was burned (Ezekiel 40–48). Scripture measures it in more detail than any other sanctuary, but it was never built, and readers differ on whether it is a plan to build, a picture of things to come, or both.',
  specsTitle: 'Scripture details',
  reqHeading: 'What Scripture says',
  regionOf,
  regionLabel: REGION_LABEL,
  start: START,
  bounds: BOUNDS,
  curtains: ['sabbath', 'doors', 'holiest'],
  reach: 20,
  obstacles,
  heightAt: (x, z) => heightAt(x, z),
  scripture: 'Ezekiel 40:1-5',
  layers: false,
};
