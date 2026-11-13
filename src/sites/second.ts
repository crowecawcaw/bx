import { SECOND_FEATURES, SECOND_GENERAL } from '../data/secondSpecs';
import {
  ALTAR,
  AZARAH,
  COLUMN_R,
  GATE,
  HEKAL_DOOR,
  HOUSE,
  LAVER,
  MOUNT,
  PORCH_DOOR,
  POS,
  RAMP,
  REGION_LABEL,
  SOREG,
  SOREG_GAPS_X,
  START,
  STEPS,
  WOMEN,
  WOMEN_SIDE_X,
  columns,
  heightAt,
  regionOf,
} from '../second/dims';
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

const BOUNDS = { minX: MOUNT.minX - 4, maxX: MOUNT.maxX + 4, minZ: MOUNT.minZ - 4, maxZ: MOUNT.maxZ + 4 };
const COLUMNS = columns();

function obstacles(open: Record<string, boolean>) {
  const t = 1;
  const { minX, maxX, minZ, maxZ } = MOUNT;
  const rects: Rect[] = [
    // the mount's walls
    [minX - t, minZ - t, maxX + t, minZ + t],
    [minX - t, maxZ - t, maxX + t, maxZ + t],
    [minX - t, minZ, minX + t, maxZ],
    [maxX - t, minZ, maxX + t, maxZ],
  ];
  // the soreg, open where the ways go in (Middot 2:3)
  const sg = SOREG_GAPS_X.map((x): [number, number] => [x - 6, x + 6]);
  const s = 0.2;
  rects.push(...run('x', SOREG.minX, SOREG.maxX, -SOREG.half - s, -SOREG.half + s, sg));
  rects.push(...run('x', SOREG.minX, SOREG.maxX, SOREG.half - s, SOREG.half + s, sg));
  rects.push([SOREG.minX - s, -SOREG.half, SOREG.minX + s, SOREG.half]);
  rects.push(...run('z', -SOREG.half, SOREG.half, SOREG.maxX - s, SOREG.maxX + s, [[-8, 8]]));

  // the court's walls: shut all round but for the Nicanor gate
  const A = AZARAH;
  const aw = A.wall;
  rects.push([A.minX - aw, -A.half - aw, A.maxX + aw, -A.half]);
  rects.push([A.minX - aw, A.half, A.maxX + aw, A.half + aw]);
  rects.push([A.minX - aw, -A.half, A.minX, A.half]);
  rects.push(...run('z', -A.half, A.half, A.maxX, A.maxX + aw, [[-GATE.half, GATE.half]]));
  if (!open.nicanor) rects.push([A.maxX + aw - 0.6, -GATE.half, A.maxX + aw, GATE.half]);

  // the Court of the Women: gates east (the Beautiful gate), north and south
  const W = WOMEN;
  const ww = W.wall;
  const side: [number, number][] = [[WOMEN_SIDE_X - GATE.half, WOMEN_SIDE_X + GATE.half]];
  rects.push(...run('x', W.minX, W.maxX + ww, -W.half - ww, -W.half, side));
  rects.push(...run('x', W.minX, W.maxX + ww, W.half, W.half + ww, side));
  rects.push(...run('z', -W.half, W.half, W.maxX, W.maxX + ww, [[-GATE.half, GATE.half]]));
  // its four chambers in the corners (Middot 2:5)
  for (const sx of [W.minX, W.maxX - W.corner]) {
    for (const sz of [-W.half, W.half - W.corner]) rects.push([sx - 0.3, sz - 0.3, sx + W.corner + 0.3, sz + W.corner + 0.3]);
  }
  // the treasury chests along the walls (Mark 12:41)
  for (const z of [-1, 1]) rects.push([W.minX + 44, z * (W.half - 1.6) - 0.8, W.maxX - 44, z * (W.half - 1.6) + 0.8]);

  // the house: solid but for the porch, the hekal and the Holy of Holies
  const H = HOUSE;
  rects.push(...run('z', -H.porch, H.porch, H.porchIn, H.frontX, [[-PORCH_DOOR.half, PORCH_DOOR.half]]));
  rects.push([H.porchBack, -H.porch, H.frontX, -H.porchInner]);
  rects.push([H.porchBack, H.porchInner, H.frontX, H.porch]);
  rects.push(...run('z', -H.porchInner, H.porchInner, H.hekalX, H.porchBack, [[-HEKAL_DOOR.half, HEKAL_DOOR.half]]));
  if (!open.doors) rects.push([H.porchBack - 0.6, -HEKAL_DOOR.half, H.porchBack, HEKAL_DOOR.half]);
  rects.push([H.backX, -H.body, H.hekalX, -H.inner]);
  rects.push([H.backX, H.inner, H.hekalX, H.body]);
  rects.push([H.backX, -H.inner, H.holiestX, H.inner]);
  if (!open.veil) rects.push([H.veilWest - 0.3, -H.inner, H.veilEast + 0.3, H.inner]);
  // the steps' cheek walls, and the foundation either side of them
  rects.push([H.frontX, -H.porch, STEPS.run, -STEPS.half]);
  rects.push([H.frontX, STEPS.half, STEPS.run, H.porch]);
  // in the hekal: the table, the lampstand and the golden altar
  rects.push([POS.table[0] - 1.3, POS.table[1] - 0.8, POS.table[0] + 1.3, POS.table[1] + 0.8]);
  rects.push([POS.menorah[0] - 0.6, POS.menorah[1] - 1.4, POS.menorah[0] + 0.6, POS.menorah[1] + 1.4]);
  rects.push([POS.incense[0] - 0.8, POS.incense[1] - 0.8, POS.incense[0] + 0.8, POS.incense[1] + 0.8]);

  // the altar, and the kerbs of its ramp, open at the foot
  rects.push([ALTAR.minX - 0.3, -ALTAR.half - 0.3, ALTAR.maxX + 0.3, ALTAR.half + 0.3]);
  rects.push([RAMP.minX - 0.4, RAMP.z0, RAMP.minX, RAMP.z1 - 3]);
  rects.push([RAMP.maxX, RAMP.z0, RAMP.maxX + 0.4, RAMP.z1 - 3]);
  // tables of the place of slaughtering
  for (const x of POS.tablesX) rects.push([x - 1.5, POS.tablesZ - 1, x + 1.5, POS.tablesZ + 1]);

  const circles: Circle[] = [[LAVER.x, LAVER.z, LAVER.r + 0.4], [POS.stone[0], POS.stone[1], 2.2]];
  for (const x of POS.pillarsX) for (const z of POS.pillarsZ) circles.push([x, z, 0.8]);
  for (const [x, z] of COLUMNS) circles.push([x, z, COLUMN_R + 0.1]);
  return { rects, circles };
}

export const SECOND: SiteDef = {
  id: 'second',
  title: 'The Second Temple',
  features: SECOND_FEATURES,
  general: SECOND_GENERAL,
  specsIntro:
    'What Scripture says about the house rebuilt after the exile (Ezra, Haggai) and the temple Herod enlarged, where Jesus taught and the apostles preached (the Gospels and Acts). Scripture gives few measurements for it; the model follows the Mishnah (Middot) and Josephus, and each info panel says so.',
  specsTitle: 'Scripture details',
  reqHeading: 'What Scripture says',
  regionOf,
  regionLabel: REGION_LABEL,
  start: START,
  bounds: BOUNDS,
  curtains: ['nicanor', 'doors', 'veil'],
  reach: 20,
  obstacles,
  heightAt: (x, z) => heightAt(x, z),
  scripture: 'John 2:13-21',
  layers: false,
};
