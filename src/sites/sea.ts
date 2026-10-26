import { SEA_FEATURES, SEA_GENERAL } from '../data/seaSpecs';
import { REGION_LABEL, START, WALK_HALF, groundH, regionOf } from '../sea/dims';
import type { Rect, SiteDef } from './types';

const MIN_X = -95;
const MAX_X = 1060;

export const SEA: SiteDef = {
  id: 'sea',
  title: 'The Red Sea',
  features: SEA_FEATURES,
  general: SEA_GENERAL,
  specsIntro:
    'What Scripture says about the crossing of the Red Sea (Exodus 12–15, with Psalms 77 and 106 and Hebrews 11), and where each detail appears along the path.',
  specsTitle: 'Scripture details',
  reqHeading: 'What Scripture says',
  regionOf: (x) => regionOf(x),
  regionLabel: REGION_LABEL,
  start: START,
  bounds: { minX: MIN_X, maxX: MAX_X, minZ: -WALK_HALF - 2, maxZ: WALK_HALF + 2 },
  curtains: [],
  reach: 0,
  // the feet of the walls, either side of the path
  obstacles: () => {
    const rects: Rect[] = [
      [MIN_X, -WALK_HALF - 3, MAX_X, -WALK_HALF],
      [MIN_X, WALK_HALF, MAX_X, WALK_HALF + 3],
    ];
    return { rects, circles: [] };
  },
  heightAt: (x, z) => groundH(x, z),
  scripture: 'Exodus 14:21-22',
  layers: false,
};
