import { FEATURES, GENERAL } from '../data/specs';
import {
  COURT,
  DOOR_PILLAR_X,
  DOOR_PILLARS_Z,
  DOOR_SCREEN_X,
  POS,
  REGION_LABEL,
  START,
  TENT,
  VEIL_PILLAR_X,
  VEIL_PILLARS_Z,
  regionOf,
} from '../scene/dims';
import type { Circle, Rect, SiteDef } from './types';

function curtainRect(id: string): Rect {
  if (id === 'gate') return [COURT.maxX - 0.15, -COURT.gateWidth / 2, COURT.maxX + 0.15, COURT.gateWidth / 2];
  if (id === 'door') return [DOOR_PILLAR_X, -TENT.halfWidth, DOOR_SCREEN_X + 0.1, TENT.halfWidth];
  return [TENT.veilX - 0.1, -TENT.halfWidth, TENT.veilX + 0.15, TENT.halfWidth];
}

function obstacles(open: Record<string, boolean>) {
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
  for (const z of DOOR_PILLARS_Z) circles.push([DOOR_PILLAR_X, z, 0.15]);
  for (const z of VEIL_PILLARS_Z) circles.push([VEIL_PILLAR_X, z, 0.12]);
  for (const id of ['gate', 'door', 'veil']) if (!open[id]) rects.push(curtainRect(id));
  return { rects, circles };
}

export const TABERNACLE: SiteDef = {
  id: 'tabernacle',
  title: 'The Tabernacle',
  features: FEATURES,
  general: GENERAL,
  specsIntro:
    'Every requirement from the building instructions (Exodus 25–40, with Leviticus 24 and Hebrews 9), and where each one appears in this model.',
  regionOf,
  regionLabel: REGION_LABEL,
  start: START,
  bounds: { minX: -75, maxX: 80, minZ: -50, maxZ: 50 },
  curtains: ['gate', 'door', 'veil'],
  reach: 14,
  obstacles,
  scripture: 'Exodus 25:8-9',
  layers: true,
};
