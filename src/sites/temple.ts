import { TEMPLE_FEATURES, TEMPLE_GENERAL } from '../data/templeSpecs';
import {
  ALTAR,
  CHAMBER_BACK,
  CHAMBER_OUT,
  DOOR,
  GREAT,
  HOUSE,
  INNER,
  ORACLE_DOOR,
  OUT,
  PILLAR,
  PORCH,
  POS,
  RAMP,
  REGION_LABEL,
  SEA,
  START,
  regionOf,
} from '../temple/dims';
import type { Circle, Rect, SiteDef } from './types';

/** Four walls of a court, leaving a gateway of half-width `gate` in the east wall. */
function courtWalls(c: typeof INNER): Rect[] {
  const t = c.wall / 2;
  return [
    [c.minX - t, c.minZ - t, c.maxX + t, c.minZ + t],
    [c.minX - t, c.maxZ - t, c.maxX + t, c.maxZ + t],
    [c.minX - t, c.minZ, c.minX + t, c.maxZ],
    [c.maxX - t, c.minZ, c.maxX + t, -c.gate],
    [c.maxX - t, c.gate, c.maxX + t, c.maxZ],
  ];
}

/** The stone piers either side of a court's gateway. */
function gatePiers(c: typeof INNER): Rect[] {
  const t = c.wall / 2 + 1;
  return [
    [c.maxX - t, c.gate, c.maxX + t, c.gate + 2],
    [c.maxX - t, -c.gate - 2, c.maxX + t, -c.gate],
  ];
}

function obstacles(open: Record<string, boolean>) {
  const { halfWidth: hw, frontX, partitionX, partition } = HOUSE;
  const p0 = partitionX - partition / 2;
  const p1 = partitionX + partition / 2;
  const rects: Rect[] = [
    ...courtWalls(GREAT),
    ...courtWalls(INNER),
    ...gatePiers(GREAT),
    ...gatePiers(INNER),
    // the house walls with the chambers against them (1 Kgs 6:5)
    [CHAMBER_BACK, hw, OUT, CHAMBER_OUT],
    [CHAMBER_BACK, -CHAMBER_OUT, OUT, -hw],
    [CHAMBER_BACK, -CHAMBER_OUT, HOUSE.oracleX, CHAMBER_OUT],
    // east wall of the house, either side of the door
    [frontX, -hw, PORCH.backX, -DOOR.half],
    [frontX, DOOR.half, PORCH.backX, hw],
    // porch side walls
    [PORCH.backX, hw, PORCH.faceX, OUT],
    [PORCH.backX, -OUT, PORCH.faceX, -hw],
    // the cedar partition before the oracle, either side of its doors
    [p0, -hw, p1, -ORACLE_DOOR.half],
    [p0, ORACLE_DOOR.half, p1, hw],
    // furniture of the holy place
    [POS.incense[0] - 1.3, -0.7, POS.incense[0] + 1.3, 0.7],
    // the ark and its drawn-out staves (1 Kgs 8:8)
    [POS.ark[0] - 4.6, POS.ark[1] - 1.45, POS.ark[0] + 4.6, POS.ark[1] + 1.45],
    // the court: altar and its ramp, bases
    [POS.altar[0] - ALTAR.size / 2 - 0.4, -ALTAR.size / 2 - 0.4, POS.altar[0] + ALTAR.size / 2 + 0.4, ALTAR.size / 2 + 0.4],
    [RAMP.minX, ALTAR.size / 2, RAMP.maxX, ALTAR.size / 2 + RAMP.length],
  ];
  for (const x of POS.lampX) {
    for (const s of [1, -1]) {
      rects.push([x - 1.15, s * POS.lampZ - 0.45, x + 1.15, s * POS.lampZ + 0.45]);
      rects.push([x - 1.75, s * POS.tableZ - 0.65, x + 1.75, s * POS.tableZ + 0.65]);
    }
  }
  for (const x of POS.basesX) for (const s of [1, -1]) rects.push([x - 2.3, s * POS.basesZ - 2.3, x + 2.3, s * POS.basesZ + 2.3]);

  // things that open: closed, they block the way; open, their leaves stand out from the wall
  if (!open.gate) rects.push([INNER.maxX - INNER.wall / 2 - 0.4, -INNER.gate, INNER.maxX + INNER.wall / 2, INNER.gate]);
  else for (const s of [1, -1]) rects.push([INNER.maxX - INNER.wall / 2 - INNER.gate, s * INNER.gate - 0.5, INNER.maxX - INNER.wall / 2, s * INNER.gate + 0.5]);
  if (!open.doors) rects.push([frontX - 0.4, -DOOR.half, PORCH.backX, DOOR.half]);
  else for (const s of [1, -1]) rects.push([frontX - DOOR.half / 2 - 0.3, s * DOOR.half - 0.35, frontX, s * DOOR.half + 0.35]);
  if (!open.oracleDoors) rects.push([p0, -ORACLE_DOOR.half, p1 + 0.3, ORACLE_DOOR.half]);
  else for (const s of [1, -1]) rects.push([p1, s * ORACLE_DOOR.half - 0.35, p1 + ORACLE_DOOR.half + 0.2, s * ORACLE_DOOR.half + 0.35]);
  if (!open.veil) rects.push([p0 - 0.9, -ORACLE_DOOR.half - 0.3, p0 - 0.2, ORACLE_DOOR.half + 0.3]);

  const circles: Circle[] = [
    [PILLAR.x, PILLAR.z, PILLAR.radius + 0.1],
    [PILLAR.x, -PILLAR.z, PILLAR.radius + 0.1],
    [POS.sea[0], POS.sea[1], SEA.radius + 1.8],
    [POS.ark[0], POS.cherubZ, 1.5],
    [POS.ark[0], -POS.cherubZ, 1.5],
  ];
  return { rects, circles };
}

export const TEMPLE: SiteDef = {
  id: 'temple',
  title: "Solomon's Temple",
  features: TEMPLE_FEATURES,
  general: TEMPLE_GENERAL,
  specsIntro:
    'Every measurement and furnishing given for the house Solomon built (1 Kings 6–8, 2 Chronicles 3–5), with the parallel accounts, and where each appears in this model.',
  regionOf,
  regionLabel: REGION_LABEL,
  start: START,
  bounds: { minX: GREAT.minX - 5, maxX: GREAT.maxX + 5, minZ: GREAT.minZ - 5, maxZ: GREAT.maxZ + 5 },
  curtains: ['gate', 'doors', 'oracleDoors', 'veil'],
  reach: 18,
  obstacles,
  scripture: '1 Kings 6:1-14',
  layers: false,
};
