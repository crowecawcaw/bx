import type { Feature, Requirement } from '../data/specs';
import type { SiteId } from '../site';

export type Rect = [minX: number, minZ: number, maxX: number, maxZ: number];
export type Circle = [x: number, z: number, r: number];

/** Everything the shared player, map, bubbles and panels need to know about one experience. */
export interface SiteDef {
  id: SiteId;
  title: string;
  features: Feature[];
  general: Requirement[];
  /** Short summary for the Specs panel. */
  specsIntro: string;
  /** Title of the Specs panel. Default "Requirements". */
  specsTitle?: string;
  /** Heading over a feature's list of verses. Default "What Scripture requires". */
  reqHeading?: string;
  regionOf: (x: number, z: number) => string;
  regionLabel: Record<string, string>;
  start: { x: number; z: number; yaw: number };
  /** Walkable area for the nav grid. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Things that open and close when tapped (curtains, doors). All start closed. */
  curtains: string[];
  /** How close (cubits) you must be to open or close one. */
  reach: number;
  /** Walkable floors stacked over one another (storeys of chambers). Default 1. */
  levels?: number;
  obstacles: (open: Record<string, boolean>, level: number) => { rects: Rect[]; circles: Circle[] };
  /** Stairs: inside `rect`, both levels are walkable at the same height and you may pass between them. */
  links?: { rect: Rect; a: number; b: number }[];
  /** Height of the floor underfoot (ramps, steps, platforms, storeys). Default 0. */
  heightAt?: (x: number, z: number, level: number) => number;
  /** First passage shown in the Scripture panel. */
  scripture: string;
  /** True if the Layers button applies (the tent's four coverings). */
  layers: boolean;
}
