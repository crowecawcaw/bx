import type { SiteDef } from './types';

/** The side-by-side comparison: no walking, so no obstacles or bubbles; the camera flies round. */
export const COMPARE: SiteDef = {
  id: 'compare',
  title: 'Compare',
  features: [],
  general: [],
  specsIntro: '',
  regionOf: () => 'compare',
  regionLabel: { compare: 'The Tabernacle and the Temples' },
  start: { x: 0, z: 0, yaw: 0 },
  bounds: { minX: -4, maxX: 4, minZ: -4, maxZ: 4 },
  curtains: [],
  reach: 0,
  obstacles: () => ({ rects: [], circles: [] }),
  scripture: 'Haggai 2:3-9',
  layers: false,
};
